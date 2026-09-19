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

/** Hash simples e determinístico (FNV-1a like) usado para escolher o versículo do dia. */
export function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}
