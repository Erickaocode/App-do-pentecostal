import type { SQLiteDatabase } from 'expo-sqlite';
import { getBooks, getVersesByRefs, type VerseWithBook } from '../db/bibleQueries';
import { findReferences } from '../suggest/references';
import { suggestVerses } from '../suggest/suggestVerses';
import { escapeHtml } from '../utils/noteFormat';
import { aiChat, type AiEngine } from './engine';
import { parseJsonLoose } from './ollama';

export interface OutlinePoint {
  title: string;
  explanation: string;
  verses: VerseWithBook[];
}

export interface SermonOutline {
  title: string;
  baseVerse: VerseWithBook | null;
  introduction: string;
  points: OutlinePoint[];
  application: string;
  conclusion: string;
  /** Quem escreveu: a IA (nuvem ou Ollama) ou o modo básico, sem internet. */
  source: 'ai' | 'offline';
}

export interface OutlineRequest {
  title: string;
  /** Referência que a pessoa quer como texto base, ex.: "Josué 1:9" (opcional). */
  baseText?: string;
  /** O que já está escrito na anotação, para a IA seguir a mesma linha (opcional). */
  notes?: string;
}

/** Mesmo formato das citações inseridas pelas sugestões (as sugestões ignoram essas linhas). */
export function citation(verse: VerseWithBook): string {
  return `${verse.book_name} ${verse.chapter}:${verse.verse} — “${verse.text}”`;
}

export function verseLabel(verse: VerseWithBook): string {
  return `${verse.book_name} ${verse.chapter}:${verse.verse}`;
}

/** Transforma referências escritas ("Rm 8:28", "Romanos 8.28") em versículos da Bíblia do app. */
export async function resolveReferences(
  db: SQLiteDatabase,
  texts: string[]
): Promise<VerseWithBook[]> {
  const books = await getBooks(db);
  const refs: [string, number, number][] = [];
  const seen = new Set<string>();
  for (const text of texts) {
    for (const ref of findReferences(text, books)) {
      const verse = ref.verse ?? 1;
      const key = `${ref.bookAbbrev}:${ref.chapter}:${verse}`;
      if (seen.has(key)) continue;
      seen.add(key);
      refs.push([ref.bookAbbrev, ref.chapter, verse]);
    }
  }
  return getVersesByRefs(db, refs);
}

// ---------------------------------------------------------------------------
// Modo básico (sem IA): usa os temas e personagens que o app já conhece.
// ---------------------------------------------------------------------------

async function offlineOutline(db: SQLiteDatabase, req: OutlineRequest): Promise<SermonOutline> {
  const title = req.title.trim();
  const groups = await suggestVerses(db, [title, req.notes ?? ''].join('\n'));
  const pool = groups.flatMap((g) => g.items.map((i) => i.verse));
  const mainTopic = groups.find((g) => g.kind === 'theme' || g.kind === 'person')?.title ?? title;
  const person = groups.find((g) => g.kind === 'person');

  const [chosenBase] = req.baseText ? await resolveReferences(db, [req.baseText]) : [];
  const baseVerse = chosenBase ?? pool.shift() ?? null;
  const take = (n: number) => pool.splice(0, n);

  const points: OutlinePoint[] = [
    {
      title: `O que a Palavra diz sobre ${mainTopic.toLowerCase()}`,
      explanation:
        'Leia o texto com a igreja e mostre o contexto: quem escreveu, para quem e o que estava acontecendo. Destaque a verdade central da passagem.',
      verses: take(2),
    },
    person
      ? {
          title: person.title,
          explanation:
            'Conte a história como exemplo vivo: o que essa pessoa enfrentou, como Deus agiu e o que mudou na vida dela.',
          verses: take(2),
        }
      : {
          title: 'O agir de Deus',
          explanation:
            'Mostre como Deus se revela nessa situação: Ele não muda, cumpre o que promete e age em favor de quem confia nEle.',
          verses: take(2),
        },
    {
      title: 'A nossa resposta',
      explanation:
        'O que a igreja deve fazer com essa palavra hoje: fé, obediência, oração e uma decisão prática para esta semana.',
      verses: take(2),
    },
  ];

  return {
    title,
    baseVerse,
    introduction: `Comece com uma pergunta ou uma história do dia a dia que conecte a igreja ao tema "${title}". Apresente o texto base e diga onde a mensagem quer chegar.`,
    points,
    application:
      'Traga exemplos concretos (família, trabalho, escola, ministério) de como viver essa palavra a partir de hoje.',
    conclusion:
      'Retome os pontos em uma frase cada, leia de novo o texto base e faça o apelo: oração, entrega e decisão diante de Deus.',
    source: 'offline',
  };
}

// ---------------------------------------------------------------------------
// Modo IA (nuvem ou Ollama)
// ---------------------------------------------------------------------------

interface AiOutline {
  texto_base?: string;
  introducao?: string;
  pontos?: { titulo?: string; explicacao?: string; versiculos?: string[] }[];
  aplicacao?: string;
  conclusao?: string;
}

