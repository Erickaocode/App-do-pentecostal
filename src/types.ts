export interface BibleBook {
  abbrev: string;
  name: string;
  book_order: number;
  testament: 'AT' | 'NT';
  chapter_count: number;
}

export interface BibleVerse {
  id: number;
  book_abbrev: string;
  book_order: number;
  chapter: number;
  verse: number;
  text: string;
}

export interface VerseRef {
  bookAbbrev: string;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface Note {
  id: number;
  title: string;
  content: string;
  book_abbrev: string | null;
  book_name: string | null;
  chapter: number | null;
  verse: number | null;
  verse_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface Favorite {
  id: number;
  book_abbrev: string;
  book_name: string;
  chapter: number;
  verse: number;
  verse_text: string;
  created_at: string;
}

export interface Highlight {
  id: number;
  book_abbrev: string;
  chapter: number;
  verse: number;
  color: string;
  created_at: string;
}
