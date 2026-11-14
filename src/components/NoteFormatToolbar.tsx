import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors } from '../theme';
import type { BlockStyle, EditorCommand, EditorFormats, ListKind } from './RichNoteEditor';

type CommandType = EditorCommand['type'];
type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface Props {
  formats: EditorFormats | null;
  editorFocused: boolean;
  onCommand: (type: CommandType, value?: string | null) => void;
  onPanelChange?: (open: boolean) => void;
}

const BLOCK_STYLES: { value: BlockStyle; label: string }[] = [
  { value: 'h1', label: 'Título' },
  { value: 'h2', label: 'Cabeçalho' },
  { value: 'h3', label: 'Subcabeçalho' },
  { value: 'div', label: 'Corpo' },
  { value: 'pre', label: 'Monoespaçado' },
];

const LISTS: { value: ListKind; icon: IconName; label: string }[] = [
  { value: 'bullet', icon: 'format-list-bulleted', label: 'Lista com marcadores' },
  { value: 'dash', icon: 'format-list-text', label: 'Lista com traços' },
  { value: 'number', icon: 'format-list-numbered', label: 'Lista numerada' },
];

/** Cores de destaque do texto (como no iPhone); null tira a cor. */
const TEXT_COLORS: { value: string | null; label: string }[] = [
  { value: null, label: 'Sem cor' },
  { value: '#D9417A', label: 'Rosa' },
  { value: '#8E5BD6', label: 'Roxo' },
  { value: '#E07A2C', label: 'Laranja' },
  { value: '#22A386', label: 'Menta' },
  { value: '#3478D9', label: 'Azul' },
];

