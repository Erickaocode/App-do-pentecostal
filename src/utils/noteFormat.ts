/**
 * As anotações são guardadas como HTML (negrito, títulos, listas...).
 * Anotações antigas, em texto puro, continuam funcionando: são convertidas ao abrir.
 */

/** Diz se o conteúdo já está no formato novo (HTML). */
export function isHtml(content: string): boolean {
  return /^\s*<(div|p|h[1-6]|ul|ol|pre|blockquote|table|br|b|i|u|s|span|strong|em)[\s>/]/i.test(
    content
  );
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Converte texto puro em HTML, uma linha por bloco. */
export function plainToHtml(text: string): string {
  if (!text) return '';
  return text
    .split('\n')
    .map((line) => (line ? `<div>${escapeHtml(line)}</div>` : '<div><br></div>'))
    .join('');
}

/** Garante HTML, convertendo anotações antigas em texto puro. */
export function toNoteHtml(content: string): string {
  return isHtml(content) ? content : plainToHtml(content);
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** Texto puro da anotação: para buscar, sugerir versículos e mostrar na lista. */
export function noteToPlainText(content: string): string {
  if (!isHtml(content)) return content;
  return content
    .replace(/<li[^>]*>/gi, '\n')
    .replace(/<\/(td|th)>/gi, '\t')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(div|p|h[1-6]|ul|ol|pre|blockquote|table|tr)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#\d+|#x[0-9a-f]+|\w+);/gi, (match, code: string) => {
      if (code[0] === '#') {
        const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : match;
      }
      return ENTITIES[code.toLowerCase()] ?? match;
    })
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
