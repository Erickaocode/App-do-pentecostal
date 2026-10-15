import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  Easing,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getBookByAbbrev, getChapterVerses } from '../db/bibleQueries';
import {
  addFavorite,
  isFavorite as queryIsFavorite,
  listHighlightsForChapter,
  removeFavorite,
  removeHighlight,
  saveLastReading,
  setHighlight,
} from '../db/userQueries';
import { useUserDb } from '../db/UserDbProvider';
import { VerseActionSheet } from '../components/VerseActionSheet';
import type { BibleStackParamList } from '../navigation/types';
import { useBibleDb } from '../context/BibleContext';
import { useTheme } from '../context/ThemeContext';
import { highlightColorValue, highlightTextColor } from '../theme';
import type { ThemeColors } from '../theme';
import type { BibleVerse, Highlight, VerseRef } from '../types';
import { showMessage } from '../utils/dialogs';

type Props = NativeStackScreenProps<BibleStackParamList, 'Reading'>;

const CHAPTER_ENTER_MS = 240;
const CHAPTER_SLIDE_DISTANCE = 36;

export function ReadingScreen({ route, navigation }: Props) {
  const { bookAbbrev, bookName, chapter, focusVerse } = route.params;
  const db = useBibleDb();
  const userDb = useUserDb();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [highlights, setHighlights] = useState<Record<number, string>>({});
  const [chapterCount, setChapterCount] = useState(1);
  const [selectedVerse, setSelectedVerse] = useState<BibleVerse | null>(null);
  const [selectedIsFavorite, setSelectedIsFavorite] = useState(false);
  const listRef = useRef<FlatList<BibleVerse>>(null);

  // Ao tocar em Próximo/Anterior, o capítulo novo entra deslizando do lado certo.
  const slideDirection = useRef<1 | -1 | 0>(0);
  const enterOpacity = useRef(new Animated.Value(1)).current;
  const enterOffset = useRef(new Animated.Value(0)).current;

  const playChapterEnter = useCallback(() => {
    const direction = slideDirection.current;
    slideDirection.current = 0;
    if (direction === 0) return;
    enterOpacity.setValue(0);
    enterOffset.setValue(direction * CHAPTER_SLIDE_DISTANCE);
    const config = {
      toValue: 1,
      duration: CHAPTER_ENTER_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    };
    Animated.parallel([
      Animated.timing(enterOpacity, config),
      Animated.timing(enterOffset, { ...config, toValue: 0 }),
    ]).start();
  }, [enterOpacity, enterOffset]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: `${bookName} ${chapter}` });
  }, [navigation, bookName, chapter]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getChapterVerses(db, bookAbbrev, chapter), getBookByAbbrev(db, bookAbbrev)]).then(
      ([rows, book]) => {
        // Ao trocar de capítulo rápido, uma consulta antiga não pode sobrescrever a nova.
        if (cancelled) return;
        setVerses(rows);
        setChapterCount(book?.chapter_count ?? 1);
        playChapterEnter();
      }
    );
    return () => {
      cancelled = true;
    };
  }, [db, bookAbbrev, chapter, playChapterEnter]);

  // Alimenta o "Continuar lendo" da tela Início.
  useEffect(() => {
    saveLastReading(userDb, { bookAbbrev, bookName, chapter }).catch(() => {});
  }, [userDb, bookAbbrev, bookName, chapter]);

  // Contador de leituras: só a resposta da leitura mais recente é aplicada.
  const highlightsRequest = useRef(0);

  const loadHighlights = useCallback(async () => {
    const request = ++highlightsRequest.current;
    const rows = await listHighlightsForChapter(userDb, bookAbbrev, chapter);
    if (request !== highlightsRequest.current) return;
    const map: Record<number, string> = {};
    rows.forEach((h: Highlight) => {
      map[h.verse] = h.color;
    });
    setHighlights(map);
  }, [userDb, bookAbbrev, chapter]);

  // O banco é a fonte da verdade: relê os destaques sempre que a tela volta ao foco
  // e quando o app volta do segundo plano, para nunca exibir um estado antigo.
  useFocusEffect(
    useCallback(() => {
      loadHighlights();
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') loadHighlights();
      });
      return () => subscription.remove();
    }, [loadHighlights])
  );

  // Última posição para a qual a lista já rolou: trocar de versão recarrega os versículos
  // do mesmo capítulo, e isso não deve tirar a pessoa do ponto em que estava lendo.
  const scrolledTo = useRef<string | null>(null);

  useEffect(() => {
    if (verses.length === 0) return;
    // Ainda são os versículos do capítulo anterior: espera os novos chegarem.
    if (verses[0].book_abbrev !== bookAbbrev || verses[0].chapter !== chapter) return;
    const target = `${bookAbbrev}:${chapter}:${focusVerse ?? ''}`;
    if (scrolledTo.current === target) return;
    scrolledTo.current = target;
    if (!focusVerse) {
      // Capítulo novo começa do topo, não na posição de rolagem do anterior.
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      return;
    }
    const index = verses.findIndex((v) => v.verse === focusVerse);
    if (index < 0) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.2 });
    }, 200);
    return () => clearTimeout(timer);
  }, [bookAbbrev, chapter, focusVerse, verses]);

  // Versículos longe do topo ainda não foram medidos pela FlatList: rola até a altura
  // estimada para renderizá-los e tenta de novo.
  const handleScrollToIndexFailed = useCallback(
    (info: { index: number; averageItemLength: number }) => {
      listRef.current?.scrollToOffset({
        offset: info.averageItemLength * info.index,
        animated: false,
      });
      setTimeout(() => {
        listRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.2 });
      }, 100);
    },
    []
  );

  const openVerse = useCallback(
    async (verse: BibleVerse) => {
      setSelectedVerse(verse);
      const fav = await queryIsFavorite(userDb, bookAbbrev, chapter, verse.verse);
      setSelectedIsFavorite(!!fav);
    },
    [userDb, bookAbbrev, chapter]
  );

  const renderVerse = useCallback(
    ({ item }: { item: BibleVerse }) => (
      <VerseRow
        verse={item}
        highlightKey={highlights[item.verse]}
        focused={focusVerse === item.verse}
        styles={styles}
        onPress={openVerse}
      />
    ),
    [highlights, focusVerse, styles, openVerse]
  );

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
    const wasFavorite = selectedIsFavorite;
    setSelectedIsFavorite(!wasFavorite);
    try {
      if (wasFavorite) {
        await removeFavorite(userDb, ref.bookAbbrev, ref.chapter, ref.verse);
      } else {
        await addFavorite(userDb, ref);
      }
    } catch {
      setSelectedIsFavorite(wasFavorite);
      showMessage('Não foi possível salvar', 'Tente novamente.');
    }
  }

  async function handlePickHighlight(colorKey: string | null) {
    if (!selectedVerse) return;
    const verse = selectedVerse.verse;
    // Mostra a cor na hora e grava em seguida; se a gravação falhar, recarrega do banco.
    setHighlights((prev) => {
      const next = { ...prev };
      if (colorKey) next[verse] = colorKey;
      else delete next[verse];
      return next;
    });
    try {
      if (colorKey) {
        await setHighlight(userDb, bookAbbrev, chapter, verse, colorKey);
      } else {
        await removeHighlight(userDb, bookAbbrev, chapter, verse);
      }
    } catch {
      showMessage('Não foi possível salvar o destaque', 'Tente novamente.');
    }
    // Invalida qualquer leitura iniciada antes desta gravação e confirma o estado real.
    loadHighlights();
  }

  function handleCreateNote() {
    const ref = currentVerseRef();
    setSelectedVerse(null);
    if (!ref) return;
    navigation.getParent<any>()?.navigate('AnotacoesTab', {
      screen: 'NoteEditor',
      params: { prefill: ref },
      initial: false,
    });
  }

  function goToChapter(next: number) {
    if (next < 1 || next > chapterCount) return;
    slideDirection.current = next > chapter ? 1 : -1;
    navigation.setParams({ chapter: next, focusVerse: undefined });
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.container,
          { opacity: enterOpacity, transform: [{ translateX: enterOffset }] },
        ]}
      >
        <FlatList
          ref={listRef}
          data={verses}
          keyExtractor={(v) => String(v.id)}
          contentContainerStyle={styles.listContent}
          onScrollToIndexFailed={handleScrollToIndexFailed}
          renderItem={renderVerse}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={11}
        />
      </Animated.View>

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

