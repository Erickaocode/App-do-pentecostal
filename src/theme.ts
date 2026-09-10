export const colors = {
  background: '#FAF6F0',
  surface: '#FFFFFF',
  border: '#E7DFD3',
  textPrimary: '#2B2320',
  textSecondary: '#6F6459',
  primary: '#7A4B2A',
  primaryDark: '#5C371D',
  accent: '#B4772C',
  danger: '#B3452F',
  testamentAT: '#7A4B2A',
  testamentNT: '#3D6E5C',
};

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
