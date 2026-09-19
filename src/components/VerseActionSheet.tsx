import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { highlightColors } from '../theme';
import type { ThemeColors } from '../theme';
import type { VerseRef } from '../types';

interface Props {
  visible: boolean;
  verseRef: VerseRef | null;
  isFavorite: boolean;
  activeHighlight: string | null;
  onClose: () => void;
  onToggleFavorite: () => void;
  onPickHighlight: (colorKey: string | null) => void;
  onCreateNote: () => void;
}

export function VerseActionSheet({
  visible,
  verseRef,
  isFavorite,
  activeHighlight,
  onClose,
  onToggleFavorite,
  onPickHighlight,
  onCreateNote,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!verseRef) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.reference}>
            {verseRef.bookName} {verseRef.chapter}:{verseRef.verse}
          </Text>
          <Text style={styles.verseText} numberOfLines={3}>
            {verseRef.text}
          </Text>

          <Pressable style={styles.action} onPress={onToggleFavorite}>
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={20}
              color={isFavorite ? colors.danger : colors.textPrimary}
            />
            <Text style={styles.actionText}>
              {isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            </Text>
          </Pressable>

          <Pressable style={styles.action} onPress={onCreateNote}>
            <Ionicons name="create-outline" size={20} color={colors.textPrimary} />
            <Text style={styles.actionText}>Criar anotação neste versículo</Text>
          </Pressable>

          <Text style={styles.sectionLabel}>Destacar</Text>
          <View style={styles.colorRow}>
            {highlightColors.map((c) => (
              <Pressable
                key={c.key}
                onPress={() => onPickHighlight(activeHighlight === c.key ? null : c.key)}
                style={[
                  styles.colorDot,
                  { backgroundColor: c.value },
                  activeHighlight === c.key && styles.colorDotSelected,
                ]}
              />
            ))}
            {activeHighlight ? (
              <Pressable style={styles.clearHighlight} onPress={() => onPickHighlight(null)}>
                <Ionicons name="close" size={16} color={colors.textSecondary} />
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
      paddingBottom: 32,
    },
    reference: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.primaryDark,
      marginBottom: 4,
    },
    verseText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 16,
    },
    action: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
    },
    actionText: {
      fontSize: 15,
      color: colors.textPrimary,
    },
    sectionLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 8,
      marginBottom: 10,
    },
    colorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    colorDot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    colorDotSelected: {
      borderColor: colors.textPrimary,
    },
    clearHighlight: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
