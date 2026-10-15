import type { SQLiteDatabase } from 'expo-sqlite';
import { dailyVerses } from '../data/dailyVerses';
import { stem, toFtsQuery } from '../suggest/text';
import { dayNumber } from '../utils/dates';
import type { BibleBook, BibleVerse } from '../types';

export function getBooks(db: SQLiteDatabase): Promise<BibleBook[]> {
  return db.getAllAsync<BibleBook>('SELECT * FROM books ORDER BY book_order ASC');
}

export function getChapterVerses(
  db: SQLiteDatabase,
  bookAbbrev: string,
  chapter: number
): Promise<BibleVerse[]> {
  return db.getAllAsync<BibleVerse>(
    'SELECT * FROM verses WHERE book_abbrev = ? AND chapter = ? ORDER BY verse ASC',
    bookAbbrev,
    chapter
  );
}

export function searchVerses(db: SQLiteDatabase, term: string): Promise<BibleVerse[]> {
  const like = `%${term.trim()}%`;
  return db.getAllAsync<BibleVerse>(
    'SELECT * FROM verses WHERE text LIKE ? ORDER BY book_order ASC, chapter ASC, verse ASC LIMIT 200',
    like
  );
}

export function getBookByAbbrev(db: SQLiteDatabase, abbrev: string): Promise<BibleBook | null> {
  return db.getFirstAsync<BibleBook>('SELECT * FROM books WHERE abbrev = ?', abbrev);
}

export function getVerse(
  db: SQLiteDatabase,
  bookAbbrev: string,
  chapter: number,
  verse: number
): Promise<BibleVerse | null> {
  return db.getFirstAsync<BibleVerse>(
    'SELECT * FROM verses WHERE book_abbrev = ? AND chapter = ? AND verse = ?',
    bookAbbrev,
    chapter,
    verse
  );
}

/** Versículo do dia: percorre a lista de encorajamento um dia de cada vez, sem repetir até dar a volta. */
export function getDailyVerse(db: SQLiteDatabase, day: string): Promise<BibleVerse | null> {
  const [book, chapter, verse] = dailyVerses[dayNumber(day) % dailyVerses.length];
  return getVerse(db, book, chapter, verse);
}

// ---------- Versículos relacionados (sugestões nas anotações) ----------

export interface VerseWithBook extends BibleVerse {
  book_name: string;
}

/** `true` quando o índice existe; `false` quando o SQLite não tem FTS5 (caso da versão web). */
const searchIndexes = new WeakMap<SQLiteDatabase, Promise<boolean>>();

/**
 * Cria, uma única vez por versão, o índice de busca de texto completo (sem acentos e
 * ranqueado por relevância). Fica gravado no próprio banco da versão, no aparelho.
 */
function ensureSearchIndex(db: SQLiteDatabase): Promise<boolean> {
  let promise = searchIndexes.get(db);
  if (!promise) {
    promise = (async () => {
      const exists = await db.getFirstAsync(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'verses_fts'"
      );
      if (exists) return true;
      try {
        // Tudo ou nada: se o app fechar no meio, o índice é criado de novo na próxima vez.
        await db.withTransactionAsync(async () => {
          await db.execAsync(`
            CREATE VIRTUAL TABLE verses_fts USING fts5(
              text, content='verses', content_rowid='id', tokenize='unicode61 remove_diacritics 2'
            );
            INSERT INTO verses_fts(verses_fts) VALUES('rebuild');
          `);
        });
        return true;
      } catch (e) {
        if (String(e).includes('no such module')) return false;
        throw e;
      }
    })();
    searchIndexes.set(db, promise);
    promise.catch(() => searchIndexes.delete(db));
  }
  return promise;
}

const VERSE_WITH_BOOK = `SELECT v.*, b.name AS book_name FROM verses v
  JOIN books b ON b.abbrev = v.book_abbrev`;

/** Versículos mais parecidos com as palavras dadas, do mais para o menos parecido. */
export async function searchRelatedVerses(
  db: SQLiteDatabase,
  words: string[],
  limit: number
): Promise<VerseWithBook[]> {
  const ftsQuery = toFtsQuery(words);
  if (!ftsQuery) return [];
  if (await ensureSearchIndex(db)) {
    return db.getAllAsync<VerseWithBook>(
      `SELECT v.*, b.name AS book_name
       FROM (SELECT rowid, rank FROM verses_fts WHERE verses_fts MATCH ? ORDER BY rank LIMIT ?) AS f
       JOIN verses v ON v.id = f.rowid
       JOIN books b ON b.abbrev = v.book_abbrev
       ORDER BY f.rank`,
      ftsQuery,
      limit
    );
  }
  return searchRelatedVersesByLike(db, words, limit);
}

/**
 * Plano B sem FTS5: procura cada radical com LIKE e soma pontos por versículo. Palavras
 * raras valem mais que as comuns, como no ranqueamento da busca de texto completo.
 */
async function searchRelatedVersesByLike(
  db: SQLiteDatabase,
  words: string[],
  limit: number
): Promise<VerseWithBook[]> {
  const scores = new Map<number, { verse: VerseWithBook; score: number }>();
  for (const word of words.slice(0, 6)) {
    const rows = await db.getAllAsync<VerseWithBook>(
      `${VERSE_WITH_BOOK} WHERE v.text LIKE ? LIMIT 500`,
      `%${stem(word)}%`
    );
    const weight = 1 / Math.log(2 + rows.length);
    for (const row of rows) {
      const entry = scores.get(row.id);
      if (entry) entry.score += weight;
      else scores.set(row.id, { verse: row, score: weight });
    }
  }
  return [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.verse);
}

export async function getVersesByRefs(
  db: SQLiteDatabase,
  refs: readonly (readonly [book: string, chapter: number, verse: number])[]
): Promise<VerseWithBook[]> {
  const rows = await Promise.all(
    refs.map(([book, chapter, verse]) =>
      db.getFirstAsync<VerseWithBook>(
        `${VERSE_WITH_BOOK} WHERE v.book_abbrev = ? AND v.chapter = ? AND v.verse = ?`,
        book,
        chapter,
        verse
      )
    )
  );
  return rows.filter((row): row is VerseWithBook => row !== null);
}