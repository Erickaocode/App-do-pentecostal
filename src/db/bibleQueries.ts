import type { SQLiteDatabase } from 'expo-sqlite';
import { hashString } from '../utils/dates';
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

/** Escolhe um versículo determinístico a partir de uma semente (ex: a data de hoje), para o "versículo do dia". */
export async function getVerseBySeed(db: SQLiteDatabase, seed: string): Promise<BibleVerse | null> {
  const totalRow = await db.getFirstAsync<{ total: number }>('SELECT COUNT(*) as total FROM verses');
  const total = totalRow?.total ?? 0;
  if (total === 0) return null;
  const offset = hashString(seed) % total;
  return db.getFirstAsync<BibleVerse>('SELECT * FROM verses ORDER BY id ASC LIMIT 1 OFFSET ?', offset);
}
