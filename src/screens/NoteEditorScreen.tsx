import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { HolyricsSheet } from '../components/HolyricsSheet';
import RichNoteEditor, { type RichNoteEditorRef } from '../components/RichNoteEditor';
import { SermonTimerPanel } from '../components/SermonTimerPanel';
import { findVerseReferences } from '../holyrics/client';
import { VerseSuggestions } from '../components/VerseSuggestions';
import type { VerseWithBook } from '../db/bibleQueries';
import { useUserDb } from '../db/UserDbProvider';
import { createNote, deleteNote, getNote, updateNote } from '../db/userQueries';
import type { NotesStackParamList } from '../navigation/types';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors } from '../theme';
import type { Note, VerseRef } from '../types';
import { confirmAction, showMessage } from '../utils/dialogs';
import { escapeHtml, noteToPlainText, toNoteHtml } from '../utils/noteFormat';

type Props = NativeStackScreenProps<NotesStackParamList, 'NoteEditor'>;

/** Tempo sem digitar antes de salvar automaticamente. */
const AUTOSAVE_DELAY_MS = 800;

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/** Marca as linhas de versículos inseridos pelas sugestões: "João 3:16 — “Porque Deus...”". */
const CITATION_SEPARATOR = ' — “';

/** As sugestões olham o que a pessoa escreveu, não o texto dos versículos que ela já inseriu. */
function withoutCitations(content: string): string {
  return content
    .split('\n')
    .filter((line) => !line.includes(CITATION_SEPARATOR))
    .join('\n');
}

export function NoteEditorScreen({ route, navigation }: Props) {
  const { noteId, prefill } = route.params ?? {};
  const db = useUserDb();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const headerHeight = useHeaderHeight();
  const [title, setTitle] = useState('');
  // HTML da anotação e o mesmo conteúdo em texto puro (para sugestões, Holyrics e validação).
  const [content, setContent] = useState('');
  const [plain, setPlain] = useState('');
  const [initialHtml, setInitialHtml] = useState('');
  const editorRef = useRef<RichNoteEditorRef>(null);
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
  const [holyricsOpen, setHolyricsOpen] = useState(false);
  const [editorFocused, setEditorFocused] = useState(false);
  const [selectedText, setSelectedText] = useState('');
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
  const latestRef = useRef({ title, content, plain, verseRef });
  latestRef.current = { title, content, plain, verseRef };
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
      const { title: t, content: c, plain: p, verseRef: ref } = latestRef.current;
      if (!p.trim()) {
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
        setPlain(noteToPlainText(note.content));
        setInitialHtml(toNoteHtml(note.content));
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
    if (!plain.trim()) {
      showMessage('Escreva algo', 'A anotação não pode ficar vazia.');
      return;
    }
    await persist();
    navigation.goBack();
  }

  function handleInsertVerse(verse: VerseWithBook) {
    const citation = `${verse.book_name} ${verse.chapter}:${verse.verse}${CITATION_SEPARATOR}${verse.text}”`;
    editorRef.current?.run('appendHtml', `<div>${escapeHtml(citation)}</div>`);
  }

  function handleOpenVerse(verse: VerseWithBook) {
    // A anotação continua aberta nesta aba (e salva sozinha); a pessoa volta para ela depois.
    navigation.getParent<any>()?.navigate('BibliaTab', {
      screen: 'Reading',
      params: {
        bookAbbrev: verse.book_abbrev,
        bookName: verse.book_name,
        chapter: verse.chapter,
        focusVerse: verse.verse,
      },
      initial: false,
    });
  }

  async function handleDelete() {
    if (!noteId) return;
    const confirmed = await confirmAction({
      title: 'Excluir anotação',
      message: 'Tem certeza que deseja excluir esta anotação?',
      confirmText: 'Excluir',
    });
    if (!confirmed) return;
    deletedRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    await saveChainRef.current;
    await deleteNote(db, noteId);
    navigation.goBack();
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEditing ? 'Editar anotação' : 'Nova anotação',
      headerRight: () => (
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setHolyricsOpen(true)}
            hitSlop={10}
            accessibilityLabel="Projetar no Holyrics"
          >
            <Ionicons name="tv-outline" size={22} color={colors.primary} />
          </Pressable>
          {isEditing ? (
            <Pressable onPress={handleDelete} hitSlop={10} accessibilityLabel="Excluir anotação">
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </Pressable>
          ) : null}
        </View>
      ),
    });
  }, [navigation, isEditing, existingNote, colors, styles]);

  const holyricsVerseRefs = useMemo(
    () =>
      findVerseReferences(
        plain,
        verseRef ? `${verseRef.bookName} ${verseRef.chapter}:${verseRef.verse}` : null
      ),
    [plain, verseRef]
  );

  const editorColors = useMemo(
    () => ({
      text: colors.textPrimary,
      secondary: colors.textSecondary,
      primary: colors.primary,
      surface: colors.surface,
      border: colors.border,
      background: colors.background,
    }),
    [colors]
  );

  const handleEditorChange = useCallback((html: string, text: string) => {
    setContent(html);
    setPlain(text);
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={headerHeight}
    >
      <SermonTimerPanel />
      <View style={styles.header}>
        {verseRef ? (
          <View style={styles.verseBanner}>
            <Text style={styles.verseBannerRef}>
              {verseRef.bookName} {verseRef.chapter}:{verseRef.verse}
            </Text>
            <Text style={styles.verseBannerText} numberOfLines={3}>
              {verseRef.text}
            </Text>
          </View>
        ) : null}

        <TextInput
          style={styles.titleInput}
          placeholder="Título"
          placeholderTextColor={colors.textSecondary}
          value={title}
          onChangeText={setTitle}
          returnKeyType="next"
          onSubmitEditing={() => editorRef.current?.run('focus', null)}
        />
      </View>

      <View style={styles.editorBox}>
        <RichNoteEditor
          ref={editorRef}
          docKey={loaded ? 'ready' : 'loading'}
          initialHtml={initialHtml}
          placeholder="Escreva sua anotação..."
          colors={editorColors}
          onChange={handleEditorChange}
          onFocusChange={setEditorFocused}
          onSelectText={setSelectedText}
          dom={{
            style: { flex: 1, backgroundColor: colors.background },
            containerStyle: { flex: 1 },
            hideKeyboardAccessoryView: true,
            keyboardDisplayRequiresUserAction: false,
          }}
        />
      </View>

      {!editorFocused ? (
        <ScrollView
          style={styles.footer}
          contentContainerStyle={styles.footerContent}
          keyboardShouldPersistTaps="handled"
        >
          <VerseSuggestions
            text={[verseRef?.text, title, withoutCitations(plain)].filter(Boolean).join('\n')}
            exclude={verseRef ?? undefined}
            citedText={plain}
            onInsert={handleInsertVerse}
            onOpen={handleOpenVerse}
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
      ) : null}

      <HolyricsSheet
        visible={holyricsOpen}
        onClose={() => setHolyricsOpen(false)}
        verseRefs={holyricsVerseRefs}
        selectedText={selectedText}
      />
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    header: { paddingHorizontal: 16, paddingTop: 12 },
    editorBox: { flex: 1, minHeight: 160 },
    footer: {
      flexGrow: 0,
      maxHeight: '45%',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    footerContent: { padding: 16, paddingTop: 8 },
    verseBanner: {
      backgroundColor: colors.surface,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
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
      marginBottom: 8,
    },
    saveStatus: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 8,
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
