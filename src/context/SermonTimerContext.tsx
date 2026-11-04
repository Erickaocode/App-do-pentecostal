import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Vibration } from 'react-native';

/** Tempos mais usados no culto: saudação e pregações. */
export const TIMER_PRESETS = [
  { key: 'saudacao', label: 'Saudação', chip: 'Saudação 5 min', minutes: 5 },
  { key: 'p15', label: 'Pregação', chip: '15 min', minutes: 15 },
  { key: 'p30', label: 'Pregação', chip: '30 min', minutes: 30 },
  { key: 'p60', label: 'Pregação', chip: '1 hora', minutes: 60 },
] as const;

/** A partir de quanto tempo restante o cronômetro avisa que está acabando. */
export const WARNING_THRESHOLD_MS = 60_000;

export type TimerPhase = 'idle' | 'running' | 'paused';
/** `ok`: tempo de sobra; `warning`: último minuto; `over`: passou do tempo. */
export type TimerLevel = 'ok' | 'warning' | 'over';

interface SermonTimerValue {
  phase: TimerPhase;
  level: TimerLevel;
  /** Duração escolhida, em ms. */
  durationMs: number;
  /** Tempo restante em ms; negativo quando passou do tempo. */
  remainingMs: number;
  label: string;
  start: (minutes: number, label: string) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  addMinute: () => void;
  /** O painel completo está na tela; o selo flutuante se esconde para não repetir. */
  panelVisible: boolean;
  setPanelVisible: (visible: boolean) => void;
}

const SermonTimerContext = createContext<SermonTimerValue | null>(null);

const KEEP_AWAKE_TAG = 'sermon-timer';

function vibrate(pattern: number[]) {
  // Na web o Vibration só funciona em alguns navegadores; não faz mal tentar.
  try {
    Vibration.vibrate(Platform.OS === 'android' ? [0, ...pattern] : pattern);
  } catch {
    // sem vibração disponível
  }
}

export function SermonTimerProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<TimerPhase>('idle');
  const [durationMs, setDurationMs] = useState(0);
  const [label, setLabel] = useState('');
  // O tempo é calculado pelo relógio (não por contagem de ticks), assim continua
  // certo mesmo se o app for para segundo plano ou a tela travar um pouco.
  const [endsAt, setEndsAt] = useState(0);
  const [pausedRemaining, setPausedRemaining] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [panelVisible, setPanelVisible] = useState(false);
  const notifiedRef = useRef<{ warning: boolean; over: boolean }>({ warning: false, over: false });

  useEffect(() => {
    if (phase !== 'running') return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [phase]);

  // Tela sempre acesa enquanto o cronômetro estiver ativo: o pregador não precisa tocar no celular.
  useEffect(() => {
    if (phase === 'idle') return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, [phase]);

  const remainingMs =
    phase === 'running' ? endsAt - now : phase === 'paused' ? pausedRemaining : durationMs;

  const level: TimerLevel =
    phase === 'idle' ? 'ok' : remainingMs <= 0 ? 'over' : remainingMs <= WARNING_THRESHOLD_MS ? 'warning' : 'ok';

  // Vibra uma vez ao entrar no último minuto e outra quando o tempo acaba.
  useEffect(() => {
    if (phase !== 'running') return;
    if (level === 'warning' && !notifiedRef.current.warning) {
      notifiedRef.current.warning = true;
      vibrate([300]);
    } else if (level === 'over' && !notifiedRef.current.over) {
      notifiedRef.current.over = true;
      notifiedRef.current.warning = true;
      vibrate([500, 200, 500, 200, 500]);
    }
  }, [level, phase]);

  const start = useCallback((minutes: number, newLabel: string) => {
    const ms = minutes * 60_000;
    notifiedRef.current = { warning: false, over: false };
    setDurationMs(ms);
    setLabel(newLabel);
    setEndsAt(Date.now() + ms);
    setNow(Date.now());
    setPhase('running');
  }, []);

  const pause = useCallback(() => {
    setPausedRemaining(endsAt - Date.now());
    setPhase('paused');
  }, [endsAt]);

  const resume = useCallback(() => {
    setEndsAt(Date.now() + pausedRemaining);
    setNow(Date.now());
    setPhase('running');
  }, [pausedRemaining]);

  const reset = useCallback(() => {
    notifiedRef.current = { warning: false, over: false };
    setPhase('idle');
    setDurationMs(0);
    setLabel('');
  }, []);

  const addMinute = useCallback(() => {
    setDurationMs((d) => d + 60_000);
    if (phase === 'running') setEndsAt((e) => e + 60_000);
    if (phase === 'paused') setPausedRemaining((r) => r + 60_000);
    // Se ganhou tempo de volta, avisa de novo quando estiver acabando.
    notifiedRef.current = { warning: false, over: false };
  }, [phase]);

  const value = useMemo<SermonTimerValue>(
    () => ({
      phase,
      level,
      durationMs,
      remainingMs,
      label,
      start,
      pause,
      resume,
      reset,
      addMinute,
      panelVisible,
      setPanelVisible,
    }),
    [phase, level, durationMs, remainingMs, label, start, pause, resume, reset, addMinute, panelVisible]
  );

  return <SermonTimerContext.Provider value={value}>{children}</SermonTimerContext.Provider>;
}

export function useSermonTimer(): SermonTimerValue {
  const ctx = useContext(SermonTimerContext);
  if (!ctx) throw new Error('useSermonTimer precisa estar dentro de SermonTimerProvider');
  return ctx;
}

/** "05:00", "-01:23", "1:00:00". */
export function formatTimer(ms: number): string {
  const negative = ms < 0;
  // Arredonda para cima enquanto há tempo (mostra 05:00 logo no início) e para baixo depois.
  const totalSeconds = negative ? Math.floor(-ms / 1000) : Math.ceil(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  const body = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  return negative ? `+${body}` : body;
}
