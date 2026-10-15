export function dateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysToKey(key: string, deltaDays: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + deltaDays);
  return dateKey(date);
}

/** Conta quantos dias seguidos (incluindo hoje) aparecem em `activityKeys`. */
export function computeStreak(activityKeys: string[], today: string = dateKey()): number {
  const set = new Set(activityKeys);
  let streak = 0;
  let cursor = today;
  while (set.has(cursor)) {
    streak += 1;
    cursor = addDaysToKey(cursor, -1);
  }
  return streak;
}

export function greeting(hour: number = new Date().getHours()): string {
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

const WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/** Ex: "Quinta-feira, 15 de outubro". */
export function longDate(date: Date = new Date()): string {
  const weekday = WEEKDAYS[date.getDay()];
  return `${weekday[0].toUpperCase()}${weekday.slice(1)}, ${date.getDate()} de ${MONTHS[date.getMonth()]}`;
}

/** Os últimos 7 dias terminando em `today`, com a inicial do dia da semana (D, S, T...). */
export function lastSevenDays(today: string = dateKey()): { key: string; initial: string }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const key = addDaysToKey(today, i - 6);
    const [y, m, d] = key.split('-').map(Number);
    const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()];
    return { key, initial: weekday[0].toUpperCase() };
  });
}

/** Número de dias desde 01/01/1970 para uma chave `AAAA-MM-DD`: avança 1 a cada dia. */
export function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}
