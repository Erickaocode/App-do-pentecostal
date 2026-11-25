/**
 * Ponte da IA do App do Pentecostal (Cloudflare Worker).
 *
 * O app manda { messages, json } para POST /chat; a ponte acrescenta a chave secreta e
 * repassa para uma API no padrão OpenAI (hoje o Google Gemini, o mesmo cérebro do EKS AI). Assim a chave nunca fica
 * dentro do app, e trocar de provedor é só mudar AI_BASE_URL / AI_MODEL no wrangler.toml.
 *
 * Nada é guardado aqui: a ponte não grava nem registra o texto das anotações.
 */

const MAX_INPUT_CHARS = 14000;
const MAX_OUTPUT_TOKENS = 4000;

/** Sites que podem chamar a ponte pelo navegador. O app de celular não manda "Origin". */
const ALLOWED_ORIGINS = [
  'https://erickaocode.github.io',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
];

function corsHeaders(origin) {
  const allowed =
    !origin ||
    ALLOWED_ORIGINS.includes(origin) ||
    // App do computador: servidor local em porta variável.
    /^http:\/\/127\.0\.0\.1:\d+$/.test(origin) ||
    // Testes na rede de casa/igreja (ex.: iPhone abrindo http://192.168.x.x:8081).
    /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin);
  return {
    'Access-Control-Allow-Origin': allowed && origin ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
    allowed: String(allowed),
  };
}

function reply(status, body, cors) {
  const { allowed: _ignored, ...headers } = cors;
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request.headers.get('Origin'));

    if (request.method === 'OPTIONS') return reply(204, null, cors);
    if (url.pathname === '/health') return reply(200, { ok: true, model: env.AI_MODEL }, cors);
    if (url.pathname !== '/chat' || request.method !== 'POST') {
      return reply(404, { error: 'Não encontrado.' }, cors);
    }
    if (cors.allowed !== 'true') return reply(403, { error: 'Origem não permitida.' }, cors);
    if (!env.AI_API_KEY) return reply(500, { error: 'A ponte está sem a chave da IA.' }, cors);

    // Limite por aparelho (IP) para ninguém gastar a cota gratuita de todo mundo.
    if (env.LIMITER) {
      const ip = request.headers.get('CF-Connecting-IP') || 'anon';
      const { success } = await env.LIMITER.limit({ key: ip });
      if (!success) {
        return reply(429, { error: 'Muitos pedidos seguidos. Espere um minuto e tente de novo.' }, cors);
      }
    }

    let input;
    try {
      input = await request.json();
    } catch {
      return reply(400, { error: 'Pedido inválido.' }, cors);
    }
    const messages = Array.isArray(input?.messages)
      ? input.messages
          .filter((m) => m && ['system', 'user', 'assistant'].includes(m.role) && typeof m.content === 'string')
          .slice(0, 8)
      : [];
    const size = messages.reduce((n, m) => n + m.content.length, 0);
    if (messages.length === 0) return reply(400, { error: 'Pedido sem mensagens.' }, cors);
    if (size > MAX_INPUT_CHARS) return reply(413, { error: 'Texto grande demais para a IA.' }, cors);

    // Modelo principal e reservas: se um estiver sobrecarregado (503) ou sumir (404), tenta o próximo.
    const models = [env.AI_MODEL, ...String(env.AI_FALLBACK_MODELS || '').split(',')]
      .map((m) => m && m.trim())
      .filter(Boolean);
    const temperature =
      typeof input.temperature === 'number' ? Math.min(Math.max(input.temperature, 0), 1.2) : 0.6;

    let upstream = null;
    for (const model of models) {
      upstream = await fetch(`${env.AI_BASE_URL.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: MAX_OUTPUT_TOKENS,
          // Gemini "pensa" antes de responder e isso gasta o limite da resposta.
          ...(env.AI_REASONING_EFFORT ? { reasoning_effort: env.AI_REASONING_EFFORT } : {}),
          ...(input.json ? { response_format: { type: 'json_object' } } : {}),
        }),
      }).catch(() => null);
      if (upstream && ![404, 500, 503].includes(upstream.status)) break;
    }

    if (!upstream) return reply(502, { error: 'A IA está fora do ar agora.' }, cors);
    if (upstream.status === 429) {
      return reply(429, { error: 'A IA gratuita atingiu o limite por agora. Tente mais tarde.' }, cors);
    }
    if (!upstream.ok) return reply(502, { error: `A IA respondeu com erro (${upstream.status}).` }, cors);

    const data = await upstream.json().catch(() => null);
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') return reply(502, { error: 'Resposta inesperada da IA.' }, cors);
    return reply(200, { content }, cors);
  },
};
