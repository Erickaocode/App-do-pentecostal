import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';
import { getSetting, setSetting } from '../db/userQueries';

/**
 * Conversa com o Ollama (IA que roda no computador da pessoa ou da igreja).
 * API: POST {url}/api/chat  e  GET {url}/api/tags (modelos instalados).
 *
 * Para o celular alcançar o computador, o Ollama precisa ouvir na rede:
 *   OLLAMA_HOST=0.0.0.0  e  OLLAMA_ORIGINS=*   (variáveis de ambiente do Ollama)
 */

export interface OllamaConfig {
  /** Ex.: "http://192.168.0.10:11434". */
  url: string;
  /** Ex.: "llama3.1:8b", "gemma3", "qwen2.5:7b". */
  model: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const DEFAULT_OLLAMA_URL = 'http://localhost:11434';
const SETTING_KEY = 'ollama';
/** Modelos locais em computador comum podem demorar para escrever um esboço inteiro. */
const CHAT_TIMEOUT_MS = 180_000;
const PING_TIMEOUT_MS = 6_000;

export class OllamaError extends Error {}

export async function loadOllamaConfig(db: SQLiteDatabase): Promise<OllamaConfig | null> {
  const raw = await getSetting(db, SETTING_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<OllamaConfig>;
    if (!parsed.url || !parsed.model) return null;
    return { url: parsed.url, model: parsed.model };
  } catch {
    return null;
  }
}

export function saveOllamaConfig(db: SQLiteDatabase, config: OllamaConfig): Promise<void> {
  return setSetting(db, SETTING_KEY, JSON.stringify(config));
}

export function clearOllamaConfig(db: SQLiteDatabase): Promise<void> {
  return setSetting(db, SETTING_KEY, '');
}

/** Aceita "192.168.0.10", "192.168.0.10:11434", "http://pc:11434/" e devolve "http://host:porta". */
export function normalizeOllamaUrl(input: string): string {
  let url = input.trim().replace(/\/+$/, '').replace(/\/api$/, '');
  if (!url) return DEFAULT_OLLAMA_URL;
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  // Sem porta (e sem ser https), usa a porta padrão do Ollama.
  if (/^http:\/\/[^/:]+$/i.test(url)) url = `${url}:11434`;
  return url;
}

/**
 * Página em https (app do iPhone pelo GitHub Pages) não pode chamar um endereço http:
 * o navegador bloqueia ("conteúdo misto"). Nesse caso o Ollama precisa de um endereço https.
 */
export function mixedContentProblem(url: string): boolean {
  return (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    window.location?.protocol === 'https:' &&
    url.startsWith('http://')
  );
}

interface DesktopBridge {
  ollamaRequest?: (
    url: string,
    method: string,
    body: string | null
  ) => Promise<{ status: number; body: string }>;
}

async function request(
  url: string,
  method: 'GET' | 'POST',
  body: string | null,
  timeoutMs: number
): Promise<{ status: number; body: string }> {
  // No app do computador o pedido sai pelo Electron, sem esbarrar em CORS.
  const bridge = (globalThis as { desktopApp?: DesktopBridge }).desktopApp;
  if (bridge?.ollamaRequest) return bridge.ollamaRequest(url, method, body);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ?? undefined,
      signal: controller.signal,
    });
    return { status: res.status, body: await res.text() };
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') {
      throw new OllamaError('O Ollama demorou demais para responder. Tente um modelo menor.');
    }
    if (mixedContentProblem(url)) {
      throw new OllamaError(
        'O app web (https) não pode acessar um endereço http. Use um endereço https para o Ollama (ex.: túnel do Cloudflare).'
      );
    }
    throw new OllamaError(
      'Não foi possível falar com o Ollama. Confira o endereço, se o computador está ligado e na mesma rede.'
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Modelos instalados no Ollama (também serve para testar a conexão). */
export async function listOllamaModels(url: string): Promise<string[]> {
  const res = await request(`${normalizeOllamaUrl(url)}/api/tags`, 'GET', null, PING_TIMEOUT_MS);
  if (res.status !== 200) throw new OllamaError(`O Ollama respondeu com erro (${res.status}).`);
  try {
    const parsed = JSON.parse(res.body) as { models?: { name: string }[] };
    return (parsed.models ?? []).map((m) => m.name);
  } catch {
    throw new OllamaError('Esse endereço respondeu, mas não parece ser o Ollama.');
  }
}

/** Uma resposta completa (sem streaming). Com `json`, o modelo é obrigado a devolver JSON. */
export async function ollamaChat(
  config: OllamaConfig,
  messages: ChatMessage[],
  options: { json?: boolean; temperature?: number } = {}
): Promise<string> {
  const body = JSON.stringify({
    model: config.model,
    messages,
    stream: false,
    format: options.json ? 'json' : undefined,
    options: { temperature: options.temperature ?? 0.6 },
  });
  const res = await request(`${normalizeOllamaUrl(config.url)}/api/chat`, 'POST', body, CHAT_TIMEOUT_MS);
  if (res.status === 404) {
    throw new OllamaError(`O modelo "${config.model}" não está instalado. Rode: ollama pull ${config.model}`);
  }
  if (res.status !== 200) throw new OllamaError(`O Ollama respondeu com erro (${res.status}).`);
  try {
    const parsed = JSON.parse(res.body) as { message?: { content?: string } };
    return parsed.message?.content ?? '';
  } catch {
    throw new OllamaError('Resposta inesperada do Ollama.');
  }
}

/** Tira o JSON de dentro da resposta, mesmo que o modelo escreva algo antes ou depois. */
export function parseJsonLoose<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(text.slice(start, end + 1)) as T;
    } catch {
      return null;
    }
  }
}
