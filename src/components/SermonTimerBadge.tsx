import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatTimer, useSermonTimer } from '../context/SermonTimerContext';
import { useTheme } from '../context/ThemeContext';
import { TIMER_OVER_COLOR, TIMER_WARNING_COLOR } from './SermonTimerPanel';

/**
 * Selo flutuante com o tempo da pregação, mostrado em qualquer aba enquanto o
 * cronômetro está ativo (ex: quando o pregador abre um versículo na Bíblia).
 */
export function SermonTimerBadge({ onPress }: { onPress: () => void }) {
  const timer = useSermonTimer();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  if (timer.phase === 'idle' || timer.panelVisible) return null;

  const background =
    timer.level === 'over'
      ? TIMER_OVER_COLOR
      : timer.level === 'warning'
        ? TIMER_WARNING_COLOR
        : colors.primary;
  const foreground = timer.level === 'warning' ? '#3A2A00' : '#FFFFFF';

  return (
    <Pressable
      onPress={onPress}
      style={[styles.badge, { top: insets.top + 6, backgroundColor: background }]}
      accessibilityLabel="Voltar para a anotação com o cronômetro"
    >
      <Ionicons
        name={timer.level === 'over' ? 'alert-circle' : timer.phase === 'paused' ? 'pause' : 'timer-outline'}
        size={16}
        color={foreground}
      />
      <Text style={[styles.text, { color: foreground }]}>
        {timer.level === 'over' ? `Tempo esgotado ${formatTimer(timer.remainingMs)}` : formatTimer(timer.remainingMs)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  text: { fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
