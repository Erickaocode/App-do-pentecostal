export interface BibleVersion {
  id: string;
  /** Sigla curta mostrada no seletor (ex: "ACF"). */
  short: string;
  name: string;
  /** Nome do arquivo do banco no aparelho. */
  fileName: string;
  asset: number;
}

/**
 * Versões da Bíblia que vão junto com o app. Todas usam as mesmas siglas de livro,
 * então grifos, favoritos e anotações valem em qualquer versão.
 */
export const bibleVersions: BibleVersion[] = [
  {
    id: 'blivre',
    short: 'BLIVRE',
    name: 'Bíblia Livre',
    fileName: 'blivre.db',
    asset: require('../../assets/bible/blivre.db'),
  },
];

export const defaultBibleVersion = bibleVersions[0];

export function findBibleVersion(id: string | null): BibleVersion | undefined {
  return bibleVersions.find((v) => v.id === id);
}
