import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { getBookByAbbrev, getChapterVerses } from '../db/bibleQueries';
import {
  addFavorite,
  isFavorite as queryIsFavorite,
  listHighlightsForChapter,
  removeFavorite,
  removeHighlight,
  setHighlight,
} from '../db/userQueries';
import { VerseActionSheet } from '../components/VerseActionSheet';
import type { BibleStackParamList } from '../navigation/types';
import { colors, highlightColorValue } from '../theme';
import type { BibleVerse, Highlight, VerseRef } from '../types';

type Props = NativeStackScreenProps<BibleStackParamList, 'Reading'>;

export function ReadingScreen({ route, navigation }: Props) {
  const { bookAbbrev, bookName, chapter, focusVerse } = route.params;
  const db = useSQLiteContext();
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [highlights, setHighlights] = useState<Record<number, string>>({});
  const [chapterCount, setChapterCount] = useState(1);
  const [selectedVerse, setSelectedVerse] = useState<BibleVerse | null>(null);
  const [selectedIsFavorite, setSelectedIsFavorite] = useState(false);
  const listRef = useRef<FlatList<BibleVerse>>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: `${bookName} ${chapter}` });
  }, [navigation, bookName, chapter]);

  const load = useCallback(async () => {
    const [rows, hRows, book] = await Promise.all([
      getChapterVerses(db, bookAbbrev, chapter),
      listHighlightsForChapter(db, bookAbbrev, chapter),
      getBookByAbbrev(db, bookAbbrev),
    ]);
    setVerses(rows);
    setChapterCount(book?.chapter_count ?? 1);
    const map: Record<number, string> = {};
    hRows.forEach((h: Highlight) => {
      map[h.verse] = h.color;
    });
    setHighlights(map);
  }, [db, bookAbbrev, chapter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (focusVerse && verses.length > 0) {
      const index = verses.findIndex((v) => v.verse === focusVerse);
      if (index >= 0) {
        setTimeout(() => {
          listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.2 });
        }, 200);
      }
    }
  }, [focusVerse, verses]);

  async function openVerse(verse: BibleVerse) {
    setSelectedVerse(verse);
    const fav = await queryIsFavorite(db, bookAbbrev, chapter, verse.verse);
    setSelectedIsFavorite(!!fav);
  }

  function currentVerseRef(): VerseRef | null {
    if (!selectedVerse) return null;
    return {
      bookAbbrev,
      bookName,
      chapter,
      verse: selectedVerse.verse,
      text: selectedVerse.text,
    };
  }

  async function handleToggleFavorite() {
    const ref = currentVerseRef();
    if (!ref) return;
    if (selectedIsFavorite) {
      await removeFavorite(db, ref.bookAbbrev, ref.chapter, ref.verse);
    } else {
      await addFavorite(db, ref);
    }
    setSelectedIsFavorite(!selectedIsFavorite);
  }

  async function handlePickHighlight(colorKey: string | null) {
    if (!selectedVerse) return;
    if (colorKey) {
      await setHighlight(db, bookAbbrev, chapter, selectedVerse.verse, colorKey);
      setHighlights((prev) => ({ ...prev, [selectedVerse.verse]: colorKey }));
    } else {
      await removeHighlight(db, bookAbbrev, chapter, selectedVerse.verse);
      setHighlights((prev) => {
        const next = { ...prev };
        delete next[selectedVerse.verse];
        return next;
      });
    }
  }

  function handleCreateNote() {
    const ref = currentVerseRef();
    setSelectedVerse(null);
    if (!ref) return;
    navigation.getParent<any>()?.navigate('AnotacoesTab', {
      screen: 'NoteEditor',
      params: { prefill: ref },
    });
  }

  function goToChapter(next: number) {
    if (next < 1 || next > chapterCount) return;
    navigation.setParams({ chapter: next, focusVerse: undefined });
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={verses}
        keyExtractor={(v) => String(v.id)}
        contentContainerStyle={styles.listContent}
        onScrollToIndexFailed={() => {}}
        renderItem={({ item }) => {
          const highlightKey = highlights[item.verse];
          return (
            <Pressable
              onPress={() => openVerse(item)}
              style={[
                styles.verseRow,
                highlightKey ? { backgroundColor: highlightColorValue(highlightKey) } : null,
                focusVerse === item.verse ? styles.verseFocused : null,
              ]}
            >
              <Text style={styles.verseNumber}>{item.verse}</Text>
              <Text style={styles.verseText}>{item.text}</Text>
            </Pressable>
          );
        }}
      />

      <View style={styles.footerNav}>
        <Pressable
          style={[styles.navButton, chapter <= 1 && styles.navButtonDisabled]}
          onPress={() => goToChapter(chapter - 1)}
          disabled={chapter <= 1}
        >
          <Ionicons name="chevron-back" size={18} color={colors.surface} />
          <Text style={styles.navButtonText}>Anterior</Text>
        </Pressable>
        <Pressable
          style={[styles.navButton, chapter >= chapterCount && styles.navButtonDisabled]}
          onPress={() => goToChapter(chapter + 1)}
          disabled={chapter >= chapterCount}
        >
          <Text style={styles.navButtonText}>Próximo</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.surface} />
        </Pressable>
      </View>

      <VerseActionSheet
        visible={!!selectedVerse}
        verseRef={currentVerseRef()}
        isFavorite={selectedIsFavorite}
        activeHighlight={selectedVerse ? highlights[selectedVerse.verse] ?? null : null}
        onClose={() => setSelectedVerse(null)}
        onToggleFavorite={handleToggleFavorite}
        onPickHighlight={handlePickHighlight}
        onCreateNote={handleCreateNote}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: 16, paddingBottom: 90 },
  verseRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  verseFocused: {
    borderWidth: 1,
    borderColor: colors.accent,
  },
  verseNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
    marginTop: 3,
    minWidth: 20,
  },
  verseText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  footerNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  navButtonDisabled: {
    opacity: 0.35,
  },
  navButtonText: {
    color: colors.surface,
    fontWeight: '600',
    fontSize: 14,
  },
});
