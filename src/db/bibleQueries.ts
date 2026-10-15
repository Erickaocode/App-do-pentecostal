import type { SQLiteDatabase } from 'expo-sqlite';
import { dailyVerses } from '../data/dailyVerses';
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
