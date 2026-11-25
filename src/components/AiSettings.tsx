import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { checkCloudHealth, cloudAvailable, type AiMode } from '../ai/engine';
import type { OllamaConfig } from '../ai/ollama';
import { OllamaSettings } from './OllamaSettings';

interface Props {
  mode: AiMode;
  onModeChange: (mode: AiMode) => void;
  ollama: OllamaConfig | null;
  onOllamaChange: (config: OllamaConfig | null) => void;
}

/** Cores da marca EKS AI (iguais às do assistente de desktop), em qualquer tema do app. */
const EKS = {
  bg: '#000000',
  surface: '#0C0C0C',
  chip: '#1C1A14',
  border: '#2A2620',
  gold: '#F5C518',
  text: '#F2EFE9',
  muted: '#9A9488',
  dim: '#5C574C',
  online: '#3DDC84',
  offline: '#E5484D',
};

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, Consolas, monospace' });

const MODES: { mode: AiMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { mode: 'cloud', label: 'Nuvem', icon: 'cloud-outline' },
  { mode: 'ollama', label: 'No meu PC', icon: 'desktop-outline' },
  { mode: 'off', label: 'Desligado', icon: 'power-outline' },
];

const MODE_TEXT: Record<AiMode, string> = {
  cloud:
    'Sem configurar nada. Quando você pede ajuda, o texto vai para o Google Gemini, o cérebro do EKS AI, só para gerar a resposta.',
  ollama: 'O EKS AI roda no seu computador com o Ollama. O texto não sai da sua rede.',
  off: 'Só o modo básico: sugestões e esboços montados no aparelho, sem internet.',
};

const SKILLS: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: 'book-outline', label: 'Versículos pelo sentido' },
  { icon: 'list-outline', label: 'Esboços de pregação' },
  { icon: 'person-outline', label: 'No seu estilo' },
];

/** A "marca" do EKS AI: anel dourado com o ponto no meio. */
function EksMark({ size = 34 }: { size?: number }) {
  const ring = Math.max(3, Math.round(size * 0.08));
  const dot = Math.round(size * 0.38);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: ring,
        borderColor: EKS.gold,
        backgroundColor: EKS.surface,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: EKS.gold }} />
    </View>
  );
}

/** Painel do EKS AI: status ao vivo, o que ele faz e onde ele roda (nuvem, PC ou desligado). */
export function AiSettings({ mode, onModeChange, ollama, onOllamaChange }: Props) {
  const [health, setHealth] = useState<{ checking: boolean; model: string | null }>({
    checking: true,
    model: null,
  });

  useEffect(() => {
    if (mode !== 'cloud') return;
    let alive = true;
    setHealth({ checking: true, model: null });
    checkCloudHealth().then((model) => {
      if (alive) setHealth({ checking: false, model });
    });
    return () => {
      alive = false;
    };
  }, [mode]);

  const status =
    mode === 'off'
      ? { color: EKS.dim, text: 'desligado · modo básico' }
      : mode === 'ollama'
        ? ollama
          ? { color: EKS.online, text: `local · ${ollama.model}` }
          : { color: EKS.gold, text: 'local · configure abaixo' }
        : health.checking
          ? { color: EKS.gold, text: 'conectando...' }
          : health.model
            ? { color: EKS.online, text: `online · ${health.model}` }
            : { color: EKS.offline, text: 'sem conexão · usa o modo básico' };

  const modes = MODES.filter((m) => m.mode !== 'cloud' || cloudAvailable);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.glow} />
        <View style={styles.brandRow}>
          <EksMark />
          <Text style={styles.wordmark}>
            EKS <Text style={styles.wordmarkAi}>AI</Text>
          </Text>
        </View>
        <Text style={styles.tagline}>Seu assistente de pregação</Text>

        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <Text style={styles.statusText} numberOfLines={1}>
            {status.text}
          </Text>
        </View>

        <View style={styles.skills}>
          {SKILLS.map((skill) => (
            <View key={skill.label} style={styles.skill}>
              <Ionicons name={skill.icon} size={13} color={EKS.gold} />
              <Text style={styles.skillText}>{skill.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.label}>ONDE O EKS AI RODA</Text>
        <View style={styles.segment}>
          {modes.map((item) => {
            const active = mode === item.mode;
            return (
              <Pressable
                key={item.mode}
                onPress={() => onModeChange(item.mode)}
                style={[styles.segmentItem, active && styles.segmentActive]}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
              >
                <Ionicons name={item.icon} size={15} color={active ? EKS.bg : EKS.muted} />
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.modeText}>{MODE_TEXT[mode]}</Text>
      </View>

      {mode === 'ollama' ? <OllamaSettings config={ollama} onChange={onOllamaChange} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  card: {
    backgroundColor: EKS.bg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: EKS.border,
    padding: 16,
    gap: 10,
    overflow: 'hidden',
  },
  // Brilho dourado no canto, como no banner do EKS AI.
  glow: {
    position: 'absolute',
    top: -70,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: EKS.gold,
    opacity: 0.1,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wordmark: { fontSize: 26, fontWeight: '800', color: EKS.text, letterSpacing: -0.5 },
  wordmarkAi: { color: EKS.gold },
  tagline: { fontSize: 14, fontWeight: '600', color: EKS.muted, marginTop: -4 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    backgroundColor: EKS.chip,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontFamily: MONO, fontSize: 11, color: EKS.muted },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: EKS.border,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  skillText: { fontSize: 12, color: EKS.text },
  label: { fontFamily: MONO, fontSize: 11, color: EKS.gold, letterSpacing: 1, marginTop: 6 },
  segment: {
    flexDirection: 'row',
    backgroundColor: EKS.surface,
    borderWidth: 1,
    borderColor: EKS.border,
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 9,
  },
  segmentActive: { backgroundColor: EKS.gold },
  segmentText: { fontSize: 13, fontWeight: '600', color: EKS.muted },
  segmentTextActive: { color: EKS.bg, fontWeight: '800' },
  modeText: { fontSize: 12, lineHeight: 18, color: EKS.muted },
});
