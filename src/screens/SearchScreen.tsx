import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { getBookByAbbrev, searchVerses } from '../db/bibleQueries';
import type { BibleStackParamList } from '../navigation/types';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors } from '../theme';
import type { BibleVerse } from '../types';

type Props = NativeStackScreenProps<BibleStackParamList, 'Search'>;

/** Espera a pessoa parar de digitar antes de consultar os ~31 mil versículos. */
const SEARCH_DELAY_MS = 300;

export function SearchScreen({ navigation }: Props) {
  const db = useSQLiteContext();
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const searchRequest = useRef(0);

  useEffect(() => {
    const request = ++searchRequest.current;
    if (term.trim().length < 3) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const rows = await searchVerses(db, term);
        // Uma busca antiga que termina depois não pode substituir a mais recente.
        if (request !== searchRequest.current) return;
        setResults(rows);
        setSearched(true);
      } finally {
        if (request === searchRequest.current) setLoading(false);
      }
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [db, term]);

  async function openVerse(verse: BibleVerse) {
    const book = await getBookByAbbrev(db, verse.book_abbrev);
    navigation.navigate('Reading', {
      bookAbbrev: verse.book_abbrev,
      bookName: book?.name ?? verse.book_abbrev,
      chapter: verse.chapter,
      focusVerse: verse.verse,
    });
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Digite ao menos 3 letras..."
        placeholderTextColor={colors.textSecondary}
        value={term}
        onChangeText={setTerm}
        autoFocus
      />
      {loading ? <ActivityIndicator style={{ marginTop: 16 }} color={colors.primary} /> : null}

      {!loading && searched && results.length === 0 ? (
        <Text style={styles.empty}>Nenhum versículo encontrado.</Text>
      ) : null}

      <FlatList
        data={results}
        keyExtractor={(v) => String(v.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable style={styles.resultRow} onPress={() => openVerse(item)}>
            <Text style={styles.resultRef}>
              {item.book_abbrev} {item.chapter}:{item.verse}
            </Text>
            <Text style={styles.resultText} numberOfLines={2}>
              {item.text}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    input: {
      margin: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.textPrimary,
    },
    empty: {
      textAlign: 'center',
      color: colors.textSecondary,
      marginTop: 24,
    },
    listContent: { paddingHorizontal: 16, paddingBottom: 24 },
    resultRow: {
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    resultRef: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
      marginBottom: 2,
    },
    resultText: {
      fontSize: 15,
      color: colors.textPrimary,
      lineHeight: 21,
    },
  });
}
