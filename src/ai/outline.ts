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

/** Apoio para quem vai pregar: vem no fim do esboço. */
export interface PreachingAid {
  illustration: string;
  phrases: string[];
  tips: string[];
}

export interface SermonOutline {
  title: string;
  baseVerse: VerseWithBook | null;
  /** Estudo aprofundado do texto base (parágrafos separados por linha em branco). */
  study: string;
  introduction: string;
  points: OutlinePoint[];
  application: string;
  conclusion: string;
  aid: PreachingAid;
  /** Quem escreveu: a IA (nuvem ou Ollama) ou o modo básico, sem internet. */
  source: 'ai' | 'offline';
}

export interface OutlineRequest {
  title: string;
  /** Referência que a pessoa quer como texto base, ex.: "Josué 1:9" (opcional). */
  baseText?: string;
  /** O que já está escrito na anotação, para a IA seguir a mesma linha (opcional). */
  notes?: string;
  /** Trechos de anotações antigas da pessoa, para a IA imitar o jeito dela pregar (opcional). */
  style?: string;
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

  const baseRef = baseVerse ? verseLabel(baseVerse) : 'o texto base';
  return {
    title,
    baseVerse,
    study: [
      `Leia ${baseRef} mais de uma vez e, se puder, os versículos antes e depois. Anote quem escreveu, para quem, em que momento e por quê: o contexto mostra o que o texto quis dizer para os primeiros leitores.`,
      'Marque as palavras que se repetem ou que carregam o peso do versículo e procure o sentido delas numa Bíblia de estudo ou concordância. Depois escreva, numa frase, a verdade central do texto: é ela que vai guiar toda a mensagem.',
    ].join('\n\n'),
    introduction: `Comece com uma pergunta ou uma história do dia a dia que conecte a igreja ao tema "${title}". Apresente o texto base e diga onde a mensagem quer chegar.`,
    points,
    application:
      'Traga exemplos concretos (família, trabalho, escola, ministério) de como viver essa palavra a partir de hoje.',
    conclusion:
      'Retome os pontos em uma frase cada, leia de novo o texto base e faça o apelo: oração, entrega e decisão diante de Deus.',
    aid: {
      illustration:
        'Escolha uma história real (sua, da igreja ou do dia a dia) que mostre o tema na prática. Conte em poucas frases, sem tirar o foco da Palavra.',
      phrases: [],
      tips: [
        'Ore pela mensagem antes de estudar e antes de subir ao púlpito.',
        'Leia o texto base em voz alta com a igreja logo no começo.',
        'Dê mais tempo ao ponto que mais fala com a realidade da sua igreja.',
        'Feche cada ponto com uma frase curta que a igreja consiga lembrar.',
        'No apelo, fale com calma e deixe espaço para a resposta das pessoas.',
      ],
    },
    source: 'offline',
  };
}

// ---------------------------------------------------------------------------
// Modo IA (nuvem ou Ollama)
// ---------------------------------------------------------------------------

interface AiOutline {
  texto_base?: string;
  estudo_texto_base?: string;
  introducao?: string;
  pontos?: { titulo?: string; explicacao?: string; versiculos?: string[] }[];
  aplicacao?: string;
  conclusao?: string;
  auxilio_pregacao?: { ilustracao?: string; frases?: string[]; dicas?: string[] };
}

const SYSTEM_PROMPT = `Você é o EKS AI, o assistente de pregação do App do Pentecostal, feito para pastores, pregadores e obreiros pentecostais no Brasil.
Escreva em português do Brasil, com linguagem bíblica, clara e acolhedora, fiel às Escrituras.
Monte esboços de pregação prontos para usar no púlpito: um estudo aprofundado do texto base, introdução, 3 pontos principais (cada um com explicação e versículos de apoio), aplicação prática, conclusão com apelo e, no fim, um auxílio para quem vai pregar.
No estudo do texto base, aprofunde de verdade: contexto histórico e literário, o sentido das palavras-chave (com o termo original em hebraico ou grego quando ajudar) e a verdade central do versículo. Seja fiel ao texto e não invente fatos.
Use apenas referências bíblicas que existem de verdade, no formato "Livro capítulo:versículo" (ex.: "Romanos 8:28"). Não escreva o texto dos versículos, só a referência.
Responda SOMENTE com JSON válido, sem comentários.`;

