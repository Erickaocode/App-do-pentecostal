import { Alert, Platform } from 'react-native';

/**
 * No react-native-web o `Alert.alert` não faz nada, então na web (e no app desktop, que
 * usa o build web) os avisos e confirmações caem para os diálogos do navegador.
 */

export function showMessage(title: string, message: string): void {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

/** Pergunta antes de uma ação (ex: excluir); resolve `true` se a pessoa confirmar. */
export function confirmAction(options: {
  title: string;
  message: string;
  confirmText: string;
}): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${options.title}\n\n${options.message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(
      options.title,
      options.message,
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
        { text: options.confirmText, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
