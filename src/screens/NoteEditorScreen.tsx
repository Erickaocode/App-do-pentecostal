import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AppState,
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

/** Tempo sem digitar antes de salvar automaticamente. */
const AUTOSAVE_DELAY_MS = 800;

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

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
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  // Numa nota existente, só salva automaticamente depois de carregar o conteúdo,
  // para nunca gravar o formulário vazio por cima do que estava salvo.
  const [loaded, setLoaded] = useState(!noteId);
  const isEditing = !!noteId;

  // Id da nota no banco: começa com a nota aberta e é preenchido quando o
  // salvamento automático cria uma nota nova.
  const savedIdRef = useRef<number | null>(noteId ?? null);
  const createdHereRef = useRef(false);
  const deletedRef = useRef(false);
  const lastSavedRef = useRef<string | null>(null);
  const latestRef = useRef({ title, content, verseRef });
  latestRef.current = { title, content, verseRef };
  // Fila de gravações: impede que duas gravações seguidas criem notas duplicadas.
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback((): Promise<void> => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const run = async () => {
      if (deletedRef.current) return;
      const { title: t, content: c, verseRef: ref } = latestRef.current;
      if (!c.trim()) {
        // Nota criada automaticamente nesta tela e depois apagada: não deixa uma nota vazia.
        if (createdHereRef.current && savedIdRef.current) {
          await deleteNote(db, savedIdRef.current);
          savedIdRef.current = null;
          createdHereRef.current = false;
          lastSavedRef.current = null;
        }
        return;
      }
      const finalTitle =
        t.trim() || (ref ? `${ref.bookName} ${ref.chapter}:${ref.verse}` : 'Anotação');
      const snapshot = JSON.stringify([finalTitle, c]);
      if (snapshot === lastSavedRef.current) return;
      setSaveStatus('saving');
      try {
        if (savedIdRef.current) {
          await updateNote(db, savedIdRef.current, { title: finalTitle, content: c });
        } else {
          savedIdRef.current = await createNote(db, {
            title: finalTitle,
            content: c,
            verseRef: ref,
          });
          createdHereRef.current = true;
        }
        lastSavedRef.current = snapshot;
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      }
    };
    saveChainRef.current = saveChainRef.current.then(run).catch(() => setSaveStatus('error'));
    return saveChainRef.current;
  }, [db]);

  // Salva alguns instantes depois que a pessoa para de digitar.
  useEffect(() => {
    if (!loaded) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(persist, AUTOSAVE_DELAY_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [title, content, loaded, persist]);

  // Salva na hora se o app for para segundo plano ou se a pessoa sair da tela.
  useEffect(() => {
    if (!loaded) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') persist();
    });
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      persist();
    });
    return () => {
      subscription.remove();
      unsubscribe();
    };
  }, [loaded, navigation, persist]);

  useEffect(() => {
    if (noteId) {
      getNote(db, noteId).then((note) => {
        if (!note) return;
        lastSavedRef.current = JSON.stringify([note.title, note.content]);
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
        setLoaded(true);
      });
    }
  }, [db, noteId]);

  async function handleSave() {
    if (!content.trim()) {
      Alert.alert('Escreva algo', 'A anotação não pode ficar vazia.');
      return;
    }
    await persist();
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
          deletedRef.current = true;
          if (timerRef.current) clearTimeout(timerRef.current);
          await saveChainRef.current;
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

        <Text style={[styles.saveStatus, saveStatus === 'error' && styles.saveStatusError]}>
          {saveStatus === 'saving'
            ? 'Salvando...'
            : saveStatus === 'saved'
              ? 'Salvo automaticamente no aparelho'
              : saveStatus === 'error'
                ? 'Não foi possível salvar. Toque em Salvar para tentar de novo.'
                : ' '}
        </Text>

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
    saveStatus: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 16,
    },
    saveStatusError: {
      color: colors.danger,
    },
    saveButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    saveButtonText: {
      color: colors.surface,
      fontWeight: '700',
      fontSize: 16,
    },
  });
}
