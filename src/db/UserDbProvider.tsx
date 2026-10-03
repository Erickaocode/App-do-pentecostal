import * as SQLite from 'expo-sqlite';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

const UserDbContext = createContext<SQLite.SQLiteDatabase | null>(null);

const SCHEMA_VERSION = 2;

/**
 * Configurações por conexão: precisam rodar toda vez que o banco é aberto, não só na criação.
 * `synchronous = FULL` faz cada gravação ir para o disco antes de retornar, então destaques,
 * favoritos e anotações sobrevivem ao app ser fechado ou morto pelo sistema logo em seguida.
 */
async function configureConnection(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = FULL;
  `);
}

async function initUserDatabase(db: SQLite.SQLiteDatabase) {
  await configureConnection(db);

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;
  if (currentVersion >= SCHEMA_VERSION) return;

  // Tudo ou nada: se a migração falhar no meio, o banco volta ao estado anterior.
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS activity_log (
        date TEXT PRIMARY KEY,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        book_abbrev TEXT,
        book_name TEXT,
        chapter INTEGER,
        verse INTEGER,
        verse_text TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_abbrev TEXT NOT NULL,
        book_name TEXT NOT NULL,
        chapter INTEGER NOT NULL,
        verse INTEGER NOT NULL,
        verse_text TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(book_abbrev, chapter, verse)
      );

      CREATE TABLE IF NOT EXISTS highlights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_abbrev TEXT NOT NULL,
        chapter INTEGER NOT NULL,
        verse INTEGER NOT NULL,
        color TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(book_abbrev, chapter, verse)
      );

      PRAGMA user_version = ${SCHEMA_VERSION};
    `);
  });
}

/** Copia o que está no arquivo WAL para o arquivo principal do banco. */
async function checkpoint(db: SQLite.SQLiteDatabase) {
  try {
    await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE)');
  } catch {
    // Se houver uma gravação em andamento o checkpoint fica para a próxima vez; nada se perde.
  }
}

export function UserDbProvider({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback: React.ReactNode;
}) {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const database = await SQLite.openDatabaseAsync('userdata.db');
        await initUserDatabase(database);
        if (!cancelled) setDb(database);
      } catch (e) {
        if (!cancelled) setError(e as Error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!db) return;
    // Ao ir para segundo plano o sistema pode matar o app a qualquer momento,
    // então consolidamos tudo no arquivo principal do banco.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') checkpoint(db);
    });
    return () => subscription.remove();
  }, [db]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Erro ao abrir o banco de dados local.</Text>
        <Text style={styles.errorDetail}>{error.message}</Text>
      </View>
    );
  }

  if (!db) return <>{fallback}</>;

  return <UserDbContext.Provider value={db}>{children}</UserDbContext.Provider>;
}

export function useUserDb(): SQLite.SQLiteDatabase {
  const db = useContext(UserDbContext);
  if (!db) throw new Error('useUserDb precisa ser usado dentro de UserDbProvider');
  return db;
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
