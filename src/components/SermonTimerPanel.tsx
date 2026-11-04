import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TIMER_PRESETS, formatTimer, useSermonTimer } from '../context/SermonTimerContext';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors } from '../theme';

/** Cores fixas de alerta: precisam chamar atenção em qualquer tema. */
export const TIMER_WARNING_COLOR = '#E0A100';
export const TIMER_OVER_COLOR = '#C62828';

/** Painel do cronômetro de pregação, fixo no topo do editor de anotações. */
export function SermonTimerPanel() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const timer = useSermonTimer();
  const { setPanelVisible } = timer;

  // Enquanto o painel está na tela, o selo flutuante fica escondido.
  useFocusEffect(
    useCallback(() => {
      setPanelVisible(true);
      return () => setPanelVisible(false);
    }, [setPanelVisible])
  );

  if (timer.phase === 'idle') {
    return (
      <View style={styles.idle}>
        <Ionicons name="timer-outline" size={18} color={colors.primary} />
        <Text style={styles.idleTitle}>Cronômetro</Text>
        <View style={styles.chips}>
          {TIMER_PRESETS.map((p) => (
            <Pressable
              key={p.key}
              style={styles.chip}
              onPress={() => timer.start(p.minutes, `${p.label} · ${p.minutes} min`)}
              accessibilityLabel={`Iniciar ${p.label} de ${p.minutes} minutos`}
            >
              <Text style={styles.chipText}>{p.chip}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  const over = timer.level === 'over';
  const warning = timer.level === 'warning';
  const progress =
    timer.durationMs > 0 ? Math.min(1, Math.max(0, 1 - timer.remainingMs / timer.durationMs)) : 1;
  const accent = over ? TIMER_OVER_COLOR : warning ? TIMER_WARNING_COLOR : colors.primary;

  return (
    <View style={[styles.active, over && styles.activeOver]}>
      {over ? (
        <View style={styles.alertOver}>
          <Ionicons name="alert-circle" size={18} color="#FFFFFF" />
          <Text style={styles.alertOverText}>Tempo esgotado! Hora de encerrar.</Text>
        </View>
      ) : warning ? (
        <View style={styles.alertWarning}>
          <Ionicons name="warning" size={16} color="#3A2A00" />
          <Text style={styles.alertWarningText}>Falta menos de 1 minuto</Text>
        </View>
      ) : null}

      <View style={styles.row}>
        <View style={styles.timeBox}>
          <Text style={[styles.time, { color: over ? '#FFFFFF' : accent }]}>
            {formatTimer(timer.remainingMs)}
          </Text>
          <Text style={[styles.label, over && styles.labelOver]}>
            {over ? 'passou do tempo' : timer.phase === 'paused' ? `${timer.label} · pausado` : timer.label}
          </Text>
        </View>

        <View style={styles.controls}>
          <Pressable
            style={[styles.iconButton, over && styles.iconButtonOver]}
            onPress={timer.addMinute}
            accessibilityLabel="Adicionar 1 minuto"
          >
            <Text style={[styles.plusText, over && styles.onOver]}>+1</Text>
          </Pressable>
          <Pressable
            style={[styles.iconButton, over && styles.iconButtonOver]}
            onPress={timer.phase === 'running' ? timer.pause : timer.resume}
            accessibilityLabel={timer.phase === 'running' ? 'Pausar' : 'Continuar'}
          >
            <Ionicons
              name={timer.phase === 'running' ? 'pause' : 'play'}
              size={20}
              color={over ? '#FFFFFF' : colors.primary}
            />
          </Pressable>
          <Pressable
            style={[styles.iconButton, over && styles.iconButtonOver]}
            onPress={timer.reset}
            accessibilityLabel="Parar cronômetro"
          >
            <Ionicons name="stop" size={20} color={over ? '#FFFFFF' : colors.danger} />
          </Pressable>
        </View>
      </View>

      {!over ? (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: accent }]} />
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    idle: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    idleTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginRight: 4 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 14,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipText: { fontSize: 12, fontWeight: '600', color: colors.primary },
    active: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 10,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    activeOver: { backgroundColor: TIMER_OVER_COLOR, borderBottomColor: TIMER_OVER_COLOR },
    alertOver: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    alertOverText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
    alertWarning: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      backgroundColor: TIMER_WARNING_COLOR,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginBottom: 6,
    },
    alertWarningText: { color: '#3A2A00', fontWeight: '700', fontSize: 12 },
    row: { flexDirection: 'row', alignItems: 'center' },
    timeBox: { flex: 1 },
    time: { fontSize: 34, fontWeight: '800', fontVariant: ['tabular-nums'] },
    label: { fontSize: 12, color: colors.textSecondary },
    labelOver: { color: '#FFE3E3' },
    controls: { flexDirection: 'row', gap: 8 },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
    },
    iconButtonOver: { backgroundColor: 'rgba(255,255,255,0.2)' },
    plusText: { fontSize: 15, fontWeight: '800', color: colors.primary },
    onOver: { color: '#FFFFFF' },
    track: {
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.surfaceAlt,
      marginTop: 8,
      overflow: 'hidden',
    },
    fill: { height: 4, borderRadius: 2 },
  });
}
