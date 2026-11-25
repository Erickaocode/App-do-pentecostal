import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cloudAvailable, type AiMode } from '../ai/engine';
import type { OllamaConfig } from '../ai/ollama';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors } from '../theme';
import { OllamaSettings } from './OllamaSettings';

interface Props {
  mode: AiMode;
  onModeChange: (mode: AiMode) => void;
  ollama: OllamaConfig | null;
  onOllamaChange: (config: OllamaConfig | null) => void;
}

const OPTIONS: {
  mode: AiMode;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}[] = [
  {
    mode: 'cloud',
    icon: 'cloud-outline',
    title: 'EKS AI na nuvem (recomendado)',
    description:
      'Sem configurar nada. Precisa de internet. Quando você pede ajuda, o texto vai para a IA (Google Gemini) só para gerar a resposta.',
  },
  {
    mode: 'ollama',
    icon: 'desktop-outline',
    title: 'EKS AI no meu computador (Ollama)',
    description: 'A IA roda no seu PC e o texto não sai da sua rede. Precisa do Ollama instalado.',
  },
  {
    mode: 'off',
    icon: 'cloud-offline-outline',
    title: 'Desligada',
    description: 'Só o modo básico: sugestões e esboços montados no aparelho, sem internet.',
  },
];

/** Escolha de quem responde no assistente: nuvem, Ollama ou nenhuma IA. */
export function AiSettings({ mode, onModeChange, ollama, onOllamaChange }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      {OPTIONS.filter((o) => o.mode !== 'cloud' || cloudAvailable).map((option) => {
        const active = mode === option.mode;
        return (
          <Pressable
            key={option.mode}
            onPress={() => onModeChange(option.mode)}
            style={[styles.option, active && styles.optionActive]}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
          >
            <Ionicons name={option.icon} size={20} color={colors.primary} />
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </View>
            <Ionicons
              name={active ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={active ? colors.primary : colors.textSecondary}
            />
          </Pressable>
        );
      })}

      {mode === 'ollama' ? (
        <View style={styles.ollama}>
          <OllamaSettings config={ollama} onChange={onOllamaChange} />
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { gap: 8 },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    optionActive: { borderColor: colors.primary, backgroundColor: colors.surfaceAlt },
    optionText: { flex: 1, gap: 2 },
    optionTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    optionDescription: { fontSize: 12, lineHeight: 17, color: colors.textSecondary },
    ollama: { marginTop: 6 },
  });
}
