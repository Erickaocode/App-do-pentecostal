import type { SQLiteDatabase } from 'expo-sqlite';
import {
  getBooks,
  getVersesByRefs,
  searchRelatedVerses,
  type VerseWithBook,
} from '../db/bibleQueries';
import type { BibleBook } from '../types';
import { people } from './people';
import { findReferences, type CitedReference } from './references';
import { keywords, normalize, stem } from './text';
import { themes } from './themes';
import { vocabulary } from './vocabulary';

type Ref = readonly [book: string, chapter: number, verse: number];

export interface SuggestionItem {
  verse: VerseWithBook;
  /** Complemento mostrado no cartão, ex: "Em comum: medo, futuro". */
  detail?: string;
}

export interface SuggestionGroup {
  key: string;
  kind: 'reference' | 'theme' | 'person' | 'words';
  title: string;
  items: SuggestionItem[];
}

/** Um assunto encontrado na anotação, com quantas vezes aparece e onde aparece primeiro. */
interface Topic {
  key: string;
  kind: 'theme' | 'person';
  title: string;
  refs: Ref[];
  hits: number;
  firstAt: number;
}

/** Anotações longas falam de vários assuntos: até 5 grupos de temas e personagens. */
const MAX_TOPIC_GROUPS = 5;
const MAX_REFERENCE_GROUPS = 2;
const WORD_SUGGESTIONS = 3;

const booksCache = new WeakMap<SQLiteDatabase, Promise<BibleBook[]>>();
function booksOf(db: SQLiteDatabase): Promise<BibleBook[]> {
  let promise = booksCache.get(db);
  if (!promise) {
    promise = getBooks(db);
    booksCache.set(db, promise);
    promise.catch(() => booksCache.delete(db));
  }
  return promise;
}

/**
 * Onde cada termo começa uma palavra no texto. Um assunto conta cada lugar uma vez só,
 * mesmo que vários termos dele casem ali ("doente" casa com "doen" e com "doent").
 */
function positions(padded: string, terms: string[]): Set<number> {
  const found = new Set<number>();
  for (const term of terms) {
    let from = 0;
    for (;;) {
      const at = padded.indexOf(` ${term}`, from);
      if (at < 0) break;
      found.add(at);
      from = at + 1;
    }
  }
  return found;
}

/** Temas e personagens que aparecem na anotação inteira, do mais presente para o menos. */
function findTopics(padded: string): Topic[] {
  const topics: Topic[] = [];

  for (const theme of themes) {
    const found = positions(padded, theme.triggers);
    if (found.size > 0) {
      topics.push({
        key: `theme:${theme.name}`,
        kind: 'theme',
        title: theme.name,
        refs: theme.verses,
        hits: found.size,
        firstAt: Math.min(...found),
      });
    }
  }

  for (const person of people) {
    // O nome tem que ser a palavra inteira ("davi", não "david" nem "daviana").
    const found = positions(padded, person.names.map((name) => `${name} `));
    const hasCue = !person.cues || person.cues.some((cue) => padded.includes(` ${cue}`));
    if (found.size > 0 && hasCue) {
      topics.push({
        key: `person:${person.name}`,
        kind: 'person',
        title: person.name,
        refs: person.verses,
        // Um personagem citado pelo nome é um assunto forte, mesmo aparecendo uma vez só.
        hits: found.size + 1,
        firstAt: Math.min(...found),
      });
    }
  }

  // Mais citado primeiro; no empate, o que aparece antes na anotação.
  return topics.sort((a, b) => b.hits - a.hits || a.firstAt - b.firstAt);
}

/** Cada palavra-chave vira um "conceito": ela mesma mais os sinônimos bíblicos dela. */
function concepts(normalized: string): { word: string; terms: string[] }[] {
  return keywords(normalized).map((word) => {
    const terms = new Set([word]);
    for (const [prefix, biblical] of Object.entries(vocabulary)) {
      if (word.startsWith(prefix)) biblical.forEach((t) => terms.add(t));
    }
    return { word, terms: [...terms] };
  });
}

/** Palavras da anotação (ou sinônimos delas) que aparecem no versículo. */
function matchedConcepts(verseText: string, list: { word: string; terms: string[] }[]): string[] {
  const padded = ` ${normalize(verseText)} `;
  return list
    .filter(({ terms }) =>
      terms.some((t) => (t.length >= 7 ? padded.includes(` ${stem(t)}`) : padded.includes(` ${t} `)))
    )
    .map(({ word }) => word);
}

/** Como cada palavra foi escrita na anotação ("agua" → "água"), para mostrar à pessoa. */
function writtenForms(text: string): Map<string, string> {
  const forms = new Map<string, string>();
  for (const word of text.toLowerCase().split(/[^\p{L}\d]+/u)) {
    const key = normalize(word);
    if (key && !forms.has(key)) forms.set(key, word);
  }
  return forms;
}

function refKey(book: string, chapter: number, verse: number): string {
  return `${book}:${chapter}:${verse}`;
}

