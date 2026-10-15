import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useBibleDb } from '../context/BibleContext';
import { useTheme } from '../context/ThemeContext';
import type { VerseWithBook } from '../db/bibleQueries';
import { suggestVerses, type VerseSuggestion } from '../suggest/suggestVerses';
import type { ThemeColors } from '../theme';

/** Espera a pessoa parar de digitar antes de procurar. */
const SUGGEST_DELAY_MS = 1000;
/** Com menos que isso ainda não dá para entender do que a anotação fala. */
const MIN_TEXT_LENGTH = 12;

interface Props {
  /** Texto analisado: título, conteúdo e, se houver, o versículo da anotação. */
  text: string;
  exclude?: { bookAbbrev: string; chapter: number; verse: number };
  /** Referências já citadas na anotação (ex: "Filipenses 4:6"), que não precisam ser sugeridas de novo. */
  citedText: string;
  onInsert: (verse: VerseWithBook) => void;
  onOpen: (verse: VerseWithBook) => void;
}

export function VerseSuggestions({ text, exclude, citedText, onInsert, onOpen }: Props) {
  const db = useBibleDb();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [suggestions, setSuggestions] = useState<VerseSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const request = useRef(0);

  const enoughText = text.trim().length >= MIN_TEXT_LENGTH;
  const excludeKey = exclude ? `${exclude.bookAbbrev}:${exclude.chapter}:${exclude.verse}` : '';

  useEffect(() => {
    const current = ++request.current;
    if (!enoughText) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const rows = await suggestVerses(db, text, { exclude, limit: 6 });
        // Uma busca antiga que termina depois não pode substituir a mais recente.
        if (current === request.current) setSuggestions(rows);
      } catch {
        if (current === request.current) setSuggestions([]);
      } finally {
        if (current === request.current) setLoading(false);
      }
    }, SUGGEST_DELAY_MS);
    return () => clearTimeout(timer);
    // `exclude` entra pela chave para não refazer a busca a cada render.
  }, [db, text, excludeKey, enoughText]);

  const visible = suggestions
    .filter(({ verse }) => !citedText.includes(`${verse.book_name} ${verse.chapter}:${verse.verse}`))
    .slice(0, 5);

  if (!enoughText) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
          <Text style={styles.title}>Versículos relacionados</Text>
        </View>
        <Text style={styles.hint}>
          Escreva um pouco sobre o que está sentindo ou aprendendo e sugerimos versículos que
          combinam com o seu texto.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
        <Text style={styles.title}>Versículos relacionados</Text>
        {loading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
      </View>

      {!loading && visible.length === 0 ? (
        <Text style={styles.hint}>
          Ainda não encontramos versículos para este texto. Tente contar um pouco mais.
        </Text>
      ) : null}

      {visible.map(({ verse, reason }) => (
        <Pressable key={verse.id} style={styles.card} onPress={() => onOpen(verse)}>
          <View style={styles.cardTop}>
            <Text style={styles.ref}>
              {verse.book_name} {verse.chapter}:{verse.verse}
            </Text>
            <Text style={styles.reason} numberOfLines={1}>
              {reason}
            </Text>
          </View>
          <Text style={styles.verseText} numberOfLines={3}>
            {verse.text}
          </Text>
          <View style={styles.actions}>
            <Pressable style={styles.action} onPress={() => onInsert(verse)} hitSlop={6}>
              <Ionicons name="add-circle-outline" size={17} color={colors.primary} />
              <Text style={styles.actionText}>Inserir na anotação</Text>
            </Pressable>
            <Pressable style={styles.action} onPress={() => onOpen(verse)} hitSlop={6}>
              <Ionicons name="book-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.actionText, styles.actionTextMuted]}>Ler</Text>
            </Pressable>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      marginTop: 20,
      paddingTop: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      gap: 10,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    title: {
      flex: 1,
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    hint: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 6,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    ref: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    reason: {
      flexShrink: 1,
      marginLeft: 'auto',
      fontSize: 11,
      fontWeight: '600',
      color: colors.primary,
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      overflow: 'hidden',
    },
    verseText: { fontSize: 14, lineHeight: 20, color: colors.textSecondary },
    actions: { flexDirection: 'row', gap: 18, marginTop: 4 },
    action: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    actionText: { fontSize: 13, fontWeight: '600', color: colors.primary },
    actionTextMuted: { color: colors.textSecondary },
  });
}
