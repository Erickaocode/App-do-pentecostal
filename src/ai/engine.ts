import type { SQLiteDatabase } from 'expo-sqlite';
import { getSetting, setSetting } from '../db/userQueries';
import { loadOllamaConfig, ollamaChat, OllamaError, type ChatMessage, type OllamaConfig } from './ollama';

/**
 * Endereço da ponte da IA na nuvem (Cloudflare Worker em ai-proxy/).
 * Vazio = IA na nuvem desligada no app (sobra o Ollama e o modo básico).
 */
export const CLOUD_AI_URL = 'https://pentecostal-ia.app-do-pentecostal.workers.dev';

const CLOUD_TIMEOUT_MS = 60_000;
const MODE_KEY = 'ai_mode';
const CONSENT_KEY = 'ai_cloud_consent';
const STYLE_KEY = 'ai_style';

export type AiMode = 'cloud' | 'ollama' | 'off';

/** Quem responde quando o app pede ajuda à IA. */
export type AiEngine = { kind: 'cloud' } | { kind: 'ollama'; config: OllamaConfig };

export const cloudAvailable = CLOUD_AI_URL.length > 0;

export class AiError extends Error {}

export async function loadAiMode(db: SQLiteDatabase): Promise<AiMode> {
  const saved = (await getSetting(db, MODE_KEY)) as AiMode | null;
  if (saved === 'cloud' || saved === 'ollama' || saved === 'off') return saved;
  // Quem já tinha ligado o Ollama continua com ele; o resto começa com a nuvem.
  if (await loadOllamaConfig(db)) return 'ollama';
  return cloudAvailable ? 'cloud' : 'off';
}

export function saveAiMode(db: SQLiteDatabase, mode: AiMode): Promise<void> {
  return setSetting(db, MODE_KEY, mode);
}

/** A pessoa já aceitou que o texto vá para a IA na nuvem? */
export async function hasCloudConsent(db: SQLiteDatabase): Promise<boolean> {
  return (await getSetting(db, CONSENT_KEY)) === 'yes';
}

export function saveCloudConsent(db: SQLiteDatabase): Promise<void> {
  return setSetting(db, CONSENT_KEY, 'yes');
}

/** "Escrever no meu estilo": a IA lê trechos das anotações antigas da pessoa. */
export async function loadStyleEnabled(db: SQLiteDatabase): Promise<boolean> {
  return (await getSetting(db, STYLE_KEY)) === 'yes';
}

export function saveStyleEnabled(db: SQLiteDatabase, enabled: boolean): Promise<void> {
  return setSetting(db, STYLE_KEY, enabled ? 'yes' : 'no');
}

/** O motor certo para o modo escolhido (null = só o modo básico, sem IA). */
export async function loadAiEngine(db: SQLiteDatabase): Promise<AiEngine | null> {
  const mode = await loadAiMode(db);
  if (mode === 'ollama') {
    const config = await loadOllamaConfig(db);
    return config ? { kind: 'ollama', config } : null;
  }
  if (mode === 'cloud' && cloudAvailable) return { kind: 'cloud' };
  return null;
}

/** O EKS AI na nuvem está respondendo? Devolve o modelo em uso, ou null se estiver fora. */
export async function checkCloudHealth(): Promise<string | null> {
  if (!cloudAvailable) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${CLOUD_AI_URL.replace(/\/+$/, '')}/health`, { signal: controller.signal });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; model?: string } | null;
    return res.ok && data?.ok ? data.model ?? 'online' : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function engineLabel(engine: AiEngine): string {
  return engine.kind === 'cloud' ? 'EKS AI' : `EKS AI via Ollama (${engine.config.model})`;
}

async function cloudChat(
  messages: ChatMessage[],
  options: { json?: boolean; temperature?: number }
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLOUD_TIMEOUT_MS);
  try {
    const res = await fetch(`${CLOUD_AI_URL.replace(/\/+$/, '')}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, json: !!options.json, temperature: options.temperature }),
      signal: controller.signal,
    });
    const data = (await res.json().catch(() => null)) as { content?: string; error?: string } | null;
    if (!res.ok) throw new AiError(data?.error || `A IA respondeu com erro (${res.status}).`);
    return data?.content ?? '';
  } catch (error) {
    if (error instanceof AiError) throw error;
    if ((error as Error)?.name === 'AbortError') throw new AiError('A IA demorou demais para responder.');
    throw new AiError('Sem conexão com a IA. Confira a internet.');
  } finally {
    clearTimeout(timer);
  }
}

/** Uma resposta completa da IA escolhida. */
export async function aiChat(
  engine: AiEngine,
  messages: ChatMessage[],
  options: { json?: boolean; temperature?: number } = {}
): Promise<string> {
  if (engine.kind === 'ollama') {
    try {
      return await ollamaChat(engine.config, messages, options);
    } catch (error) {
      throw new AiError(error instanceof OllamaError ? error.message : 'O Ollama não respondeu.');
    }
  }
  return cloudChat(messages, options);
}