const SYSTEM_PROMPT = `Você é um assistente de pregação para pastores e pregadores pentecostais no Brasil.
Escreva em português do Brasil, com linguagem bíblica, clara e acolhedora, fiel às Escrituras.
Monte esboços de pregação prontos para usar no púlpito: introdução, 3 pontos principais (cada um com explicação e versículos de apoio), aplicação prática e conclusão com apelo.
Use apenas referências bíblicas que existem de verdade, no formato "Livro capítulo:versículo" (ex.: "Romanos 8:28"). Não escreva o texto dos versículos, só a referência.
Responda SOMENTE com JSON válido, sem comentários.`;

function userPrompt(req: OutlineRequest, hints: VerseWithBook[]): string {
  const lines = [
    `Tema/título da pregação: "${req.title.trim()}"`,
    req.baseText ? `Texto base escolhido pelo pregador: ${req.baseText}` : '',
    req.notes?.trim() ? `Anotações do pregador (siga esta linha):\n${req.notes.trim().slice(0, 1500)}` : '',
    hints.length
      ? `Versículos que combinam com o tema (use se fizer sentido):\n${hints.map(verseLabel).join(', ')}`
      : '',
    `Formato da resposta:
{
  "texto_base": "Livro cap:vers",
  "introducao": "2 a 4 frases",
  "pontos": [
    { "titulo": "frase curta e marcante", "explicacao": "3 a 5 frases", "versiculos": ["Livro cap:vers", "Livro cap:vers"] }
  ],
  "aplicacao": "2 a 4 frases práticas",
  "conclusao": "2 a 4 frases, terminando com um apelo"
}`,
  ];
  return lines.filter(Boolean).join('\n\n');
}

async function aiOutline(
  db: SQLiteDatabase,
  engine: AiEngine,
  req: OutlineRequest
): Promise<SermonOutline> {
  // Versículos do modo básico entram como dica: ajudam modelos pequenos a acertar referências.
  const hints = (await suggestVerses(db, req.title).catch(() => []))
    .flatMap((g) => g.items.map((i) => i.verse))
    .slice(0, 8);

  const answer = await aiChat(
    engine,
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt(req, hints) },
    ],
    { json: true, temperature: 0.7 }
  );
  const data = parseJsonLoose<AiOutline>(answer);
  if (!data?.pontos?.length) throw new Error('A IA não devolveu um esboço válido.');

  const [base] = await resolveReferences(db, [req.baseText ?? '', data.texto_base ?? ''].filter(Boolean));
  const usedBase = base ? `${base.book_abbrev}:${base.chapter}:${base.verse}` : '';

  const points: OutlinePoint[] = [];
  for (const p of data.pontos.slice(0, 5)) {
    const verses = (await resolveReferences(db, p.versiculos ?? [])).filter(
      (v) => `${v.book_abbrev}:${v.chapter}:${v.verse}` !== usedBase
    );
    points.push({
      title: (p.titulo ?? '').trim() || `Ponto ${points.length + 1}`,
      explanation: (p.explicacao ?? '').trim(),
      verses: verses.slice(0, 3),
    });
  }

  return {
    title: req.title.trim(),
    baseVerse: base ?? null,
    introduction: (data.introducao ?? '').trim(),
    points,
    application: (data.aplicacao ?? '').trim(),
    conclusion: (data.conclusao ?? '').trim(),
    source: 'ai',
  };
}

/**
 * Gera um esboço de pregação a partir do título. Com a IA ligada (nuvem ou Ollama), ela
 * escreve; se falhar (ou estiver desligada), monta o esboço básico sem internet.
 * Os textos dos versículos sempre vêm da Bíblia do app, nunca da IA.
 */
export async function generateOutline(
  db: SQLiteDatabase,
  req: OutlineRequest,
  engine: AiEngine | null
): Promise<{ outline: SermonOutline; warning?: string }> {
  if (engine) {
    try {
      return { outline: await aiOutline(db, engine, req) };
    } catch (error) {
      const outline = await offlineOutline(db, req);
      return {
        outline,
        warning: `${(error as Error).message || 'A IA não respondeu.'} Montamos um esboço básico no lugar.`,
      };
    }
  }
  return { outline: await offlineOutline(db, req) };
}

/** HTML para inserir na anotação (títulos, parágrafos e versículos em citação). */
export function outlineToHtml(outline: SermonOutline): string {
  const p = (text: string) => (text ? `<div>${escapeHtml(text)}</div>` : '');
  const verse = (v: VerseWithBook) => `<blockquote>${escapeHtml(citation(v))}</blockquote>`;
  const parts = [
    `<h1>${escapeHtml(outline.title)}</h1>`,
    outline.baseVerse ? `<div><b>Texto base:</b></div>${verse(outline.baseVerse)}` : '',
    `<h2>Introdução</h2>`,
    p(outline.introduction),
    ...outline.points.flatMap((point, i) => [
      `<h2>${i + 1}. ${escapeHtml(point.title)}</h2>`,
      p(point.explanation),
      ...point.verses.map(verse),
    ]),
    `<h2>Aplicação</h2>`,
    p(outline.application),
    `<h2>Conclusão</h2>`,
    p(outline.conclusion),
  ];
  return parts.filter(Boolean).join('');
}