type ReadingStyles = ReturnType<typeof createStyles>;

/** Linha memorizada: ao destacar um versículo, só ela é redesenhada, não o capítulo inteiro. */
const VerseRow = memo(function VerseRow({
  verse,
  highlightKey,
  focused,
  styles,
  onPress,
}: {
  verse: BibleVerse;
  highlightKey: string | undefined;
  focused: boolean;
  styles: ReadingStyles;
  onPress: (verse: BibleVerse) => void;
}) {
  const highlighted = !!highlightKey;
  return (
    <Pressable
      onPress={() => onPress(verse)}
      style={[
        styles.verseRow,
        highlighted ? { backgroundColor: highlightColorValue(highlightKey) } : null,
        focused ? styles.verseFocused : null,
      ]}
    >
      <Text style={[styles.verseNumber, highlighted && styles.verseNumberOnHighlight]}>
        {verse.verse}
      </Text>
      <Text style={[styles.verseText, highlighted && styles.verseTextOnHighlight]}>
        {verse.text}
      </Text>
    </Pressable>
  );
});

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
    verseNumberOnHighlight: {
      color: highlightTextColor,
    },
    verseText: {
      flex: 1,
      fontSize: 16,
      lineHeight: 24,
      color: colors.textPrimary,
    },
    verseTextOnHighlight: {
      color: highlightTextColor,
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
}
