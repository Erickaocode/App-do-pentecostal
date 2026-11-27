import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  DEFAULT_OLLAMA_URL,
  OllamaError,
  clearOllamaConfig,
  listOllamaModels,
  mixedContentProblem,
  normalizeOllamaUrl,
  saveOllamaConfig,
  type OllamaConfig,
} from '../ai/ollama';
import { useTheme } from '../context/ThemeContext';
import { revealFocusedInput } from '../hooks/useKeyboardInset';
import { useUserDb } from '../db/UserDbProvider';
import type { ThemeColors } from '../theme';

interface Props {
  config: OllamaConfig | null;
  onChange: (config: OllamaConfig | null) => void;
  /** Avisa quando o campo de endereço está com o teclado aberto. */
  onTypingChange?: (typing: boolean) => void;
}

/** Liga o app ao Ollama: endereço, teste de conexão e escolha do modelo. */
export function OllamaSettings({ config, onChange, onTypingChange }: Props) {
  const db = useUserDb();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [url, setUrl] = useState(config?.url ?? '');
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState(config?.model ?? '');
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    setUrl(config?.url ?? '');
    setModel(config?.model ?? '');
  }, [config]);

  async function handleTest() {
    const normalized = normalizeOllamaUrl(url || DEFAULT_OLLAMA_URL);
    setUrl(normalized);
    setTesting(true);
    setMessage(null);
    try {
      const found = await listOllamaModels(normalized);
      setModels(found);
      if (found.length === 0) {
        setMessage({ text: 'Conectou! Mas não há modelos. No computador, rode: ollama pull llama3.1', error: true });
      } else {
        if (!found.includes(model)) setModel(found[0]);
        setMessage({ text: `Conectado! ${found.length} modelo(s) encontrado(s). Escolha um e salve.`, error: false });
      }
    } catch (error) {
      setMessage({
        text: error instanceof OllamaError ? error.message : 'Não foi possível conectar.',
        error: true,
      });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    if (!url || !model) return;
    const next = { url: normalizeOllamaUrl(url), model };
    await saveOllamaConfig(db, next);
    onChange(next);
    setMessage({ text: 'IA ativada! Sugestões e esboços agora usam o Ollama.', error: false });
  }

  async function handleDisconnect() {
    await clearOllamaConfig(db);
    onChange(null);
    setModels([]);
    setMessage({ text: 'Ollama desligado. O assistente volta ao modo básico, sem internet.', error: false });
  }

  const warnHttps = url ? mixedContentProblem(normalizeOllamaUrl(url)) : false;

  return (
    <View style={styles.container}>
      <Text style={styles.intro}>
        O Ollama roda uma IA no seu computador, de graça e sem mandar suas anotações para a
        internet. Com ele, o assistente entende o sentido do texto e escreve esboços completos.
      </Text>

      <View style={styles.steps}>
        <Text style={styles.step}>1. Instale em ollama.com e rode: ollama pull llama3.1</Text>
        <Text style={styles.step}>
          2. Para usar no celular, deixe o Ollama aberto na rede: OLLAMA_HOST=0.0.0.0 e
          OLLAMA_ORIGINS=*
        </Text>
        <Text style={styles.step}>3. Digite abaixo o IP do computador (ex.: 192.168.0.10).</Text>
      </View>

      <Text style={styles.label}>Endereço do Ollama</Text>
      <TextInput
        style={styles.input}
        value={url}
        onChangeText={setUrl}
        placeholder={DEFAULT_OLLAMA_URL}
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        onFocus={() => {
          onTypingChange?.(true);
          revealFocusedInput();
        }}
      />
      {warnHttps ? (
        <Text style={styles.warn}>
          No app do iPhone (site https), o navegador bloqueia endereços http. Use um endereço https
          (ex.: túnel do Cloudflare apontando para o Ollama) ou use o app Android/computador.
        </Text>
      ) : null}

      <Pressable
        style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
        onPress={handleTest}
        disabled={testing}
      >
        {testing ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons name="pulse-outline" size={17} color={colors.primary} />
        )}
        <Text style={styles.secondaryText}>{testing ? 'Testando...' : 'Testar conexão'}</Text>
      </Pressable>

      {models.length > 0 ? (
        <>
          <Text style={styles.label}>Modelo</Text>
          <View style={styles.chips}>
            {models.map((name) => (
              <Pressable
                key={name}
                onPress={() => setModel(name)}
                style={[styles.chip, model === name && styles.chipActive]}
              >
                <Text style={[styles.chipText, model === name && styles.chipTextActive]}>{name}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : config ? (
        <Text style={styles.current}>Modelo atual: {config.model}</Text>
      ) : null}

      {message ? (
        <Text style={[styles.message, message.error && styles.messageError]}>{message.text}</Text>
      ) : null}

      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          (!url || !model) && styles.disabled,
          pressed && styles.pressed,
        ]}
        onPress={handleSave}
        disabled={!url || !model}
      >
        <Text style={styles.primaryText}>Salvar e ativar IA</Text>
      </Pressable>

      {config ? (
        <Pressable onPress={handleDisconnect} hitSlop={8} style={styles.disconnect}>
          <Text style={styles.disconnectText}>Desligar Ollama</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { gap: 10 },
    intro: { fontSize: 13, lineHeight: 19, color: colors.textSecondary },
    steps: { backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 10, gap: 4 },
    step: { fontSize: 12, lineHeight: 17, color: colors.textPrimary },
    label: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginTop: 4 },
    // 16px: no iPhone, campos menores fazem a tela dar zoom ao tocar.
    input: {
      fontSize: 16,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.surface,
    },
    warn: { fontSize: 12, lineHeight: 17, color: colors.danger },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 16,
      backgroundColor: colors.surfaceAlt,
    },
    chipActive: { backgroundColor: colors.primary },
    chipText: { fontSize: 13, color: colors.textPrimary },
    chipTextActive: { color: colors.surface, fontWeight: '700' },
    current: { fontSize: 13, color: colors.textSecondary },
    message: { fontSize: 13, lineHeight: 18, color: colors.primary },
    messageError: { color: colors.danger },
    secondaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 11,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    secondaryText: { fontSize: 15, fontWeight: '700', color: colors.primary },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
    },
    primaryText: { color: colors.surface, fontWeight: '700', fontSize: 15 },
    disabled: { opacity: 0.45 },
    pressed: { opacity: 0.7 },
    disconnect: { alignSelf: 'center', paddingVertical: 4 },
    disconnectText: { fontSize: 13, color: colors.danger, fontWeight: '600' },
  });
}
