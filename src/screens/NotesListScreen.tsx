import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useUserDb } from '../db/UserDbProvider';
import { listNotes } from '../db/userQueries';
import type { NotesStackParamList } from '../navigation/types';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors } from '../theme';
import type { Note } from '../types';

type Props = NativeStackScreenProps<NotesStackParamList, 'NotesList'>;

export function NotesListScreen({ navigation }: Props) {
  const db = useUserDb();
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState('');
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const reload = useCallback(
    (q?: string) => {
      listNotes(db, q ?? search).then(setNotes);
    },
    [db, search]
  );

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  function handleSearch(value: string) {
    setSearch(value);
    reload(value);
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Buscar anotações..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={handleSearch}
        />
        <Pressable
          style={styles.addButton}
          onPress={() => navigation.navigate('NoteEditor', {})}
        >
          <Ionicons name="add" size={24} color={colors.surface} />
        </Pressable>
      </View>

      {notes.length === 0 ? (
        <Text style={styles.empty}>
          Nenhuma anotação ainda. Toque em "+" para criar a primeira, ou anote direto a partir de
          um versículo na aba Bíblia.
        </Text>
      ) : null}

      <FlatList
        data={notes}
        keyExtractor={(n) => String(n.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            style={styles.noteCard}
            onPress={() => navigation.navigate('NoteEditor', { noteId: item.id })}
          >
            <Text style={styles.noteTitle} numberOfLines={1}>
              {item.title || 'Sem título'}
            </Text>
            {item.book_name ? (
              <Text style={styles.noteRef}>
                {item.book_name} {item.chapter}:{item.verse}
              </Text>
            ) : null}
            <Text style={styles.noteContent} numberOfLines={2}>
              {item.content}
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
    searchRow: {
      flexDirection: 'row',
      gap: 10,
      padding: 16,
      alignItems: 'center',
    },
    input: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.textPrimary,
    },
    addButton: {
      backgroundColor: colors.primary,
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    empty: {
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: 32,
      marginTop: 12,
      lineHeight: 20,
    },
    listContent: { padding: 16, paddingTop: 0, gap: 10 },
    noteCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 10,
    },
    noteTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    noteRef: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
      marginBottom: 4,
    },
    noteContent: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 19,
    },
  });
}
