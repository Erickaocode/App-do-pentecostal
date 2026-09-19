import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getBookByAbbrev, getVerseBySeed } from '../db/bibleQueries';
import { useUserDb } from '../db/UserDbProvider';
import {
  addFavorite,
  isFavorite as queryIsFavorite,
  listActivityDates,
  recordTodayActivity,
  removeFavorite,
} from '../db/userQueries';
import { useTheme } from '../context/ThemeContext';
import type { HomeStackParamList } from '../navigation/types';
import type { ThemeColors } from '../theme';
import type { BibleVerse, VerseRef } from '../types';
import { computeStreak, dateKey, greeting } from '../utils/dates';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

interface VerseOfDay {
  verse: BibleVerse;
  bookName: string;
}

export function HomeScreen({ navigation }: Props) {
  const db = useSQLiteContext();
  const userDb = useUserDb();
  const { colors, scheme, toggleScheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [streak, setStreak] = useState(0);
  const [verseOfDay, setVerseOfDay] = useState<VerseOfDay | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  const load = useCallback(async () => {
    await recordTodayActivity(userDb);
    const dates = await listActivityDates(userDb);
    setStreak(computeStreak(dates));

    const seed = dateKey();
    const verse = await getVerseBySeed(db, seed);
    if (verse) {
      const book = await getBookByAbbrev(db, verse.book_abbrev);
      setVerseOfDay({ verse, bookName: book?.name ?? verse.book_abbrev });
      const fav = await queryIsFavorite(userDb, verse.book_abbrev, verse.chapter, verse.verse);
      setIsFavorite(!!fav);
    }
  }, [db, userDb]);

  useFocusEffect(
    useCallback(() => {
      load();
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
    if (isFavorite) {
      await removeFavorite(userDb, ref.bookAbbrev, ref.chapter, ref.verse);
    } else {
      await addFavorite(userDb, ref);
    }
    setIsFavorite(!isFavorite);
  }

  function openVerseOfDay() {
    const ref = verseRef();
    if (!ref) return;
    navigation.getParent<any>()?.navigate('BibliaTab', {
      screen: 'Reading',
      params: {
        bookAbbrev: ref.bookAbbrev,
        bookName: ref.bookName,
        chapter: ref.chapter,
        focusVerse: ref.verse,
      },
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting()}</Text>
          <Text style={styles.title}>Sua jornada na Palavra</Text>
        </View>
        <Pressable style={styles.themeToggle} onPress={toggleScheme} hitSlop={10}>
          <Ionicons
            name={scheme === 'dark' ? 'sunny' : 'moon'}
            size={20}
            color={colors.textPrimary}
          />
        </Pressable>
      </View>

      <View style={styles.streakCard}>
        <View style={styles.streakIconWrap}>
          <Ionicons name="flame" size={28} color={colors.streak} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.streakCount}>
            {streak} {streak === 1 ? 'dia seguido' : 'dias seguidos'}
          </Text>
          <Text style={styles.streakSubtitle}>
            {streak > 1
              ? 'Continue acessando todos os dias para manter sua sequência!'
              : 'Você acessou hoje. Volte amanhã para começar a sua sequência!'}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Versículo do dia</Text>
      {verseOfDay ? (
        <Pressable style={styles.verseCard} onPress={openVerseOfDay}>
          <Text style={styles.verseRef}>
            {verseOfDay.bookName} {verseOfDay.verse.chapter}:{verseOfDay.verse.verse}
          </Text>
          <Text style={styles.verseText}>{verseOfDay.verse.text}</Text>
          <View style={styles.verseActions}>
            <Pressable style={styles.verseAction} onPress={handleToggleFavorite} hitSlop={8}>
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={18}
                color={isFavorite ? colors.danger : colors.textSecondary}
              />
              <Text style={styles.verseActionText}>
                {isFavorite ? 'Nos favoritos' : 'Favoritar'}
              </Text>
            </Pressable>
            <Pressable style={styles.verseAction} onPress={openVerseOfDay} hitSlop={8}>
              <Ionicons name="book-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.verseActionText}>Ler no capítulo</Text>
            </Pressable>
          </View>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 32, gap: 4 },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 18,
    },
    greeting: { fontSize: 14, color: colors.textSecondary, marginBottom: 2 },
    title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
    themeToggle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    streakCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 22,
    },
    streakIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    streakCount: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 3 },
    streakSubtitle: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 10,
    },
    verseCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      marginBottom: 22,
    },
    verseRef: { fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 8 },
    verseText: {
      fontSize: 17,
      lineHeight: 25,
      color: colors.textPrimary,
      fontStyle: 'italic',
      marginBottom: 14,
    },
    verseActions: {
      flexDirection: 'row',
      gap: 20,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingTop: 12,
    },
    verseAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    verseActionText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  });
}
