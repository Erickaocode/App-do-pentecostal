import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useUserDb } from '../db/UserDbProvider';
import { createNote, deleteNote, getNote, updateNote } from '../db/userQueries';
import type { NotesStackParamList } from '../navigation/types';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors } from '../theme';
import type { Note, VerseRef } from '../types';

type Props = NativeStackScreenProps<NotesStackParamList, 'NoteEditor'>;

export function NoteEditorScreen({ route, navigation }: Props) {
  const { noteId, prefill } = route.params ?? {};
  const db = useUserDb();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const headerHeight = useHeaderHeight();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [verseRef, setVerseRef] = useState<VerseRef | null>(
    prefill
      ? {
          bookAbbrev: prefill.bookAbbrev,
          bookName: prefill.bookName,
          chapter: prefill.chapter,
          verse: prefill.verse,
          text: prefill.text,
        }
      : null
  );
  const [existingNote, setExistingNote] = useState<Note | null>(null);
  const isEditing = !!noteId;

  useEffect(() => {
    if (noteId) {
      getNote(db, noteId).then((note) => {
        if (!note) return;
        setExistingNote(note);
        setTitle(note.title);
        setContent(note.content);
        if (note.book_abbrev && note.book_name && note.chapter && note.verse) {
          setVerseRef({
            bookAbbrev: note.book_abbrev,
            bookName: note.book_name,
            chapter: note.chapter,
            verse: note.verse,
            text: note.verse_text ?? '',
          });
        }
      });
    }
  }, [db, noteId]);

  async function handleSave() {
    const finalTitle = title.trim() || (verseRef ? `${verseRef.bookName} ${verseRef.chapter}:${verseRef.verse}` : 'Anotação');
    if (!content.trim()) {
      Alert.alert('Escreva algo', 'A anotação não pode ficar vazia.');
      return;
    }
    if (isEditing && noteId) {
      await updateNote(db, noteId, { title: finalTitle, content });
    } else {
      await createNote(db, { title: finalTitle, content, verseRef });
    }
    navigation.goBack();
  }

  function handleDelete() {
    if (!noteId) return;
    Alert.alert('Excluir anotação', 'Tem certeza que deseja excluir esta anotação?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await deleteNote(db, noteId);
          navigation.goBack();
        },
      },
    ]);
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEditing ? 'Editar anotação' : 'Nova anotação',
      headerRight: () =>
        isEditing ? (
          <Pressable onPress={handleDelete} hitSlop={10}>
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </Pressable>
        ) : null,
    });
  }, [navigation, isEditing, existingNote, colors]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {verseRef ? (
          <View style={styles.verseBanner}>
            <Text style={styles.verseBannerRef}>
              {verseRef.bookName} {verseRef.chapter}:{verseRef.verse}
            </Text>
            <Text style={styles.verseBannerText}>{verseRef.text}</Text>
          </View>
        ) : null}

        <TextInput
          style={styles.titleInput}
          placeholder="Título"
          placeholderTextColor={colors.textSecondary}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={styles.contentInput}
          placeholder="Escreva sua anotação..."
          placeholderTextColor={colors.textSecondary}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
        />

        <Pressable style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Salvar</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
    verseBanner: {
      backgroundColor: colors.surface,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
    },
    verseBannerRef: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
      marginBottom: 4,
    },
    verseBannerText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    titleInput: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingVertical: 10,
      marginBottom: 12,
    },
    contentInput: {
      fontSize: 15,
      color: colors.textPrimary,
      minHeight: 220,
      lineHeight: 22,
    },
    saveButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 24,
    },
    saveButtonText: {
      color: colors.surface,
      fontWeight: '700',
      fontSize: 16,
    },
  });
}
