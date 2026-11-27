import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { engineLabel, type AiEngine } from '../ai/engine';
import { generateOutline, outlineToHtml, verseLabel, type SermonOutline } from '../ai/outline';
import { useBibleDb } from '../context/BibleContext';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors } from '../theme';

interface Props {
  /** Título da anotação: vira o tema do esboço se a pessoa não digitar outro. */
  noteTitle: string;
  /** O que já está escrito, para a IA seguir a mesma linha. */
  noteText: string;
  engine: AiEngine | null;
  /** Motor na hora do uso (pode pedir o aceite da pessoa) ou null. */
  prepareAi: () => Promise<AiEngine | null>;
  onInsertHtml: (html: string) => void;
  onOpenSettings: () => void;
  /** "Escrever no meu estilo": liga/desliga e busca os trechos das anotações antigas. */
  styleEnabled: boolean;
  onStyleChange: (enabled: boolean) => void;
  loadStyleSamples: () => Promise<string>;
  /** Avisa quando um campo do painel está com o teclado aberto. */
  onTypingChange?: (typing: boolean) => void;
}

/** "Me dá um esboço": a pessoa escreve o tema e recebe a pregação estruturada com versículos. */
export function SermonOutlinePanel({
  noteTitle,
  noteText,
  engine,
  prepareAi,
  onInsertHtml,
  onOpenSettings,
  styleEnabled,
  onStyleChange,
  loadStyleSamples,
  onTypingChange,
}: Props) {
  const db = useBibleDb();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [topic, setTopic] = useState('');
  const [baseText, setBaseText] = useState('');
  const [loading, setLoading] = useState(false);
  const [outline, setOutline] = useState<SermonOutline | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [inserted, setInserted] = useState(false);
  const request = useRef(0);

  const effectiveTopic = topic.trim() || noteTitle.trim();

  async function handleGenerate() {
    if (!effectiveTopic || loading) return;
    Keyboard.dismiss();
    const current = ++request.current;
    setLoading(true);
    setWarning(null);
    setInserted(false);
    try {
      const ready = await prepareAi();
      if (current !== request.current) return;
      const style = ready && styleEnabled ? await loadStyleSamples().catch(() => '') : '';
      const result = await generateOutline(
        db,
        { title: effectiveTopic, baseText: baseText.trim() || undefined, notes: noteText, style },
        ready
      );
      if (current !== request.current) return;
      setOutline(result.outline);
      setWarning(result.warning ?? null);
    } catch {
      if (current === request.current) setWarning('Não foi possível montar o esboço. Tente outro tema.');
    } finally {
      if (current === request.current) setLoading(false);
    }
  }

  function handleInsert() {
    if (!outline) return;
    onInsertHtml(outlineToHtml(outline));
    setInserted(true);
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={onOpenSettings} style={styles.mode}>
        <Ionicons
          name={engine ? 'sparkles' : 'cloud-offline-outline'}
          size={14}
          color={engine ? colors.primary : colors.textSecondary}
        />
        <Text style={[styles.modeText, !!engine && styles.modeTextOn]} numberOfLines={2}>
          {engine
            ? `IA ativa: ${engineLabel(engine)}`
            : 'Modo básico (sem IA). Toque para ligar a IA e ter esboços completos.'}
        </Text>
      </Pressable>

      <Text style={styles.label}>Tema ou título da pregação</Text>
      <TextInput
        style={styles.input}
        value={topic}
        onChangeText={setTopic}
        placeholder={noteTitle.trim() || 'Ex.: A fé que vence gigantes'}
        placeholderTextColor={colors.textSecondary}
        returnKeyType="done"
        onSubmitEditing={handleGenerate}
        onFocus={() => onTypingChange?.(true)}
        onBlur={() => onTypingChange?.(false)}
      />
      <Text style={styles.label}>Texto base (opcional)</Text>
      <TextInput
        style={styles.input}
        value={baseText}
        onChangeText={setBaseText}
        placeholder="Ex.: 1 Samuel 17:45"
        placeholderTextColor={colors.textSecondary}
        returnKeyType="done"
        onSubmitEditing={handleGenerate}
        onFocus={() => onTypingChange?.(true)}
        onBlur={() => onTypingChange?.(false)}
      />

      {engine ? (
        <Pressable
          onPress={() => onStyleChange(!styleEnabled)}
          style={styles.styleRow}
          accessibilityRole="switch"
          accessibilityState={{ checked: styleEnabled }}
        >
          <Ionicons
            name={styleEnabled ? 'checkbox' : 'square-outline'}
            size={20}
            color={colors.primary}
          />
          <View style={styles.styleText}>
            <Text style={styles.styleTitle}>Escrever no meu estilo</Text>
            <Text style={styles.hint}>
              O EKS AI lê trechos das suas 3 anotações mais longas e recentes para pregar do seu jeito.
            </Text>
          </View>
        </Pressable>
      ) : null}

      <Pressable
        style={({ pressed }) => [
          styles.generate,
          (!effectiveTopic || loading) && styles.disabled,
          pressed && styles.pressed,
        ]}
        onPress={handleGenerate}
        disabled={!effectiveTopic || loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.surface} />
        ) : (
          <Ionicons name={outline ? 'refresh' : 'sparkles'} size={17} color={colors.surface} />
        )}
        <Text style={styles.generateText}>
          {loading ? (engine ? 'A IA está escrevendo...' : 'Montando...') : outline ? 'Gerar outro' : 'Gerar esboço'}
        </Text>
      </Pressable>
      {loading && engine?.kind === 'ollama' ? (
        <Text style={styles.hint}>No computador, a IA pode levar até um minuto.</Text>
      ) : null}

      {warning ? <Text style={styles.warning}>{warning}</Text> : null}

      {outline && !loading ? (
        <View style={styles.preview}>
          <Text style={styles.previewTitle}>{outline.title}</Text>
          {outline.baseVerse ? (
            <Text style={styles.base}>
              Texto base: {verseLabel(outline.baseVerse)} — “{outline.baseVerse.text}”
            </Text>
          ) : null}
          <Section title="Introdução" text={outline.introduction} styles={styles} />
          {outline.points.map((point, i) => (
            <View key={i} style={styles.section}>
              <Text style={styles.sectionTitle}>
                {i + 1}. {point.title}
              </Text>
              {point.explanation ? <Text style={styles.body}>{point.explanation}</Text> : null}
              {point.verses.map((v) => (
                <Text key={v.id} style={styles.verse}>
                  <Text style={styles.verseRef}>{verseLabel(v)}</Text> — {v.text}
                </Text>
              ))}
            </View>
          ))}
          <Section title="Aplicação" text={outline.application} styles={styles} />
          <Section title="Conclusão" text={outline.conclusion} styles={styles} />

          <Pressable
            style={({ pressed }) => [styles.insert, pressed && styles.pressed]}
            onPress={handleInsert}
          >
            <Ionicons
              name={inserted ? 'checkmark-circle' : 'add-circle-outline'}
              size={18}
              color={colors.primary}
            />
            <Text style={styles.insertText}>
              {inserted ? 'Inserido na anotação' : 'Inserir esboço na anotação'}
            </Text>
          </Pressable>
          {outline.source === 'offline' ? (
            <Text style={styles.hint}>
              Esboço básico: um ponto de partida. Com a IA ligada, ela escreve explicações
              próprias para o seu tema.
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Section({
  title,
  text,
  styles,
}: {
  title: string;
  text: string;
  styles: ReturnType<typeof createStyles>;
}) {
  if (!text) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.body}>{text}</Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { gap: 8 },
    mode: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    modeText: { flex: 1, fontSize: 12, color: colors.textSecondary },
    modeTextOn: { color: colors.primary, fontWeight: '700' },
    label: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginTop: 4 },
    // 16px: no iPhone, campos menores fazem a tela dar zoom ao tocar.
    input: {
      fontSize: 16,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.surface,
    },
    generate: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 6,
      paddingVertical: 13,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    generateText: { fontSize: 15, fontWeight: '700', color: colors.surface },
    disabled: { opacity: 0.45 },
    pressed: { opacity: 0.7 },
    hint: { fontSize: 12, lineHeight: 17, color: colors.textSecondary },
    styleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
    styleText: { flex: 1, gap: 2 },
    styleTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    warning: { fontSize: 12, lineHeight: 17, color: colors.danger },
    preview: {
      marginTop: 6,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 14,
      gap: 10,
    },
    previewTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
    base: { fontSize: 13, lineHeight: 19, fontStyle: 'italic', color: colors.textSecondary },
    section: { gap: 4 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.primary },
    body: { fontSize: 14, lineHeight: 20, color: colors.textPrimary },
    verse: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.textSecondary,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
      paddingLeft: 8,
    },
    verseRef: { fontWeight: '700', color: colors.primary },
    insert: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 11,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.primary,
      backgroundColor: colors.surfaceAlt,
    },
    insertText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  });
}