function userPrompt(req: OutlineRequest, hints: VerseWithBook[]): string {
  const lines = [
    `Tema/título da pregação: "${req.title.trim()}"`,
    req.baseText ? `Texto base escolhido pelo pregador: ${req.baseText}` : '',
    req.notes?.trim() ? `Anotações do pregador (siga esta linha):\n${req.notes.trim().slice(0, 1500)}` : '',
    req.style?.trim()
      ? `Trechos de anotações antigas deste pregador. Imite o estilo, o vocabulário e o jeito de organizar as ideias, sem copiar o conteúdo:\n${req.style.trim().slice(0, 2400)}`
      : '',
    hints.length
      ? `Versículos que combinam com o tema (use se fizer sentido):\n${hints.map(verseLabel).join(', ')}`
      : '',
    `Formato da resposta:
{
  "texto_base": "Livro cap:vers",
  "estudo_texto_base": "2 a 3 parágrafos separados por linha em branco: contexto (quem escreveu, para quem, quando e por quê), palavras-chave e seu sentido no original, e a verdade central do texto",
  "introducao": "2 a 4 frases",
  "pontos": [
    { "titulo": "frase curta e marcante", "explicacao": "3 a 5 frases", "versiculos": ["Livro cap:vers", "Livro cap:vers"] }
  ],
  "aplicacao": "2 a 4 frases práticas",
  "conclusao": "2 a 4 frases, terminando com um apelo",
  "auxilio_pregacao": {
    "ilustracao": "uma ilustração ou história do dia a dia para usar na mensagem, em 3 a 5 frases",
    "frases": ["2 a 3 frases de impacto para falar no púlpito"],
    "dicas": ["3 a 5 dicas práticas para pregar este esboço: como começar, onde dar ênfase, quanto tempo em cada parte, como conduzir o apelo"]
  }
}`,
  ];
  return lines.filter(Boolean).join('\n\n');
}

function cleanList(items: unknown): string[] {
  return Array.isArray(items)
    ? items.filter((i): i is string => typeof i === 'string' && !!i.trim()).map((i) => i.trim()).slice(0, 6)
    : [];
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
  if (!data?.pontos?.length) throw new Error('O EKS AI não devolveu um esboço válido.');

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
    study: (data.estudo_texto_base ?? '').trim(),
    aid: {
      illustration: (data.auxilio_pregacao?.ilustracao ?? '').trim(),
      phrases: cleanList(data.auxilio_pregacao?.frases),
      tips: cleanList(data.auxilio_pregacao?.dicas),
    },
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
        warning: `${(error as Error).message || 'O EKS AI não respondeu.'} Montamos um esboço básico no lugar.`,
      };
    }
  }
  return { outline: await offlineOutline(db, req) };
}

/** HTML para inserir na anotação (títulos, parágrafos e versículos em citação). */
export function outlineToHtml(outline: SermonOutline): string {
  const p = (text: string) => (text ? `<div>${escapeHtml(text)}</div>` : '');
  const verse = (v: VerseWithBook) => `<blockquote>${escapeHtml(citation(v))}</blockquote>`;
  const list = (items: string[]) =>
    items.length ? `<ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>` : '';
  const { aid } = outline;
  const hasAid = !!(aid.illustration || aid.phrases.length || aid.tips.length);
  const parts = [
    `<h1>${escapeHtml(outline.title)}</h1>`,
    outline.baseVerse ? `<div><b>Texto base:</b></div>${verse(outline.baseVerse)}` : '',
    outline.study ? `<h2>Estudo do texto base</h2>` : '',
    ...paragraphs(outline.study).map(p),
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
    hasAid ? `<h2>Auxílio para pregar</h2>` : '',
    aid.illustration ? `<div><b>Ilustração:</b> ${escapeHtml(aid.illustration)}</div>` : '',
    aid.phrases.length ? `<div><b>Frases de impacto:</b></div>${list(aid.phrases)}` : '',
    aid.tips.length ? `<div><b>Dicas para pregar:</b></div>${list(aid.tips)}` : '',
    `<div><i>${escapeHtml(outlineSignature(outline))}</i></div>`,
  ];
  return parts.filter(Boolean).join('');
}

/** Divide o estudo em parágrafos (a IA separa com linha em branco). */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Assinatura do esboço: deixa claro que foi o EKS AI que escreveu. */
export function outlineSignature(outline: SermonOutline): string {
  return outline.source === 'ai'
    ? 'Esboço gerado pelo EKS AI'
    : 'Esboço básico do EKS AI (modo sem internet)';
}
