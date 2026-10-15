import type { SQLiteDatabase } from 'expo-sqlite';
import { getVersesByRefs, searchRelatedVerses, type VerseWithBook } from '../db/bibleQueries';
import { keywords, normalize } from './text';
import { themes, type Theme } from './themes';

export interface VerseSuggestion {
  verse: VerseWithBook;
  /** Por que o versículo foi sugerido: o nome do tema ou "Palavras em comum". */
  reason: string;
}

/** Temas que aparecem no texto, do mais citado para o menos. */
function matchThemes(normalizedText: string): Theme[] {
  const padded = ` ${normalizedText} `;
  return themes
    .map((theme) => ({
      theme,
      hits: theme.triggers.filter((trigger) => padded.includes(` ${trigger}`)).length,
    }))
    .filter((m) => m.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .map((m) => m.theme);
}

/**
 * Sugere versículos ligados ao que a pessoa escreveu, sem internet: primeiro os
 * versículos-chave dos temas encontrados, depois os mais parecidos pela busca de texto.
 */
export async function suggestVerses(
  db: SQLiteDatabase,
  text: string,
  options: { exclude?: { bookAbbrev: string; chapter: number; verse: number }; limit?: number } = {}
): Promise<VerseSuggestion[]> {
  const limit = options.limit ?? 5;
  const normalized = normalize(text);
  if (!normalized) return [];

  // Até 2 temas: 3 versículos do principal e 2 do segundo.
  const [mainTheme, secondTheme] = matchThemes(normalized);
  const themeRefs = [
    ...(mainTheme?.verses.slice(0, 3).map((ref) => ({ ref, reason: mainTheme.name })) ?? []),
    ...(secondTheme?.verses.slice(0, 2).map((ref) => ({ ref, reason: secondTheme.name })) ?? []),
  ];
  const [themeVerses, textVerses] = await Promise.all([
    getVersesByRefs(db, themeRefs.map((t) => t.ref)),
    // Se a busca por palavras falhar, as sugestões dos temas ainda aparecem.
    searchRelatedVerses(db, keywords(normalized), limit * 3).catch(() => []),
  ]);

  const reasonByVerse = new Map(themeRefs.map((t) => [t.ref.join(':'), t.reason]));
  const candidates: VerseSuggestion[] = [
    ...themeVerses.map((verse) => ({
      verse,
      reason: reasonByVerse.get(`${verse.book_abbrev}:${verse.chapter}:${verse.verse}`) ?? '',
    })),
    ...textVerses.map((verse) => ({ verse, reason: 'Palavras em comum' })),
  ];

  const { exclude } = options;
  const seen = new Set<number>();
  const result: VerseSuggestion[] = [];
  for (const candidate of candidates) {
    const { verse } = candidate;
    if (seen.has(verse.id)) continue;
    seen.add(verse.id);
    if (
      exclude &&
      verse.book_abbrev === exclude.bookAbbrev &&
      verse.chapter === exclude.chapter &&
      verse.verse === exclude.verse
    ) {
      continue;
    }
    result.push(candidate);
    if (result.length >= limit) break;
  }
  return result;
}
