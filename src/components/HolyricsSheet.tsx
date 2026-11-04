import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useUserDb } from '../db/UserDbProvider';
import {
  DEFAULT_HOLYRICS_PORT,
  HolyricsError,
  clearHolyricsConfig,
  holyrics,
  loadHolyricsConfig,
  normalizeHost,
  saveHolyricsConfig,
  type HolyricsConfig,
} from '../holyrics/client';
import type { ThemeColors } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Versículos citados na anotação, prontos para projetar. */
  verseRefs: string[];
  /** Trecho selecionado na anotação (vira o texto sugerido para projetar). */
  selectedText: string;
}

type Feedback = { kind: 'ok' | 'error'; message: string } | null;

/** Painel para projetar no Holyrics durante a pregação. */
export function HolyricsSheet({ visible, onClose, verseRefs, selectedText }: Props) {
  const db = useUserDb();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const [config, setConfig] = useState<HolyricsConfig | null>(null);
  const [editing, setEditing] = useState(false);
  const [host, setHost] = useState('');
  const [port, setPort] = useState(DEFAULT_HOLYRICS_PORT);
  const [token, setToken] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    if (!visible) return;
    setFeedback(null);
    setText(selectedText.trim());
    loadHolyricsConfig(db).then((c) => {
      setConfig(c);
      setEditing(!c);
      setHost(c?.host ?? '');
      setPort(c?.port ?? DEFAULT_HOLYRICS_PORT);
      setToken(c?.token ?? '');
    });
  }, [visible, db, selectedText]);

  async function run(key: string, action: () => Promise<unknown>, success: string) {
    setBusy(key);
    setFeedback(null);
    try {
      await action();
      setFeedback({ kind: 'ok', message: success });
    } catch (e) {
      setFeedback({
        kind: 'error',
        message: e instanceof HolyricsError ? e.message : 'Algo deu errado ao falar com o Holyrics.',
      });
    } finally {
      setBusy(null);
    }
  }

  async function handleConnect() {
    const next: HolyricsConfig = {
      host: normalizeHost(host),
      port: port.trim() || DEFAULT_HOLYRICS_PORT,
      token: token.trim(),
    };
    if (!next.host || !next.token) {
      setFeedback({ kind: 'error', message: 'Preencha o IP do computador e o token.' });
      return;
    }
    await run(
      'connect',
      async () => {
        await holyrics.test(next);
        await saveHolyricsConfig(db, next);
        setConfig(next);
        setEditing(false);
      },
      'Conectado ao Holyrics!'
    );
  }

  async function handleForget() {
    await clearHolyricsConfig(db);
    setConfig(null);
    setEditing(true);
    setToken('');
    setFeedback(null);
  }

  const c = config;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable
            style={[styles.sheet, { paddingBottom: 24 + insets.bottom }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.header}>
              <Ionicons name="tv-outline" size={20} color={colors.primary} />
              <Text style={styles.title}>Holyrics</Text>
              {c && !editing ? (
                <Pressable onPress={() => setEditing(true)} hitSlop={10}>
                  <Text style={styles.link}>Configurar</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Fechar">
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
              {editing || !c ? (
                <>
                  <Text style={styles.help}>
                    No Holyrics, abra Arquivo › Configurações › API Server, ative o servidor e crie um
                    token (em “gerenciar permissões”). O celular precisa estar no mesmo Wi-Fi do
                    computador.
                  </Text>
                  <Text style={styles.fieldLabel}>IP do computador</Text>
                  <TextInput
                    style={styles.input}
                    value={host}
                    onChangeText={setHost}
                    placeholder="ex: 192.168.0.10"
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                  />
                  <Text style={styles.fieldLabel}>Porta</Text>
                  <TextInput
                    style={styles.input}
                    value={port}
                    onChangeText={setPort}
                    placeholder={DEFAULT_HOLYRICS_PORT}
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                  />
                  <Text style={styles.fieldLabel}>Token</Text>
                  <TextInput
                    style={styles.input}
                    value={token}
                    onChangeText={setToken}
                    placeholder="token do API Server"
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry
                  />
                  <Pressable style={styles.primaryButton} onPress={handleConnect} disabled={!!busy}>
                    {busy === 'connect' ? (
                      <ActivityIndicator color={colors.surface} />
                    ) : (
                      <Text style={styles.primaryButtonText}>Testar e conectar</Text>
                    )}
                  </Pressable>
                  {c ? (
                    <View style={styles.rowBetween}>
                      <Pressable onPress={() => setEditing(false)} hitSlop={8}>
                        <Text style={styles.link}>Voltar</Text>
                      </Pressable>
                      <Pressable onPress={handleForget} hitSlop={8}>
                        <Text style={[styles.link, { color: colors.danger }]}>Desconectar</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </>
              ) : (
                <>
                  <Text style={styles.connected}>
                    Conectado a {c.host}:{c.port}
                  </Text>

                  <View style={styles.controls}>
                    <ControlButton
                      icon="play-back"
                      label="Voltar"
                      loading={busy === 'prev'}
                      onPress={() => run('prev', () => holyrics.previous(c), 'Slide anterior')}
                      styles={styles}
                      colors={colors}
                    />
                    <ControlButton
                      icon="play-forward"
                      label="Avançar"
                      loading={busy === 'next'}
                      onPress={() => run('next', () => holyrics.next(c), 'Próximo slide')}
                      styles={styles}
                      colors={colors}
                    />
                    <ControlButton
                      icon="close-circle-outline"
                      label="Fechar"
                      loading={busy === 'close'}
                      onPress={() => run('close', () => holyrics.close(c), 'Apresentação fechada')}
                      styles={styles}
                      colors={colors}
                    />
                  </View>

                  <Text style={styles.sectionTitle}>Versículos da anotação</Text>
                  {verseRefs.length === 0 ? (
                    <Text style={styles.help}>
                      Nenhum versículo citado ainda. Insira versículos pelas sugestões abaixo da
                      anotação para projetá-los daqui.
                    </Text>
                  ) : (
                    verseRefs.map((ref) => (
                      <Pressable
                        key={ref}
                        style={styles.verseRow}
                        onPress={() => run(`v:${ref}`, () => holyrics.showVerse(c, ref), `${ref} no telão`)}
                      >
                        <Ionicons name="book-outline" size={18} color={colors.primary} />
                        <Text style={styles.verseText}>{ref}</Text>
                        {busy === `v:${ref}` ? (
                          <ActivityIndicator color={colors.primary} />
                        ) : (
                          <Text style={styles.link}>Projetar</Text>
                        )}
                      </Pressable>
                    ))
                  )}

                  <Text style={styles.sectionTitle}>Projetar um texto</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={text}
                    onChangeText={setText}
                    placeholder="Digite ou selecione um trecho da anotação antes de abrir"
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    textAlignVertical="top"
                  />
                  <Pressable
                    style={[styles.primaryButton, !text.trim() && styles.disabled]}
                    disabled={!text.trim() || !!busy}
                    onPress={() => run('text', () => holyrics.showText(c, text.trim()), 'Texto no telão')}
                  >
                    {busy === 'text' ? (
                      <ActivityIndicator color={colors.surface} />
                    ) : (
                      <Text style={styles.primaryButtonText}>Projetar texto</Text>
                    )}
                  </Pressable>
                </>
              )}

              {feedback ? (
                <Text style={[styles.feedback, feedback.kind === 'error' && { color: colors.danger }]}>
                  {feedback.message}
                </Text>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ControlButton({
  icon,
  label,
  loading,
  onPress,
  styles,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  loading: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  return (
    <Pressable style={styles.controlButton} onPress={onPress} accessibilityLabel={label}>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <Ionicons name={icon} size={24} color={colors.primary} />
      )}
      <Text style={styles.controlLabel}>{label}</Text>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1 },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 16,
      maxHeight: '88%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    title: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary },
    body: { paddingHorizontal: 20, paddingBottom: 8 },
    help: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginBottom: 8 },
    fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginTop: 10, marginBottom: 4 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.textPrimary,
      backgroundColor: colors.background,
    },
    textArea: { minHeight: 90 },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
      marginTop: 14,
    },
    primaryButtonText: { color: colors.surface, fontWeight: '700', fontSize: 15 },
    disabled: { opacity: 0.5 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
    link: { color: colors.primary, fontWeight: '700', fontSize: 14 },
    connected: { fontSize: 12, color: colors.textSecondary, marginBottom: 12 },
    controls: { flexDirection: 'row', gap: 10 },
    controlButton: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.surfaceAlt,
    },
    controlLabel: { fontSize: 12, fontWeight: '600', color: colors.textPrimary },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
      marginTop: 18,
      marginBottom: 8,
    },
    verseRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    verseText: { flex: 1, fontSize: 15, color: colors.textPrimary },
    feedback: { marginTop: 14, fontSize: 13, fontWeight: '600', color: colors.primary },
  });
}
