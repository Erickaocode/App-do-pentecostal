import type { SQLiteDatabase } from 'expo-sqlite';
import type { Favorite, Highlight, Note, VerseRef } from '../types';

// ---------- Notas ----------

export function listNotes(db: SQLiteDatabase, search?: string): Promise<Note[]> {
  if (search && search.trim().length > 0) {
    const like = `%${search.trim()}%`;
    return db.getAllAsync<Note>(
      'SELECT * FROM notes WHERE title LIKE ? OR content LIKE ? ORDER BY updated_at DESC',
      like,
      like
    );
  }
  return db.getAllAsync<Note>('SELECT * FROM notes ORDER BY updated_at DESC');
}

export function getNote(db: SQLiteDatabase, id: number): Promise<Note | null> {
  return db.getFirstAsync<Note>('SELECT * FROM notes WHERE id = ?', id);
}

export function listNotesForVerse(
  db: SQLiteDatabase,
  bookAbbrev: string,
  chapter: number,
  verse: number
): Promise<Note[]> {
  return db.getAllAsync<Note>(
    'SELECT * FROM notes WHERE book_abbrev = ? AND chapter = ? AND verse = ? ORDER BY created_at DESC',
    bookAbbrev,
    chapter,
    verse
  );
}

export async function createNote(
  db: SQLiteDatabase,
  data: { title: string; content: string; verseRef: VerseRef | null }
): Promise<number> {
  const now = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO notes (title, content, book_abbrev, book_name, chapter, verse, verse_text, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    data.title,
    data.content,
    data.verseRef?.bookAbbrev ?? null,
    data.verseRef?.bookName ?? null,
    data.verseRef?.chapter ?? null,
    data.verseRef?.verse ?? null,
    data.verseRef?.text ?? null,
    now,
    now
  );
  return result.lastInsertRowId;
}

export async function updateNote(
  db: SQLiteDatabase,
  id: number,
  data: { title: string; content: string }
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE notes SET title = ?, content = ?, updated_at = ? WHERE id = ?',
    data.title,
    data.content,
    now,
    id
  );
}

export async function deleteNote(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM notes WHERE id = ?', id);
}

// ---------- Favoritos ----------

export function listFavorites(db: SQLiteDatabase): Promise<Favorite[]> {
  return db.getAllAsync<Favorite>(
    'SELECT * FROM favorites ORDER BY created_at DESC'
  );
}

export function isFavorite(
  db: SQLiteDatabase,
  bookAbbrev: string,
  chapter: number,
  verse: number
): Promise<Favorite | null> {
  return db.getFirstAsync<Favorite>(
    'SELECT * FROM favorites WHERE book_abbrev = ? AND chapter = ? AND verse = ?',
    bookAbbrev,
    chapter,
    verse
  );
}

export async function addFavorite(db: SQLiteDatabase, verseRef: VerseRef): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT OR IGNORE INTO favorites (book_abbrev, book_name, chapter, verse, verse_text, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    verseRef.bookAbbrev,
    verseRef.bookName,
    verseRef.chapter,
    verseRef.verse,
    verseRef.text,
    now
  );
}

export async function removeFavorite(
  db: SQLiteDatabase,
  bookAbbrev: string,
  chapter: number,
  verse: number
): Promise<void> {
  await db.runAsync(
    'DELETE FROM favorites WHERE book_abbrev = ? AND chapter = ? AND verse = ?',
    bookAbbrev,
    chapter,
    verse
  );
}

// ---------- Destaques (highlights) ----------

export function listHighlightsForChapter(
  db: SQLiteDatabase,
  bookAbbrev: string,
  chapter: number
): Promise<Highlight[]> {
  return db.getAllAsync<Highlight>(
    'SELECT * FROM highlights WHERE book_abbrev = ? AND chapter = ?',
    bookAbbrev,
    chapter
  );
}

export async function setHighlight(
  db: SQLiteDatabase,
  bookAbbrev: string,
  chapter: number,
  verse: number,
  color: string
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO highlights (book_abbrev, chapter, verse, color, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(book_abbrev, chapter, verse) DO UPDATE SET color = excluded.color`,
    bookAbbrev,
    chapter,
    verse,
    color,
    now
  );
}

export async function removeHighlight(
  db: SQLiteDatabase,
  bookAbbrev: string,
  chapter: number,
  verse: number
): Promise<void> {
  await db.runAsync(
    'DELETE FROM highlights WHERE book_abbrev = ? AND chapter = ? AND verse = ?',
    bookAbbrev,
    chapter,
    verse
  );
}
