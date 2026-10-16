import React, { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { ShortPhrase } from '../data/shortPhrases';
import type { ThemeColors } from '../theme';

const TYPE_MS = 55;
const DELETE_MS = 22;
const HOLD_MS = 3000;
const NEXT_PHRASE_MS = 450;
const CURSOR_BLINK_MS = 500;
/** Sem animação (Reduzir movimento ligado), cada frase fica este tempo na tela. */
const STATIC_PHRASE_MS = 6000;

type Phase = 'typing' | 'holding' | 'deleting';

/**
 * Frases curtas que se escrevem e se apagam sozinhas, uma depois da outra.
 * Para quando `active` é falso (tela fora de foco), para não gastar bateria à toa.
 */
export function TypewriterPhrases({ phrases, active }: { phrases: ShortPhrase[]; active: boolean }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [index, setIndex] = useState(0);
  const [length, setLength] = useState(0);
  const [phase, setPhase] = useState<Phase>('typing');
  const [reduceMotion, setReduceMotion] = useState(false);
  const [cursorOn, setCursorOn] = useState(true);

  const phrase = phrases[index % phrases.length];

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  // Uma etapa por vez: escreve uma letra, segura a frase pronta, apaga uma letra...
  useEffect(() => {
    if (!active) return;
    if (reduceMotion) {
      const timer = setTimeout(() => setIndex((i) => i + 1), STATIC_PHRASE_MS);
      return () => clearTimeout(timer);
    }
    let delay: number;
    let step: () => void;
    if (phase === 'typing') {
      delay = TYPE_MS;
      step = () => (length < phrase.text.length ? setLength(length + 1) : setPhase('holding'));
    } else if (phase === 'holding') {
      delay = HOLD_MS;
      step = () => setPhase('deleting');
    } else if (length > 0) {
      delay = DELETE_MS;
      step = () => setLength(length - 1);
    } else {
      delay = NEXT_PHRASE_MS;
      step = () => {
        setIndex((i) => i + 1);
        setPhase('typing');
      };
    }
    const timer = setTimeout(step, delay);
    return () => clearTimeout(timer);
  }, [active, reduceMotion, phase, length, phrase.text.length]);

  // Cursor piscando. Alterna a cor, e não a opacidade: no Android e no iPhone a opacidade
  // não vale para um texto dentro de outro.
  useEffect(() => {
    if (!active || reduceMotion) return;
    const timer = setInterval(() => setCursorOn((on) => !on), CURSOR_BLINK_MS);
    return () => clearInterval(timer);
  }, [active, reduceMotion]);

  const shownText = reduceMotion ? phrase.text : phrase.text.slice(0, length);
  const showReference = reduceMotion || phase === 'holding';

  return (
    // Leitores de tela ouvem a frase inteira de uma vez, e não letra por letra.
    <View
      style={styles.container}
      accessible
      accessibilityLabel={`${phrase.text} ${phrase.reference}`}
    >
      <Text style={styles.text}>
        {shownText}
        {reduceMotion ? null : (
          <Text style={[styles.cursor, !cursorOn && styles.cursorOff]}>|</Text>
        )}
        {showReference ? <Text style={styles.reference}>{`  ${phrase.reference}`}</Text> : null}
      </Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    // Altura de duas linhas: a frase pode quebrar enquanto é escrita sem empurrar a tela.
    container: { minHeight: 44, marginTop: -6 },
    text: { fontSize: 15, lineHeight: 22, color: colors.textSecondary, fontStyle: 'italic' },
    cursor: { color: colors.primary, fontStyle: 'normal', fontWeight: '300' },
    cursorOff: { color: 'transparent' },
    reference: { fontSize: 12, fontStyle: 'normal', fontWeight: '700', color: colors.primary },
  });
}
