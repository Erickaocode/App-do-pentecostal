import { normalize } from './text';

export interface CitedReference {
  bookAbbrev: string;
  chapter: number;
  verse: number | null;
}

/** Outros jeitos comuns de escrever o nome de um livro, já sem acento. */
const ALIASES: Record<string, string[]> = {
  Sl: ['salmo'],
  Lm: ['lamentacoes'],
  Ct: ['cantares', 'canticos dos canticos', 'cantico dos canticos'],
  At: ['atos dos apostolos'],
  Ap: ['revelacao'],
};

interface BookPattern {
  abbrev: string;
  /** Nome completo (aceita só o capítulo) ou sigla (exige capítulo e versículo). */
  isName: boolean;
}

/**
 * Sem acento, "Jó" e "Jo" (João) ficam iguais. Antes de normalizar, o "Jó" acentuado vira
 * esta marca, e "Jo" sozinho fica sendo João, que é o jeito comum de citar ("Jo 3:16").
 */
const JOB_MARK = 'livrodejo';

function normalizeForReferences(text: string): string {
  return normalize(text.replace(/(^|[^\p{L}])[Jj][óÓ](?![\p{L}])/gu, `$1${JOB_MARK}`));
}

/** Tabela "como a pessoa escreve" → livro. */
function buildPatterns(books: { abbrev: string; name: string }[]): Map<string, BookPattern> {
  const patterns = new Map<string, BookPattern>();
  const add = (text: string, pattern: BookPattern) => {
    // Um nome de livro nunca é substituído por uma sigla igual a ele.
    if (patterns.get(text)?.isName && !pattern.isName) return;
    patterns.set(text, pattern);
  };
  for (const book of books) {
    add(normalizeForReferences(book.name), { abbrev: book.abbrev, isName: true });
    for (const alias of ALIASES[book.abbrev] ?? []) add(alias, { abbrev: book.abbrev, isName: true });
    const abbrev = normalizeForReferences(book.abbrev);
    add(abbrev, { abbrev: book.abbrev, isName: false });
    // "1sm" também pode vir escrito "1 sm".
    if (/^\d/.test(abbrev)) add(`${abbrev[0]} ${abbrev.slice(1)}`, { abbrev: book.abbrev, isName: false });
  }
  return patterns;
}

const patternCache = new WeakMap<object, Map<string, BookPattern>>();

/** Acha referências escritas na anotação: "Romanos 8:28", "Rm 8.28", "Salmo 23", "1 Sm 17:45". */
export function findReferences(
  text: string,
  books: { abbrev: string; name: string }[]
): CitedReference[] {
  let patterns = patternCache.get(books);
  if (!patterns) {
    patterns = buildPatterns(books);
    patternCache.set(books, patterns);
  }

  // Sem acentos; ":" e "." viram espaço, então "8:28" vira "8 28".
  const words = normalizeForReferences(text).split(' ');
  const found: CitedReference[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < words.length; i += 1) {
    // Nomes de até 4 palavras ("cantico dos canticos", "1 samuel").
    for (let size = 4; size >= 1; size -= 1) {
      const written = words.slice(i, i + size).join(' ');
      const pattern = patterns.get(written);
      if (!pattern) continue;
      const chapter = Number(words[i + size]);
      const verseWord = words[i + size + 1];
      const verse = verseWord !== undefined && /^\d{1,3}$/.test(verseWord) ? Number(verseWord) : null;
      if (!Number.isInteger(chapter) || chapter < 1 || !/^\d{1,3}$/.test(words[i + size])) continue;
      if (!pattern.isName && verse === null) continue;
      const key = `${pattern.abbrev}:${chapter}:${verse ?? ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        found.push({ bookAbbrev: pattern.abbrev, chapter, verse });
      }
      i += size + (verse === null ? 0 : 1);
      break;
    }
  }
  return found;
}
