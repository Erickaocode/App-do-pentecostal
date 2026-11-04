import type { SQLiteDatabase } from 'expo-sqlite';
import { getSetting, setSetting } from '../db/userQueries';

/**
 * Conversa com o "API Server" do Holyrics, no computador da igreja, pela rede local:
 * POST http://IP:PORTA/api/{ação}?token=TOKEN com corpo JSON.
 * O token é criado no Holyrics em Arquivo > Configurações > API Server.
 */

export interface HolyricsConfig {
  host: string;
  port: string;
  token: string;
}

export const DEFAULT_HOLYRICS_PORT = '8091';
const SETTING_KEY = 'holyrics';
const TIMEOUT_MS = 5000;

export async function loadHolyricsConfig(db: SQLiteDatabase): Promise<HolyricsConfig | null> {
  const raw = await getSetting(db, SETTING_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<HolyricsConfig>;
    if (!parsed.host || !parsed.token) return null;
    return { host: parsed.host, port: parsed.port || DEFAULT_HOLYRICS_PORT, token: parsed.token };
  } catch {
    return null;
  }
}

export function saveHolyricsConfig(db: SQLiteDatabase, config: HolyricsConfig): Promise<void> {
  return setSetting(db, SETTING_KEY, JSON.stringify(config));
}

export function clearHolyricsConfig(db: SQLiteDatabase): Promise<void> {
  return setSetting(db, SETTING_KEY, '');
}

/** Aceita "192.168.0.10", "http://192.168.0.10:8091/" etc. e devolve só o endereço. */
export function normalizeHost(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '');
}

export class HolyricsError extends Error {}

interface DesktopBridge {
  holyricsRequest?: (url: string, body: string) => Promise<{ status: number; body: string }>;
}

async function post(url: string, body: string): Promise<{ status: number; body: string }> {
  // No app do computador o pedido sai pelo Electron: o navegador bloquearia (CORS).
  const bridge = (globalThis as { desktopApp?: DesktopBridge }).desktopApp;
  if (bridge?.holyricsRequest) return bridge.holyricsRequest(url, body);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    });
    return { status: res.status, body: await res.text() };
  } finally {
    clearTimeout(timer);
  }
}

export async function holyricsRequest<T = unknown>(
  config: HolyricsConfig,
  action: string,
  params: Record<string, unknown> = {}
): Promise<T | undefined> {
  const url = `http://${config.host}:${config.port}/api/${action}?token=${encodeURIComponent(config.token)}`;
  let res: { status: number; body: string };
  try {
    res = await post(url, JSON.stringify(params));
  } catch {
    throw new HolyricsError(
      'Não foi possível conectar ao Holyrics. Confira se o celular está no mesmo Wi-Fi do computador, o IP, a porta e se o API Server está ativado.'
    );
  }
  let json: { status?: string; data?: T; error?: string };
  try {
    json = JSON.parse(res.body);
  } catch {
    throw new HolyricsError(`O Holyrics respondeu de um jeito inesperado (código ${res.status}).`);
  }
  if (json.status !== 'ok') {
    const error = json.error ?? 'erro desconhecido';
    if (/token/i.test(error)) {
      throw new HolyricsError('Token inválido. Confira o token criado no API Server do Holyrics.');
    }
    if (/permission|permiss/i.test(error)) {
      throw new HolyricsError(`O token não tem permissão para esta ação (${action}). Libere em "gerenciar permissões" no Holyrics.`);
    }
    throw new HolyricsError(`O Holyrics recusou o pedido: ${error}`);
  }
  return json.data;
}

export const holyrics = {
  test: (c: HolyricsConfig) => holyricsRequest(c, 'GetCPInfo'),
  showVerse: (c: HolyricsConfig, references: string) => holyricsRequest(c, 'ShowVerse', { references }),
  showText: (c: HolyricsConfig, text: string) => holyricsRequest(c, 'ShowQuickPresentation', { text }),
  next: (c: HolyricsConfig) => holyricsRequest(c, 'ActionNext'),
  previous: (c: HolyricsConfig) => holyricsRequest(c, 'ActionPrevious'),
  close: (c: HolyricsConfig) => holyricsRequest(c, 'CloseCurrentPresentation'),
};

/** Referências de versículos que aparecem na anotação: o versículo base e as citações inseridas. */
export function findVerseReferences(content: string, base?: string | null): string[] {
  const refs: string[] = [];
  if (base) refs.push(base);
  const pattern = /^(.+?\s\d+:\d+(?:-\d+)?)\s—\s“/;
  for (const line of content.split('\n')) {
    const match = line.trim().match(pattern);
    if (match) refs.push(match[1]);
  }
  return Array.from(new Set(refs));
}
