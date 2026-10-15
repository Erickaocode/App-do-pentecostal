import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import type { SQLiteDatabase } from 'expo-sqlite';
import React, { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBookByAbbrev, getDailyVerse } from '../db/bibleQueries';
import { useUserDb } from '../db/UserDbProvider';
import {
  addFavorite,
  getLastReading,
  isFavorite as queryIsFavorite,
  listActivityDates,
  recordTodayActivity,
  removeFavorite,
  type LastReading,
} from '../db/userQueries';
import { useBible } from '../context/BibleContext';
import { useTheme } from '../context/ThemeContext';
import type { HomeStackParamList } from '../navigation/types';
import type { ThemeColors } from '../theme';
import type { BibleVerse, VerseRef } from '../types';
import { showMessage } from '../utils/dialogs';
import { computeStreak, dateKey, greeting, lastSevenDays, longDate } from '../utils/dates';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

interface VerseOfDay {
  verse: BibleVerse;
  bookName: string;
}

/**
 * O versículo do dia só muda à meia-noite ou ao trocar de versão: guarda em memória para
 * não consultar a Bíblia toda vez que a aba ganha foco.
 */
let verseOfDayCache: { key: string; value: VerseOfDay | null } | null = null;

async function loadVerseOfDay(
  db: SQLiteDatabase,
  day: string,
  versionId: string
): Promise<VerseOfDay | null> {
  const key = `${day}:${versionId}`;
  if (verseOfDayCache?.key === key) return verseOfDayCache.value;
  const verse = await getDailyVerse(db, day);
  let value: VerseOfDay | null = null;
  if (verse) {
    const book = await getBookByAbbrev(db, verse.book_abbrev);
    value = { verse, bookName: book?.name ?? verse.book_abbrev };
  }
  verseOfDayCache = { key, value };
  return value;
}

const serifFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' });

function streakMessage(streak: number): string {
  if (streak >= 30) return 'Um mês inteiro na Palavra. Que caminhada bonita!';
  if (streak >= 7) return 'Mais de uma semana seguida. Continue firme!';
  if (streak > 1) return 'Continue voltando todos os dias para manter o fogo aceso.';
  return 'Você abriu a Palavra hoje. Volte amanhã para começar sua sequência!';
}

