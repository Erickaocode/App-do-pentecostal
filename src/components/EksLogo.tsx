import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, Platform, Pressable, View } from 'react-native';

/**
 * Marca do EKS AI: o monograma hexagonal de três peças, em dourado. As imagens saem dos
 * mesmos polígonos do eks/brand.py do EKS AI (Cronnos AI), então ficam idênticas.
 */
const PIECES = [
  require('../../assets/eks/mark-p1.png'),
  require('../../assets/eks/mark-p2.png'),
  require('../../assets/eks/mark-p3.png'),
];
const BADGE = require('../../assets/eks/badge.png');

/** De onde cada peça vem antes de se encaixar (fração do tamanho), como no chat do EKS AI. */
const FROM = [
  { x: 0.3, y: -0.17, delay: 50 },
  { x: -0.3, y: 0, delay: 200 },
  { x: 0, y: 0.3, delay: 350 },
];

const useNative = Platform.OS !== 'web';

/**
 * Monograma dourado (sem fundo), para fundos escuros. Com `animated`, as três peças chegam
 * cada uma de um lado e se encaixam no hexágono; um toque monta de novo.
 */
export function EksMark({ size = 40, animated = false }: { size?: number; animated?: boolean }) {
  const progress = useRef(PIECES.map(() => new Animated.Value(animated ? 0 : 1))).current;

  const play = useCallback(() => {
    progress.forEach((value) => value.setValue(0));
    Animated.parallel(
      progress.map((value, i) =>
        Animated.timing(value, {
          toValue: 1,
          duration: 900,
          delay: FROM[i].delay,
          easing: Easing.bezier(0.2, 0.9, 0.25, 1),
          useNativeDriver: useNative,
        })
      )
    ).start();
  }, [progress]);

  useEffect(() => {
    if (animated) play();
  }, [animated, play]);

  const pieces = useMemo(
    () =>
      PIECES.map((source, i) => (
        <Animated.Image
          key={i}
          source={source}
          style={{
            position: 'absolute',
            width: size,
            height: size,
            opacity: progress[i],
            transform: [
              { translateX: progress[i].interpolate({ inputRange: [0, 1], outputRange: [FROM[i].x * size, 0] }) },
              { translateY: progress[i].interpolate({ inputRange: [0, 1], outputRange: [FROM[i].y * size, 0] }) },
              { scale: progress[i].interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
            ],
          }}
        />
      )),
    [progress, size]
  );

  const mark = <View style={{ width: size, height: size }}>{pieces}</View>;
  if (!animated) return mark;
  return (
    <Pressable onPress={play} accessibilityLabel="Logo do EKS AI" hitSlop={8}>
      {mark}
    </Pressable>
  );
}

/** Selo do EKS AI (monograma preto no quadrado dourado), para fundos claros e lugares pequenos. */
export function EksBadge({ size = 16 }: { size?: number }) {
  return <Image source={BADGE} style={{ width: size, height: size }} accessibilityLabel="EKS AI" />;
}
