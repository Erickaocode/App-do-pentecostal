import * as SQLite from 'expo-sqlite';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { bibleVersions, defaultBibleVersion, findBibleVersion, type BibleVersion } from '../bible/versions';
import { useUserDb } from '../db/UserDbProvider';
import { getSetting, setSetting } from '../db/userQueries';
import { colors } from '../theme';

const SETTING_KEY = 'bibleVersion';

interface BibleContextValue {
  db: SQLite.SQLiteDatabase;
  version: BibleVersion;
  versions: BibleVersion[];
  setVersion: (id: string) => Promise<void>;
}

const BibleContext = createContext<BibleContextValue | null>(null);

/** Copia o banco da versão para o aparelho (só na primeira vez) e abre. */
async function openVersion(version: BibleVersion): Promise<SQLite.SQLiteDatabase> {
  await SQLite.importDatabaseFromAssetAsync(version.fileName, { assetId: version.asset });
  return SQLite.openDatabaseAsync(version.fileName);
}

export function BibleProvider({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback: React.ReactNode;
}) {
  const userDb = useUserDb();
  const [current, setCurrent] = useState<{ version: BibleVersion; db: SQLite.SQLiteDatabase } | null>(
    null
  );
  const [error, setError] = useState<Error | null>(null);
  // Cada versão é aberta uma vez só; trocar de volta para ela é instantâneo.
  const opened = useRef(new Map<string, Promise<SQLite.SQLiteDatabase>>());

  const open = useCallback((version: BibleVersion) => {
    let promise = opened.current.get(version.id);
    if (!promise) {
      promise = openVersion(version);
      opened.current.set(version.id, promise);
      promise.catch(() => opened.current.delete(version.id));
    }
    return promise;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = findBibleVersion(await getSetting(userDb, SETTING_KEY).catch(() => null));
      let version = saved ?? defaultBibleVersion;
      let db: SQLite.SQLiteDatabase;
      try {
        db = await open(version);
      } catch (e) {
        if (version === defaultBibleVersion) throw e;
        // Se a versão salva falhar, a pessoa ainda consegue ler na versão padrão.
        version = defaultBibleVersion;
        db = await open(version);
      }
      if (!cancelled) setCurrent({ version, db });
    })().catch((e) => {
      if (!cancelled) setError(e as Error);
    });
    return () => {
      cancelled = true;
    };
  }, [userDb, open]);

  const setVersion = useCallback(
    async (id: string) => {
      const version = findBibleVersion(id);
      if (!version) return;
      try {
        const db = await open(version);
        setCurrent({ version, db });
        await setSetting(userDb, SETTING_KEY, version.id);
      } catch {
        Alert.alert('Não foi possível abrir esta versão', 'Tente novamente.');
      }
    },
    [userDb, open]
  );

  const value = useMemo<BibleContextValue | null>(
    () => (current ? { ...current, versions: bibleVersions, setVersion } : null),
    [current, setVersion]
  );

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Erro ao abrir a Bíblia.</Text>
        <Text style={styles.errorDetail}>{error.message}</Text>
      </View>
    );
  }

  if (!value) return <>{fallback}</>;

  return <BibleContext.Provider value={value}>{children}</BibleContext.Provider>;
}

export function useBible(): BibleContextValue {
  const ctx = useContext(BibleContext);
  if (!ctx) throw new Error('useBible precisa ser usado dentro de BibleProvider');
  return ctx;
}

/** Banco da versão da Bíblia escolhida no momento. */
export function useBibleDb(): SQLite.SQLiteDatabase {
  return useBible().db;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  errorText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorDetail: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
});