export function HomeScreen({ navigation }: Props) {
  const { db, version } = useBible();
  const userDb = useUserDb();
  const { colors, scheme, toggleScheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const [streak, setStreak] = useState(0);
  const [activeDays, setActiveDays] = useState<Set<string>>(new Set());
  const [verseOfDay, setVerseOfDay] = useState<VerseOfDay | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [lastReading, setLastReading] = useState<LastReading | null>(null);

  const load = useCallback(
    async (isActive: () => boolean) => {
      await recordTodayActivity(userDb);
      const [dates, reading] = await Promise.all([listActivityDates(userDb), getLastReading(userDb)]);
      if (!isActive()) return;
      setStreak(computeStreak(dates));
      setActiveDays(new Set(dates));
      setLastReading(reading);

      const today = await loadVerseOfDay(db, dateKey(), version.id);
      if (!isActive() || !today) return;
      setVerseOfDay(today);
      // O favorito pode ter mudado em outra aba, então este sempre é relido.
      const { verse } = today;
      const fav = await queryIsFavorite(userDb, verse.book_abbrev, verse.chapter, verse.verse);
      if (isActive()) setIsFavorite(!!fav);
    },
    [db, userDb, version.id]
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      load(() => active);
      return () => {
        active = false;
      };
    }, [load])
  );

  function verseRef(): VerseRef | null {
    if (!verseOfDay) return null;
    return {
      bookAbbrev: verseOfDay.verse.book_abbrev,
      bookName: verseOfDay.bookName,
      chapter: verseOfDay.verse.chapter,
      verse: verseOfDay.verse.verse,
      text: verseOfDay.verse.text,
    };
  }

  async function handleToggleFavorite() {
    const ref = verseRef();
    if (!ref) return;
    const wasFavorite = isFavorite;
    setIsFavorite(!wasFavorite);
    try {
      if (wasFavorite) {
        await removeFavorite(userDb, ref.bookAbbrev, ref.chapter, ref.verse);
      } else {
        await addFavorite(userDb, ref);
      }
    } catch {
      setIsFavorite(wasFavorite);
      showMessage('Não foi possível salvar', 'Tente novamente.');
    }
  }

  async function handleShare() {
    const ref = verseRef();
    if (!ref) return;
    const message = `“${ref.text}”\n${ref.bookName} ${ref.chapter}:${ref.verse} (${version.short})`;
    // No app desktop e em navegadores de computador não existe a janela de compartilhar:
    // copia o versículo para a área de transferência.
    if (Platform.OS === 'web' && !navigator.share) {
      try {
        await navigator.clipboard.writeText(message);
        showMessage('Versículo copiado', 'Agora é só colar onde quiser compartilhar.');
      } catch {
        showMessage('Não foi possível copiar', 'Tente novamente.');
      }
      return;
    }
    try {
      await Share.share({ message });
    } catch {
      // A pessoa fechou a janela de compartilhar sem escolher nada.
    }
  }

  function openReading(params: {
    bookAbbrev: string;
    bookName: string;
    chapter: number;
    focusVerse?: number;
  }) {
    navigation.getParent<any>()?.navigate('BibliaTab', { screen: 'Reading', params, initial: false });
  }

  function openVerseOfDay() {
    const ref = verseRef();
    if (!ref) return;
    openReading({
      bookAbbrev: ref.bookAbbrev,
      bookName: ref.bookName,
      chapter: ref.chapter,
      focusVerse: ref.verse,
    });
  }

  function openContinueReading() {
    if (lastReading) openReading(lastReading);
    else navigation.getParent<any>()?.navigate('BibliaTab', { screen: 'Books' });
  }

  const shortcuts = [
    {
      icon: 'search' as const,
      label: 'Buscar',
      onPress: () => navigation.getParent<any>()?.navigate('BibliaTab', { screen: 'Search', initial: false }),
    },
    {
      icon: 'create-outline' as const,
      label: 'Anotar',
      onPress: () =>
        navigation.getParent<any>()?.navigate('AnotacoesTab', {
          screen: 'NoteEditor',
          params: {},
          initial: false,
        }),
    },
    {
      icon: 'heart-outline' as const,
      label: 'Favoritos',
      onPress: () => navigation.getParent<any>()?.navigate('FavoritosTab', { screen: 'FavoritesList' }),
    },
  ];

  const week = lastSevenDays();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: 16 + insets.top }]}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.date}>{longDate()}</Text>
          <Text style={styles.title}>{greeting()}!</Text>
        </View>
        <Pressable style={styles.themeToggle} onPress={toggleScheme} hitSlop={10}>
          <Ionicons
            name={scheme === 'dark' ? 'sunny' : 'moon'}
            size={20}
            color={colors.textPrimary}
          />
        </Pressable>
      </View>

      {verseOfDay ? (
        <Pressable style={styles.hero} onPress={openVerseOfDay}>
          <Text style={styles.heroQuoteMark}>“</Text>
          <View style={styles.heroLabelRow}>
            <Ionicons name="sunny" size={14} color={colors.heroMuted} />
            <Text style={styles.heroLabel}>Versículo do dia</Text>
          </View>
          <Text style={styles.heroText}>{verseOfDay.verse.text}</Text>
          <Text style={styles.heroRef}>
            {verseOfDay.bookName} {verseOfDay.verse.chapter}:{verseOfDay.verse.verse}
            <Text style={styles.heroVersion}>  ·  {version.short}</Text>
          </Text>
          <View style={styles.heroActions}>
            <Pressable style={styles.heroButton} onPress={handleToggleFavorite} hitSlop={6}>
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={17}
                color={colors.heroText}
              />
              <Text style={styles.heroButtonText}>{isFavorite ? 'Salvo' : 'Favoritar'}</Text>
            </Pressable>
            <Pressable style={styles.heroButton} onPress={handleShare} hitSlop={6}>
              <Ionicons name="share-social-outline" size={17} color={colors.heroText} />
              <Text style={styles.heroButtonText}>Compartilhar</Text>
            </Pressable>
            <Pressable style={styles.heroIconButton} onPress={openVerseOfDay} hitSlop={6}>
              <Ionicons name="book-outline" size={17} color={colors.heroText} />
            </Pressable>
          </View>
        </Pressable>
      ) : null}

      <View style={styles.card}>
        <View style={styles.streakTop}>
          <View style={styles.streakIconWrap}>
            <Ionicons name="flame" size={26} color={colors.streak} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.streakCount}>
              {streak} {streak === 1 ? 'dia seguido' : 'dias seguidos'}
            </Text>
            <Text style={styles.cardSubtitle}>{streakMessage(streak)}</Text>
          </View>
        </View>
        <View style={styles.week}>
          {week.map((day, index) => {
            const done = activeDays.has(day.key);
            const isToday = index === week.length - 1;
            return (
              <View key={day.key} style={styles.weekDay}>
                <View
                  style={[
                    styles.weekDot,
                    done && styles.weekDotDone,
                    isToday && !done && styles.weekDotToday,
                  ]}
                >
                  {done ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                </View>
                <Text style={[styles.weekLabel, isToday && styles.weekLabelToday]}>
                  {day.initial}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <Pressable style={[styles.card, styles.continueCard]} onPress={openContinueReading}>
        <View style={styles.continueIcon}>
          <Ionicons name="book" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardEyebrow}>{lastReading ? 'Continuar lendo' : 'Comece a ler'}</Text>
          <Text style={styles.continueTitle}>
            {lastReading ? `${lastReading.bookName} ${lastReading.chapter}` : 'Escolha um livro'}
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={20} color={colors.primary} />
      </Pressable>

      <View style={styles.shortcuts}>
        {shortcuts.map((item) => (
          <Pressable key={item.label} style={styles.shortcut} onPress={item.onPress}>
            <Ionicons name={item.icon} size={22} color={colors.primary} />
            <Text style={styles.shortcutLabel}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 32, gap: 14 },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    date: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
    themeToggle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },

    hero: {
      backgroundColor: colors.heroBackground,
      borderRadius: 24,
      padding: 22,
      overflow: 'hidden',
      boxShadow: '0px 8px 24px rgba(60, 35, 15, 0.22)',
    },
    heroQuoteMark: {
      position: 'absolute',
      top: -18,
      right: 14,
      fontSize: 140,
      lineHeight: 160,
      fontFamily: serifFont,
      color: colors.heroText,
      opacity: 0.1,
    },
    heroLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
    heroLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.heroMuted,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
    },
    heroText: {
      fontSize: 21,
      lineHeight: 31,
      fontFamily: serifFont,
      color: colors.heroText,
      marginBottom: 14,
    },
    heroRef: { fontSize: 15, fontWeight: '700', color: colors.heroMuted, marginBottom: 20 },
    heroVersion: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
    heroActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    heroButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.heroButton,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 999,
    },
    heroIconButton: {
      backgroundColor: colors.heroButton,
      paddingHorizontal: 11,
      paddingVertical: 9,
      borderRadius: 999,
      marginLeft: 'auto',
    },
    heroButtonText: { fontSize: 13, fontWeight: '600', color: colors.heroText },

    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    cardEyebrow: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 2,
    },
    cardSubtitle: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },

    streakTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
    streakIconWrap: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    streakCount: { fontSize: 19, fontWeight: '800', color: colors.textPrimary, marginBottom: 2 },
    week: { flexDirection: 'row', justifyContent: 'space-between' },
    weekDay: { alignItems: 'center', gap: 6 },
    weekDot: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    weekDotDone: { backgroundColor: colors.streak },
    weekDotToday: { borderWidth: 2, borderColor: colors.streak },
    weekLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
    weekLabelToday: { color: colors.textPrimary, fontWeight: '800' },

    continueCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    continueIcon: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    continueTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },

    shortcuts: { flexDirection: 'row', gap: 10 },
    shortcut: {
      flex: 1,
      alignItems: 'center',
      gap: 8,
      paddingVertical: 16,
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
    },
    shortcutLabel: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  });
}
