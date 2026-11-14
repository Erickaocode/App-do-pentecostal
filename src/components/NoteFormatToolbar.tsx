import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors } from '../theme';
import type { EditorCommand, EditorFormats } from './RichNoteEditor';

type CommandType = EditorCommand['type'];

interface Props {
  formats: EditorFormats | null;
  editorFocused: boolean;
  onCommand: (type: CommandType, value?: string | null) => void;
}

/** Barra de ferramentas embaixo do editor, como a das Notas do iPhone. */
export function NoteFormatToolbar({ formats, editorFocused, onCommand }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const rootRef = useRef<View>(null);

  // Na web, tocar na barra não pode tirar o cursor do editor.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = rootRef.current as unknown as HTMLElement | null;
    if (!node?.addEventListener) return;
    const keep = (event: Event) => event.preventDefault();
    node.addEventListener('mousedown', keep);
    return () => node.removeEventListener('mousedown', keep);
  }, []);

  function hideKeyboard() {
    onCommand('blur');
    Keyboard.dismiss();
  }

  return (
    <View ref={rootRef} style={styles.bar}>
      <ToolButton
        label="Negrito"
        active={!!formats?.bold}
        onPress={() => onCommand('bold')}
        styles={styles}
      >
        <MaterialCommunityIcons
          name="format-bold"
          size={24}
          color={formats?.bold ? colors.surface : colors.primary}
        />
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
          color={formats?.list === 'checklist' ? colors.surface : colors.primary}
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
      {typeof children === 'string' ? <Text>{children}</Text> : children}
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
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
  });
}
