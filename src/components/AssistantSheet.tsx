import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, type ReactNode } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollView as ScrollViewType,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { EksBadge } from './EksLogo';
import type { ThemeColors } from '../theme';

export interface AssistantTab {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  content: ReactNode;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tabs: AssistantTab[];
  activeTab: string;
  onTabChange: (key: string) => void;
  /** Com o teclado aberto o assistente some inteiro (nem a barrinha aparece). */
  hidden?: boolean;
  /** Ocupa a tela toda (ex.: digitando num campo dele com o teclado aberto). */
  expanded?: boolean;
  /** Texto pequeno na barrinha fechada, ex.: "Salvo". */
  status?: string;
  /** Aumenta quando o conteúdo deve voltar ao topo (ex.: nova busca). */
  scrollSignal?: number;
}

/** Quanto arrastar (px) para fechar ou abrir. */
const DRAG_TO_TOGGLE = 60;
const useNative = Platform.OS !== 'web';

/**
 * Assistente do editor em forma de gaveta: aberto mostra versículos, esboço e configuração;
 * arrastando para baixo (ou no botão) ele vira só uma barrinha e libera a tela para escrever.
 */
export function AssistantSheet({
  open,
  onOpenChange,
  tabs,
  activeTab,
  onTabChange,
  hidden,
  expanded,
  status,
  scrollSignal = 0,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const drag = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollViewType>(null);
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    drag.setValue(0);
  }, [open, drag]);

  useEffect(() => {
    if (scrollSignal > 0) scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [scrollSignal]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        // "Capture": o arraste ganha dos botões que estão dentro da área (abas, barrinha).
        onMoveShouldSetPanResponderCapture: (_e, g) =>
          Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_e, g) => {
          // Aberto: segue o dedo para baixo. Fechado: dá um "puxãozinho" para cima.
          drag.setValue(openRef.current ? Math.max(0, g.dy) : Math.min(0, g.dy) / 3);
        },
        onPanResponderRelease: (_e, g) => {
          if (openRef.current && (g.dy > DRAG_TO_TOGGLE || g.vy > 0.6)) {
            onOpenChange(false);
          } else if (!openRef.current && (g.dy < -DRAG_TO_TOGGLE / 2 || g.vy < -0.4)) {
            onOpenChange(true);
          } else {
            Animated.spring(drag, { toValue: 0, useNativeDriver: useNative, bounciness: 6 }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(drag, { toValue: 0, useNativeDriver: useNative }).start();
        },
      }),
    [drag, onOpenChange]
  );

  // Escondido continua montado: desmontar apagaria o que a pessoa digitou no esboço.
  if (!open) {
    return (
      <Animated.View
        style={[styles.bar, hidden && styles.gone, { transform: [{ translateY: drag }] }]}
        {...pan.panHandlers}
      >
        <Pressable
          style={styles.barMain}
          onPress={() => onOpenChange(true)}
          accessibilityLabel="Abrir o EKS AI"
        >
          <View style={styles.grabber} />
          <View style={styles.barRow}>
            <EksBadge size={17} />
            <Text style={styles.barText}>EKS AI</Text>
            <Text style={styles.barSub}>versículos · esboço</Text>
            <View style={styles.flex} />
            {status ? <Text style={styles.status}>{status}</Text> : null}
            <Ionicons name="chevron-up" size={16} color={colors.textSecondary} />
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.sheet,
        expanded && styles.sheetExpanded,
        hidden && styles.gone,
        { transform: [{ translateY: drag }] },
      ]}
    >
      {/* Área de arrastar: puxe para baixo para tirar o assistente da frente. */}
      <View {...pan.panHandlers} style={styles.handleArea}>
        <View style={styles.grabber} />
        <View style={styles.tabsRow}>
          {tabs.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <Pressable
                key={tab.key}
                onPress={() => onTabChange(tab.key)}
                style={[styles.tab, active && styles.tabActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Ionicons name={tab.icon} size={15} color={active ? colors.surface : colors.primary} />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
          <View style={styles.flex} />
          <Pressable
            onPress={() => onOpenChange(false)}
            hitSlop={10}
            style={styles.close}
            accessibilityLabel="Recolher assistente"
          >
            <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={expanded ? styles.scrollExpanded : styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Todas as abas ficam montadas: trocar de aba não perde o que já foi gerado. */}
        {tabs.map((tab) => (
          <View key={tab.key} style={tab.key === activeTab ? undefined : styles.hiddenTab}>
            {tab.content}
          </View>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1 },
    bar: {
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    barMain: { paddingHorizontal: 14, paddingTop: 5, paddingBottom: 9, gap: 5 },
    barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    barText: { fontSize: 14, fontWeight: '700', color: colors.primary },
    barSub: { fontSize: 12, color: colors.textSecondary },
    status: { fontSize: 11, color: colors.textSecondary, marginRight: 4 },
    grabber: {
      alignSelf: 'center',
      width: 38,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
    },
    sheet: {
      maxHeight: '62%',
      flexShrink: 1,
      backgroundColor: colors.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: -2 },
      elevation: 8,
    },
    handleArea: {
      paddingTop: 7,
      paddingHorizontal: 12,
      paddingBottom: 8,
      gap: 8,
      // Na web, mostra que dá para arrastar.
      ...(Platform.OS === 'web' ? ({ cursor: 'grab', touchAction: 'none' } as object) : null),
    },
    tabsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: 16,
      backgroundColor: colors.surfaceAlt,
    },
    tabActive: { backgroundColor: colors.primary },
    tabText: { fontSize: 13, fontWeight: '600', color: colors.primary },
    tabTextActive: { color: colors.surface },
    close: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
    },
    sheetExpanded: { maxHeight: '100%', flex: 1 },
    gone: { display: 'none' },
    scroll: { flexGrow: 0 },
    scrollExpanded: { flex: 1 },
    content: { paddingHorizontal: 16, paddingBottom: 20, paddingTop: 4 },
    hiddenTab: { display: 'none' },
  });
}