/**
 * Lê a anotação inteira e sugere versículos agrupados por assunto, sem internet:
 * 1. temas (ansiedade, família...) e personagens (Davi, Moisés...) → versículos-chave;
 * 2. referências escritas no texto ("Romanos 8:28") → os versículos seguintes;
 * 3. se ainda houver poucos assuntos, busca por palavras (com sinônimos bíblicos).
 */
export async function suggestVerses(
  db: SQLiteDatabase,
  text: string,
  options: { exclude?: { bookAbbrev: string; chapter: number; verse: number } } = {}
): Promise<SuggestionGroup[]> {
  const ownText = normalize(text);
  if (!ownText) return [];

  const books = await booksOf(db);
  const bookName = new Map(books.map((b) => [b.abbrev, b.name]));
  const cited = findReferences(text, books).filter((r) => bookName.has(r.bookAbbrev));
  const citedVerses = await getVersesByRefs(
    db,
    cited
      .filter((r): r is CitedReference & { verse: number } => r.verse !== null)
      .map((r) => [r.bookAbbrev, r.chapter, r.verse])
  );

  // Nunca sugere o versículo da própria anotação nem os que a pessoa já citou.
  const used = new Set<string>(citedVerses.map((v) => refKey(v.book_abbrev, v.chapter, v.verse)));
  if (options.exclude) {
    const { bookAbbrev, chapter, verse } = options.exclude;
    used.add(refKey(bookAbbrev, chapter, verse));
  }

  const groups: SuggestionGroup[] = [];

  // 1. Temas e personagens. O texto dos versículos citados também conta aqui
  //    (citar Salmos 23:4 já fala de medo), mas o que a pessoa escreveu vem primeiro.
  const topicText = ` ${normalize([text, ...citedVerses.map((v) => v.text)].join(' '))} `;
  const topics = findTopics(topicText).slice(0, MAX_TOPIC_GROUPS);
  const perTopic = topics.length <= 2 ? 3 : 2;
  const topicVerses = await getVersesByRefs(db, topics.flatMap((t) => t.refs));
  const verseByRef = new Map(topicVerses.map((v) => [refKey(v.book_abbrev, v.chapter, v.verse), v]));
  for (const topic of topics) {
    const items: SuggestionItem[] = [];
    for (const [book, chapter, verse] of topic.refs) {
      const key = refKey(book, chapter, verse);
      const row = verseByRef.get(key);
      if (!row || used.has(key)) continue;
      used.add(key);
      items.push({ verse: row });
      if (items.length >= perTopic) break;
    }
    if (items.length > 0) {
      groups.push({
        key: topic.key,
        kind: topic.kind,
        title: topic.kind === 'person' ? `Sobre ${topic.title}` : topic.title,
        items,
      });
    }
  }
  const topicGroups = groups.length;

  // 2. Continuação das passagens que a pessoa citou.
  for (const verse of citedVerses.slice(0, MAX_REFERENCE_GROUPS)) {
    const next = await getVersesByRefs(db, [
      [verse.book_abbrev, verse.chapter, verse.verse + 1],
      [verse.book_abbrev, verse.chapter, verse.verse + 2],
    ]);
    const items = next.filter((v) => !used.has(refKey(v.book_abbrev, v.chapter, v.verse)));
    items.forEach((v) => used.add(refKey(v.book_abbrev, v.chapter, v.verse)));
    if (items.length > 0) {
      groups.push({
        key: `ref:${refKey(verse.book_abbrev, verse.chapter, verse.verse)}`,
        kind: 'reference',
        title: `Continuação de ${verse.book_name} ${verse.chapter}:${verse.verse}`,
        items: items.map((v) => ({ verse: v })),
      });
    }
  }

  // 3. Busca por palavras, só quando os assuntos encontrados são poucos: ela não entende
  //    o sentido, e com o assunto já claro mais atrapalha do que ajuda. Usa só o que a
  //    pessoa escreveu, e só entram versículos com 2 ou mais palavras em comum (senão
  //    "emprego" traria "o empregado foge").
  const conceptList = concepts(ownText);
  if (topicGroups < 3 && conceptList.length > 0) {
    const terms = [...new Set(conceptList.flatMap((c) => c.terms))].slice(0, 20);
    const candidates = await searchRelatedVerses(db, terms, 40).catch(() => []);
    const minMatches = conceptList.length >= 2 ? 2 : 1;
    const ranked = candidates
      .map((verse, rank) => ({ verse, rank, matched: matchedConcepts(verse.text, conceptList) }))
      .filter(
        (c) =>
          c.matched.length >= minMatches &&
          !used.has(refKey(c.verse.book_abbrev, c.verse.chapter, c.verse.verse))
      )
      .sort((a, b) => b.matched.length - a.matched.length || a.rank - b.rank)
      .slice(0, WORD_SUGGESTIONS);
    if (ranked.length > 0) {
      const forms = writtenForms(text);
      groups.push({
        key: 'words',
        kind: 'words',
        title: 'Com palavras do seu texto',
        items: ranked.map((c) => ({
          verse: c.verse,
          detail: `Em comum: ${c.matched.map((w) => forms.get(w) ?? w).join(', ')}`,
        })),
      });
    }
  }

  return groups;
}
