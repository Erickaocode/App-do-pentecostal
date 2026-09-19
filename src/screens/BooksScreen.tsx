import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { getBooks } from '../db/bibleQueries';
import type { BibleStackParamList } from '../navigation/types';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors } from '../theme';
import type { BibleBook } from '../types';

type Props = NativeStackScreenProps<BibleStackParamList, 'Books'>;

export function BooksScreen({ navigation }: Props) {
  const db = useSQLiteContext();
  const [books, setBooks] = useState<BibleBook[]>([]);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    getBooks(db).then(setBooks);
  }, [db]);

  const sections = [
    { title: 'Antigo Testamento', data: books.filter((b) => b.testament === 'AT') },
    { title: 'Novo Testamento', data: books.filter((b) => b.testament === 'NT') },
  ];

  return (
    <View style={styles.container}>
      <Pressable style={styles.searchBar} onPress={() => navigation.navigate('Search')}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <Text style={styles.searchPlaceholder}>Buscar na Bíblia...</Text>
      </Pressable>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.abbrev}
        contentContainerStyle={styles.listContent}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <Pressable
            style={styles.bookRow}
            onPress={() =>
              navigation.navigate('Chapters', {
                bookAbbrev: item.abbrev,
                bookName: item.name,
                chapterCount: item.chapter_count,
              })
            }
          >
            <Text style={styles.bookName}>{item.name}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>
        )}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 4,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchPlaceholder: { color: colors.textSecondary, fontSize: 15 },
    listContent: { paddingBottom: 24 },
    sectionHeader: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      paddingHorizontal: 16,
      paddingTop: 18,
      paddingBottom: 6,
      backgroundColor: colors.background,
    },
    bookRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    bookName: { fontSize: 16, color: colors.textPrimary },
  });
}