/** Barra de ferramentas embaixo do editor, como a das Notas do iPhone. */
export function NoteFormatToolbar({ formats, editorFocused, onCommand, onPanelChange }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const rootRef = useRef<View>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    onPanelChange?.(panelOpen);
  }, [panelOpen, onPanelChange]);

  // Na web, tocar na barra não pode tirar o cursor do editor.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = rootRef.current as unknown as HTMLElement | null;
    if (!node?.addEventListener) return;
    const keep = (event: Event) => event.preventDefault();
    node.addEventListener('mousedown', keep);
    return () => node.removeEventListener('mousedown', keep);
  }, []);

  // No celular o painel ocupa o lugar do teclado (como no iPhone): quando o teclado volta, ele fecha.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Keyboard.addListener('keyboardDidShow', () => setPanelOpen(false));
    return () => sub.remove();
  }, []);

  function togglePanel() {
    if (!panelOpen && Platform.OS !== 'web') {
      onCommand('blur');
      Keyboard.dismiss();
    }
    setPanelOpen((open) => !open);
  }

  function hideKeyboard() {
    setPanelOpen(false);
    onCommand('blur');
    Keyboard.dismiss();
  }

  const block = formats?.block ?? 'div';
  const iconColor = (active: boolean) => (active ? colors.surface : colors.primary);

  return (
    <View ref={rootRef}>
      {panelOpen ? (
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Formatar</Text>
            <Pressable
              onPress={() => setPanelOpen(false)}
              hitSlop={10}
              accessibilityLabel="Fechar formatação"
              style={styles.closeButton}
            >
              <MaterialCommunityIcons name="close" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.blockRow}
            keyboardShouldPersistTaps="always"
          >
            {BLOCK_STYLES.map((item) => {
              const active = block === item.value;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => onCommand('block', item.value)}
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected: active }}
                  style={[styles.blockChip, active && styles.chipActive]}
                >
                  <Text
                    style={[
                      styles.blockLabel,
                      styles[`label_${item.value}`],
                      active && styles.labelActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.row}>
            <View style={styles.group}>
              <Segment
                icon="format-bold"
                label="Negrito"
                active={!!formats?.bold}
                onPress={() => onCommand('bold')}
                styles={styles}
                color={iconColor(!!formats?.bold)}
              />
              <Segment
                icon="format-italic"
                label="Itálico"
                active={!!formats?.italic}
                onPress={() => onCommand('italic')}
                styles={styles}
                color={iconColor(!!formats?.italic)}
              />
              <Segment
                icon="format-underline"
                label="Sublinhado"
                active={!!formats?.underline}
                onPress={() => onCommand('underline')}
                styles={styles}
                color={iconColor(!!formats?.underline)}
              />
              <Segment
                icon="format-strikethrough-variant"
                label="Tachado"
                active={!!formats?.strike}
                onPress={() => onCommand('strikeThrough')}
                styles={styles}
                color={iconColor(!!formats?.strike)}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.group}>
              {LISTS.map((item) => {
                const active = formats?.list === item.value;
                return (
                  <Segment
                    key={item.value}
                    icon={item.icon}
                    label={item.label}
                    active={active}
                    onPress={() => onCommand('list', item.value)}
                    styles={styles}
                    color={iconColor(active)}
                  />
                );
              })}
            </View>
            <View style={styles.group}>
              <Segment
                icon="format-indent-decrease"
                label="Diminuir recuo"
                onPress={() => onCommand('outdent')}
                styles={styles}
                color={colors.primary}
              />
              <Segment
                icon="format-indent-increase"
                label="Aumentar recuo"
                onPress={() => onCommand('indent')}
                styles={styles}
                color={colors.primary}
              />
              <Segment
                icon="format-quote-close"
                label="Citação"
                active={block === 'blockquote'}
                onPress={() => onCommand('quote')}
                styles={styles}
                color={iconColor(block === 'blockquote')}
              />
            </View>
          </View>

          <View style={styles.colorRow}>
            {TEXT_COLORS.map((item) => (
              <Pressable
                key={item.label}
                onPress={() => onCommand('color', item.value)}
                accessibilityLabel={`Cor: ${item.label}`}
                hitSlop={4}
                style={[
                  styles.colorDot,
                  item.value
                    ? { backgroundColor: item.value, borderColor: item.value }
                    : styles.colorNone,
                ]}
              >
                {item.value ? null : (
                  <MaterialCommunityIcons name="water-off-outline" size={16} color={colors.textSecondary} />
                )}
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.bar}>
        <ToolButton
          label="Formatar texto"
          active={panelOpen}
          onPress={togglePanel}
          styles={styles}
        >
          <Text style={[styles.aaText, panelOpen && styles.labelActive]}>Aa</Text>
        </ToolButton>
        <ToolButton
          label="Negrito"
          active={!!formats?.bold}
          onPress={() => onCommand('bold')}
          styles={styles}
        >
          <MaterialCommunityIcons name="format-bold" size={24} color={iconColor(!!formats?.bold)} />
        </ToolButton>
        <ToolButton
          label="Título"
          active={block === 'h1'}
          onPress={() => onCommand('block', 'h1')}
          styles={styles}
        >
          <MaterialCommunityIcons name="format-header-1" size={24} color={iconColor(block === 'h1')} />
        </ToolButton>
        <ToolButton
          label="Lista de tarefas"
          active={formats?.list === 'checklist'}
          onPress={() => onCommand('list', 'checklist')}
          styles={styles}
        >
          <MaterialCommunityIcons
            name="checkbox-marked-circle-outline"
            size={23}
            color={iconColor(formats?.list === 'checklist')}
          />
        </ToolButton>
        <ToolButton label="Tabela" onPress={() => onCommand('table')} styles={styles}>
          <MaterialCommunityIcons name="table-large" size={23} color={colors.primary} />
        </ToolButton>

        <View style={styles.spacer} />

        {editorFocused ? (
          <ToolButton label="Fechar teclado" onPress={hideKeyboard} styles={styles}>
            <MaterialCommunityIcons name="keyboard-close" size={23} color={colors.primary} />
          </ToolButton>
        ) : null}
      </View>
    </View>
  );
}

function ToolButton({
  label,
  active,
  onPress,
  children,
  styles,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  children: React.ReactNode;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      hitSlop={4}
      style={({ pressed }) => [
        styles.button,
        active && styles.buttonActive,
        pressed && !active && styles.buttonPressed,
      ]}
    >
      {children}
    </Pressable>
  );
}

function Segment({
  icon,
  label,
  active,
  onPress,
  styles,
  color,
}: {
  icon: IconName;
  label: string;
  active?: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  color: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={({ pressed }) => [
        styles.segment,
        active && styles.chipActive,
        pressed && !active && styles.buttonPressed,
      ]}
    >
      <MaterialCommunityIcons name={icon} size={22} color={color} />
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    spacer: { flex: 1 },
    button: {
      width: 42,
      height: 38,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonActive: { backgroundColor: colors.primary },
    buttonPressed: { backgroundColor: colors.surfaceAlt },
    aaText: { fontSize: 18, fontWeight: '600', color: colors.primary },
    panel: {
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 10,
      gap: 10,
    },
    panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    panelTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    closeButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    blockRow: { gap: 6, alignItems: 'center' },
    blockChip: {
      paddingHorizontal: 12,
      height: 40,
      borderRadius: 10,
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
    },
    chipActive: { backgroundColor: colors.primary },
    blockLabel: { color: colors.textPrimary },
    labelActive: { color: colors.surface },
    label_h1: { fontSize: 19, fontWeight: '700' },
    label_h2: { fontSize: 16, fontWeight: '700' },
    label_h3: { fontSize: 14, fontWeight: '600' },
    label_div: { fontSize: 14 },
    label_pre: {
      fontSize: 13,
      fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    row: { flexDirection: 'row', gap: 8 },
    group: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: colors.surfaceAlt,
      borderRadius: 10,
      padding: 3,
      gap: 3,
    },
    segment: {
      flex: 1,
      height: 36,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    colorRow: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 2 },
    colorDot: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    colorNone: { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
  });
}
