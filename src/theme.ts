export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  primary: string;
  primaryDark: string;
  accent: string;
  danger: string;
  streak: string;
  testamentAT: string;
  testamentNT: string;
  /** Card de destaque da tela Início (versículo do dia). */
  heroBackground: string;
  heroText: string;
  heroMuted: string;
  heroButton: string;
}

export const lightColors: ThemeColors = {
  background: '#FAF6F0',
  surface: '#FFFFFF',
  surfaceAlt: '#F1E9DC',
  border: '#E7DFD3',
  textPrimary: '#2B2320',
  textSecondary: '#6F6459',
  primary: '#7A4B2A',
  primaryDark: '#5C371D',
  accent: '#B4772C',
  danger: '#B3452F',
  streak: '#D9711D',
  testamentAT: '#7A4B2A',
  testamentNT: '#3D6E5C',
  heroBackground: '#6B3F22',
  heroText: '#FFF8EE',
  heroMuted: '#E6CBA8',
  heroButton: 'rgba(255, 248, 238, 0.14)',
};

export const darkColors: ThemeColors = {
  background: '#161210',
  surface: '#221C17',
  surfaceAlt: '#2C241D',
  border: '#3B3129',
  textPrimary: '#F3EADC',
  textSecondary: '#B5A796',
  primary: '#D9A45C',
  primaryDark: '#B4772C',
  accent: '#E0B368',
  danger: '#E28368',
  streak: '#F0922E',
  testamentAT: '#D9A45C',
  testamentNT: '#7FBFA3',
  heroBackground: '#3A2819',
  heroText: '#F7EBD8',
  heroMuted: '#D9A45C',
  heroButton: 'rgba(247, 235, 216, 0.10)',
};

/** Cor de texto usada em versículos destacados: o fundo do destaque é sempre um tom pastel claro, em qualquer tema. */
export const highlightTextColor = '#2B2320';

/** Alias estático para telas que renderizam antes do ThemeProvider estar disponível (splash/erro do banco). */
export const colors = lightColors;

export const highlightColors = [
  { key: 'yellow', label: 'Amarelo', value: '#F5D76E' },
  { key: 'green', label: 'Verde', value: '#A9D6A0' },
  { key: 'blue', label: 'Azul', value: '#A9C7E8' },
  { key: 'pink', label: 'Rosa', value: '#EBB6C7' },
] as const;

export type HighlightColorKey = (typeof highlightColors)[number]['key'];

export function highlightColorValue(key: string): string {
  return highlightColors.find((c) => c.key === key)?.value ?? highlightColors[0].value;
}
