import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { getBooks } from '../db/bibleQueries';
import type { BibleStackParamList } from '../navigation/types';
import { useBibleDb } from '../context/BibleContext';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors } from '../theme';
import type { BibleBook } from '../types';

type Props = NativeStackScreenProps<BibleStackParamList, 'Books'>;

const DRAWER_DURATION_MS = 260;

export function BooksScreen({ navigation }: Props) {
  const db = useBibleDb();
  const [books, setBooks] = useState<BibleBook[]>([]);
  // Só uma gaveta aberta por vez: abrir um livro fecha o anterior.
  const [openBook, setOpenBook] = useState<string | null>(null);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    getBooks(db).then(setBooks);
  }, [db]);

  const sections = useMemo(
    () => [
      { title: 'Antigo Testamento', data: books.filter((b) => b.testament === 'AT') },
      { title: 'Novo Testamento', data: books.filter((b) => b.testament === 'NT') },
    ],
    [books]
  );

  const listRef = useRef<SectionList<BibleBook>>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
  }, []);

  const openBookRef = useRef(openBook);
  openBookRef.current = openBook;

  const toggleBook = useCallback((book: BibleBook, index: number) => {
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    if (openBookRef.current === book.abbrev) {
      setOpenBook(null);
      return;
    }
    setOpenBook(book.abbrev);
    // Depois que a gaveta abre (e a anterior fecha), traz o livro para o topo,
    // senão os capítulos de um livro lá embaixo abririam fora da tela.
    scrollTimer.current = setTimeout(() => {
      listRef.current?.scrollToLocation({
        sectionIndex: book.testament === 'AT' ? 0 : 1,
        itemIndex: index,
        viewPosition: 0,
        animated: true,
      });
    }, DRAWER_DURATION_MS);
  }, []);

  const openChapter = useCallback(
    (book: BibleBook, chapter: number) => {
      navigation.navigate('Reading', { bookAbbrev: book.abbrev, bookName: book.name, chapter });
    },
    [navigation]
  );

  return (
    <View style={styles.container}>
      <Pressable style={styles.searchBar} onPress={() => navigation.navigate('Search')}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <Text style={styles.searchPlaceholder}>Buscar na Bíblia...</Text>
      </Pressable>

      <SectionList
        ref={listRef}
        sections={sections}
        keyExtractor={(item) => item.abbrev}
        contentContainerStyle={styles.listContent}
        extraData={openBook}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item, index }) => (
          <BookRow
            book={item}
            index={index}
            open={openBook === item.abbrev}
            styles={styles}
            colors={colors}
            onToggle={toggleBook}
            onOpenChapter={openChapter}
          />
        )}
      />
    </View>
  );
}

type BooksStyles = ReturnType<typeof createStyles>;

/** Livro com a gaveta de capítulos, que desliza abrindo logo abaixo do nome. */
const BookRow = memo(function BookRow({
  book,
  index,
  open,
  styles,
  colors,
  onToggle,
  onOpenChapter,
}: {
  book: BibleBook;
  index: number;
  open: boolean;
  styles: BooksStyles;
  colors: ThemeColors;
  onToggle: (book: BibleBook, index: number) => void;
  onOpenChapter: (book: BibleBook, chapter: number) => void;
}) {
  const progress = useRef(new Animated.Value(open ? 1 : 0)).current;
  const [contentHeight, setContentHeight] = useState(0);
  // A grade continua montada enquanto a gaveta fecha, para a animação ter o que mostrar.
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) setMounted(true);
    const animation = Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: DRAWER_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      // A altura não pode ser animada pelo driver nativo.
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (finished && !open) setMounted(false);
    });
    return () => animation.stop();
  }, [open, progress]);

  const chapters = useMemo(
    () => Array.from({ length: book.chapter_count }, (_, i) => i + 1),
    [book.chapter_count]
  );

  const height = progress.interpolate({ inputRange: [0, 1], outputRange: [0, contentHeight] });
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] });

  return (
    <View style={[styles.bookItem, open && styles.bookItemOpen]}>
      <Pressable style={styles.bookRow} onPress={() => onToggle(book, index)}>
        <Text style={[styles.bookName, open && styles.bookNameOpen]}>{book.name}</Text>
        <Text style={styles.chapterCount}>{book.chapter_count}</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={open ? colors.primary : colors.textSecondary}
          />
        </Animated.View>
      </Pressable>

      {mounted ? (
        <Animated.View style={[styles.drawer, { height }]}>
          <Animated.View
            style={[styles.drawerContent, { opacity: progress, transform: [{ translateY }] }]}
            onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
          >
            {chapters.map((chapter) => (
              <Pressable
                key={chapter}
                style={({ pressed }) => [styles.cell, pressed && styles.cellPressed]}
                onPress={() => onOpenChapter(book, chapter)}
              >
                <View style={styles.cellInner}>
                  <Text style={styles.cellText}>{chapter}</Text>
                </View>
              </Pressable>
            ))}
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
});

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
    bookItem: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    bookItemOpen: { backgroundColor: colors.surface },
    bookRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    bookName: { flex: 1, fontSize: 16, color: colors.textPrimary },
    bookNameOpen: { fontWeight: '700', color: colors.primary },
    chapterCount: { fontSize: 12, color: colors.textSecondary },
    drawer: { overflow: 'hidden' },
    drawerContent: {
      // Fica fora do fluxo para medir a altura natural da grade, mesmo com a gaveta fechada.
      position: 'absolute',
      left: 0,
      right: 0,
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 12,
      paddingBottom: 14,
    },
    cell: {
      width: '16.66%',
      aspectRatio: 1,
      padding: 4,
    },
    cellPressed: { opacity: 0.6, transform: [{ scale: 0.94 }] },
    cellInner: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cellText: { fontSize: 16, fontWeight: '600', color: colors.primaryDark },
  });
}
