import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBible } from '../context/BibleContext';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors } from '../theme';

/** Botão com a sigla da versão atual; ao tocar, abre a lista de versões. Some se só houver uma. */
export function VersionPicker() {
  const { version, versions, setVersion } = useBible();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  if (versions.length < 2) return null;

  return (
    <>
      <Pressable style={styles.chip} onPress={() => setOpen(true)} hitSlop={8}>
        <Text style={styles.chipText}>{version.short}</Text>
        <Ionicons name="chevron-down" size={14} color={colors.primary} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
        navigationBarTranslucent
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { paddingBottom: 24 + insets.bottom }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.title}>Versão da Bíblia</Text>
            {versions.map((item) => {
              const selected = item.id === version.id;
              return (
                <Pressable
                  key={item.id}
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => {
                    setOpen(false);
                    if (!selected) setVersion(item.id);
                  }}
                >
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.short}</Text>
                  </View>
                  <Text style={styles.optionName}>{item.name}</Text>
                  {selected ? (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  ) : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: colors.surfaceAlt,
    },
    chipText: { fontSize: 12, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      gap: 8,
    },
    title: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    optionSelected: { borderColor: colors.primary, backgroundColor: colors.surfaceAlt },
    badge: {
      minWidth: 58,
      paddingVertical: 4,
      paddingHorizontal: 6,
      borderRadius: 8,
      backgroundColor: colors.background,
      alignItems: 'center',
    },
    badgeText: { fontSize: 12, fontWeight: '800', color: colors.primary },
    optionName: { flex: 1, fontSize: 15, color: colors.textPrimary, fontWeight: '600' },
  });
}
