import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  hasCloudConsent,
  loadAiEngine,
  loadAiMode,
  loadStyleEnabled,
  saveAiMode,
  saveCloudConsent,
  saveStyleEnabled,
  type AiEngine,
  type AiMode,
} from '../ai/engine';
import { loadOllamaConfig, type OllamaConfig } from '../ai/ollama';
import { AiSettings } from '../components/AiSettings';
import { AssistantSheet } from '../components/AssistantSheet';
import { HolyricsSheet } from '../components/HolyricsSheet';
import { NoteFormatToolbar } from '../components/NoteFormatToolbar';
import RichNoteEditor, {
  type EditorCommand,
  type EditorFormats,
  type RichNoteEditorRef,
} from '../components/RichNoteEditor';
import { SermonOutlinePanel } from '../components/SermonOutlinePanel';
import { SermonTimerPanel } from '../components/SermonTimerPanel';
import { findVerseReferences } from '../holyrics/client';
import { VerseSuggestions } from '../components/VerseSuggestions';
import type { VerseWithBook } from '../db/bibleQueries';
import { useUserDb } from '../db/UserDbProvider';
import { useKeyboardInset } from '../hooks/useKeyboardInset';
import { createNote, deleteNote, getNote, listNotes, updateNote } from '../db/userQueries';
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
  const containerRef = useRef<View>(null);
  const { inset: keyboardInset, keyboardVisible } = useKeyboardInset(containerRef);
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
  const [formatPanelOpen, setFormatPanelOpen] = useState(false);
  // Teclado aberto por um campo da própria gaveta (esboço, endereço do Ollama): aí a gaveta
  // fica, senão o campo some e leva o teclado junto.
  const [sheetTyping, setSheetTyping] = useState(false);
  const noteKeyboard = keyboardVisible && !sheetTyping;
  // Digitando na gaveta: ela ocupa a tela toda, senão o teclado cobre o campo.
  const sheetExpanded = keyboardVisible && sheetTyping;
  // Só para quando o teclado fecha ou a pessoa volta para o título/anotação. Desligar no
  // blur fazia a gaveta piscar no meio da animação do teclado.
  useEffect(() => {
    if (!keyboardVisible || editorFocused) setSheetTyping(false);
  }, [keyboardVisible, editorFocused]);
  const [selectedText, setSelectedText] = useState('');
  const [formats, setFormats] = useState<EditorFormats | null>(null);
  const [suggestSignal, setSuggestSignal] = useState(0);
  // Assistente começa recolhido: a tela fica livre para escrever.
  const [assistantOpen, setAssistantOpen] = useState(false);
  // No celular a gaveta aberta ocupa a tela toda e não some com o teclado: espremida, o
  // teclado cobria os campos dela. No tablet sobra espaço e ela divide a tela com a anotação.
  const { width, height } = useWindowDimensions();
  const isPhone = Math.min(width, height) < 600;
  const phoneSheet = isPhone && assistantOpen;
  const sheetFullScreen = phoneSheet || sheetExpanded;
  const [assistantTab, setAssistantTab] = useState('verses');
  const [ollama, setOllama] = useState<OllamaConfig | null>(null);
  const [aiMode, setAiMode] = useState<AiMode>('off');
  const [aiEngine, setAiEngine] = useState<AiEngine | null>(null);
  const [styleEnabled, setStyleEnabled] = useState(false);

  useEffect(() => {
    loadStyleEnabled(db).then(setStyleEnabled).catch(() => {});
  }, [db]);

  function handleStyleChange(enabled: boolean) {
    setStyleEnabled(enabled);
    saveStyleEnabled(db, enabled).catch(() => {});
  }

  /** Trechos das 3 anotações mais longas entre as 20 mais recentes (menos a que está aberta). */
  const loadStyleSamples = useCallback(async (): Promise<string> => {
    const notes = await listNotes(db);
    return notes
      .filter((n) => n.id !== savedIdRef.current)
      .slice(0, 20)
      .map((n) => ({ title: n.title, text: withoutCitations(noteToPlainText(n.content)).trim() }))
      .filter((n) => n.text.length >= 200)
      .sort((a, b) => b.text.length - a.text.length)
      .slice(0, 3)
      .map((n) => `### ${n.title}\n${n.text.slice(0, 700)}`)
      .join('\n\n');
  }, [db]);

  const reloadAi = useCallback(async () => {
    try {
      const [mode, config, engine] = await Promise.all([
        loadAiMode(db),
        loadOllamaConfig(db),
        loadAiEngine(db),
      ]);
      setAiMode(mode);
      setOllama(config);
      setAiEngine(engine);
    } catch {
      setAiEngine(null);
    }
  }, [db]);

  useEffect(() => {
    reloadAi();
  }, [reloadAi]);

  async function handleAiModeChange(mode: AiMode) {
    await saveAiMode(db, mode);
    await reloadAi();
  }

  async function handleOllamaChange() {
    await reloadAi();
  }

  /**
   * Motor da IA na hora de usar. Na nuvem, a primeira vez pede o aceite da pessoa
   * (o texto sai do aparelho); se ela não aceitar, fica no modo básico.
   */
  const prepareAi = useCallback(async (): Promise<AiEngine | null> => {
    if (!aiEngine || aiEngine.kind !== 'cloud') return aiEngine;
    if (await hasCloudConsent(db)) return aiEngine;
    const accepted = await confirmAction({
      title: 'Usar o EKS AI?',
      message:
        'Para gerar a resposta, o título e o texto desta anotação são enviados ao Google Gemini, a IA por trás do EKS AI. ' +
        'O app não guarda esse envio, mas o Google trata o texto conforme a política dele. ' +
        'Evite dados pessoais sensíveis. Se preferir, use o modo básico ou o Ollama na aba IA.',
      confirmText: 'Usar o EKS AI',
    });
    if (!accepted) return null;
    await saveCloudConsent(db);
    return aiEngine;
  }, [aiEngine, db]);
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

  // Botão do topo: tira o teclado da frente e abre o assistente.
  function handleSuggestFromHeader() {
    editorRef.current?.run('blur', null);
    Keyboard.dismiss();
    setAssistantOpen(true);
    if (assistantTab === 'verses') setSuggestSignal((n) => n + 1);
  }

  function handleInsertHtml(html: string) {
    editorRef.current?.run('appendHtml', html);
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
            onPress={handleSuggestFromHeader}
            hitSlop={10}
            accessibilityLabel="Sugerir versículos"
          >
            <Ionicons name="sparkles-outline" size={22} color={colors.primary} />
          </Pressable>
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
  }, [navigation, isEditing, existingNote, colors, styles, assistantTab]);

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

  const handleCommand = useCallback((type: EditorCommand['type'], value?: string | null) => {
    editorRef.current?.run(type, value ?? null);
  }, []);

  return (
    <View ref={containerRef} style={[styles.container, { paddingBottom: keyboardInset }]}>
      <SermonTimerPanel />
      <View style={[styles.header, sheetFullScreen && styles.gone]}>
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
          onFocus={() => setSheetTyping(false)}
        />
      </View>

      <View style={[styles.editorBox, sheetFullScreen && styles.gone]}>
        <RichNoteEditor
          ref={editorRef}
          docKey={loaded ? 'ready' : 'loading'}
          initialHtml={initialHtml}
          placeholder="Escreva sua anotação..."
          colors={editorColors}
          onChange={handleEditorChange}
          onFocusChange={setEditorFocused}
          onSelectText={setSelectedText}
          onFormats={setFormats}
          dom={{
            style: { flex: 1, backgroundColor: colors.background },
            containerStyle: { flex: 1 },
            hideKeyboardAccessoryView: true,
          }}
        />
      </View>

      {/* Assistente em gaveta: arrasta para baixo e ele vira uma barrinha. Com o teclado
          aberto some de vez. Fica montado (só escondido) para não perder o que já gerou. */}
      <AssistantSheet
        open={assistantOpen}
        onOpenChange={setAssistantOpen}
        activeTab={assistantTab}
        onTabChange={setAssistantTab}
        hidden={!phoneSheet && (editorFocused || noteKeyboard || formatPanelOpen)}
        expanded={sheetFullScreen}
        scrollSignal={suggestSignal}
        status={
          saveStatus === 'saving'
            ? 'Salvando...'
            : saveStatus === 'saved'
              ? 'Salvo'
              : saveStatus === 'error'
                ? 'Erro ao salvar'
                : undefined
        }
        tabs={[
          {
            key: 'verses',
            label: 'Versículos',
            icon: 'book-outline',
            content: (
              <>
                <VerseSuggestions
                  text={[verseRef?.text, title, withoutCitations(plain)].filter(Boolean).join('\n')}
                  exclude={verseRef ?? undefined}
                  citedText={plain}
                  onInsert={handleInsertVerse}
                  onOpen={handleOpenVerse}
                  suggestSignal={suggestSignal}
                  prepareAi={prepareAi}
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
              </>
            ),
          },
          {
            key: 'outline',
            label: 'Esboço',
            icon: 'list-outline',
            content: (
              <SermonOutlinePanel
                noteTitle={title}
                noteText={withoutCitations(plain)}
                engine={aiEngine}
                prepareAi={prepareAi}
                styleEnabled={styleEnabled}
                onStyleChange={handleStyleChange}
                loadStyleSamples={loadStyleSamples}
                onInsertHtml={handleInsertHtml}
                onOpenSettings={() => setAssistantTab('ai')}
                onTypingChange={setSheetTyping}
              />
            ),
          },
          {
            key: 'ai',
            label: 'IA',
            icon: 'settings-outline',
            content: (
              <AiSettings
                mode={aiMode}
                onModeChange={handleAiModeChange}
                ollama={ollama}
                onOllamaChange={handleOllamaChange}
                onTypingChange={setSheetTyping}
                active={assistantOpen && assistantTab === 'ai'}
              />
            ),
          },
        ]}
      />

      {/* Com a gaveta em tela cheia no celular, a barra de formatação só ocupa espaço. */}
      <View style={phoneSheet && styles.gone}>
        <NoteFormatToolbar
          formats={formats}
          editorFocused={!phoneSheet && (editorFocused || noteKeyboard)}
          onCommand={handleCommand}
          onPanelChange={setFormatPanelOpen}
        />
      </View>

      <HolyricsSheet
        visible={holyricsOpen}
        onClose={() => setHolyricsOpen(false)}
        verseRefs={holyricsVerseRefs}
        selectedText={selectedText}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    header: { paddingHorizontal: 16, paddingTop: 12 },
    editorBox: { flex: 1, minHeight: 160 },
    gone: { display: 'none' },
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
