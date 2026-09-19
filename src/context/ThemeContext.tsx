import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
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
    setScheme((prev) => {
      const next: ColorScheme = prev === 'light' ? 'dark' : 'light';
      setSetting(db, SETTING_KEY, next);
      return next;
    });
  }, [db]);

  const value: ThemeContextValue = {
    scheme,
    colors: scheme === 'dark' ? darkColors : lightColors,
    toggleScheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme precisa ser usado dentro de ThemeProvider');
  return ctx;
}
