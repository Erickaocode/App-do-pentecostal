import type { SQLiteDatabase } from 'expo-sqlite';
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
