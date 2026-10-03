import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useUserDb } from '../db/UserDbProvider';
import { getSetting, setSetting } from '../db/userQueries';
import { darkColors, lightColors, ThemeColors } from '../theme';

export type ColorScheme = 'light' | 'dark';

const SETTING_KEY = 'colorScheme';

interface ThemeContextValue {
  scheme: ColorScheme;
  colors: ThemeColors;
  toggleScheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const db = useUserDb();
  const [scheme, setScheme] = useState<ColorScheme>('light');
  const schemeRef = useRef(scheme);
  schemeRef.current = scheme;

  useEffect(() => {
    let cancelled = false;
    getSetting(db, SETTING_KEY).then((value) => {
      if (!cancelled && (value === 'dark' || value === 'light')) setScheme(value);
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  const toggleScheme = useCallback(() => {
    // A gravação fica fora do setState: atualizadores de estado devem ser puros
    // (o React pode chamá-los mais de uma vez).
    const next: ColorScheme = schemeRef.current === 'light' ? 'dark' : 'light';
    schemeRef.current = next;
    setScheme(next);
    setSetting(db, SETTING_KEY, next).catch(() => {});
  }, [db]);

  // Objeto estável: as telas só redesenham quando o tema realmente muda.
  const value = useMemo<ThemeContextValue>(
    () => ({
      scheme,
      colors: scheme === 'dark' ? darkColors : lightColors,
      toggleScheme,
    }),
    [scheme, toggleScheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme precisa ser usado dentro de ThemeProvider');
  return ctx;
}
