import { useEffect, useRef, useState, type RefObject } from 'react';
import { Keyboard, Platform, type KeyboardEvent, type View } from 'react-native';

/** Abaixo disso é só diferença de barra do navegador, não o teclado. */
const MIN_KEYBOARD_PX = 80;

/**
 * Quanto o teclado cobre da parte de baixo da tela `containerRef`.
 *
 * Mede o teclado direto, sem depender do KeyboardAvoidingView, que não acompanha
 * o teclado no Android de borda a borda nem no app web do iPhone.
 */
export function useKeyboardInset(containerRef: RefObject<View | null>) {
  const [inset, setInset] = useState(0);
  const insetRef = useRef(0);
  const [webOpen, setWebOpen] = useState(false);

  useEffect(() => {
    const apply = (value: number) => {
      const next = value > MIN_KEYBOARD_PX ? Math.round(value) : 0;
      if (next === insetRef.current) return;
      insetRef.current = next;
      setInset(next);
    };

    if (Platform.OS === 'web') {
      // Na web o app inteiro já encolhe até a borda do teclado (ver public/index.html),
      // então não precisa de espaço extra: só saber se o teclado está aberto.
      return subscribeWebKeyboard((open) => {
        insetRef.current = 0;
        setInset(0);
        setWebOpen(open);
      });
    }

    const onShow = (event: KeyboardEvent) => {
      const keyboardTop = event.endCoordinates.screenY;
      const node = containerRef.current;
      if (!node) return;
      node.measureInWindow((_x, y, _width, height) => apply(y + height - keyboardTop));
    };
    const onHide = () => apply(0);
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subs = [Keyboard.addListener(showEvent, onShow), Keyboard.addListener(hideEvent, onHide)];
    return () => subs.forEach((sub) => sub.remove());
  }, [containerRef]);

  return { inset, keyboardVisible: inset > 0 || webOpen };
}

/**
 * Teclado aberto na web: a parte visível da tela fica bem menor que a página.
 * No iPhone a página (innerHeight) não muda com o teclado, só o visualViewport.
 */
function webKeyboardOpen(): boolean {
  const viewport = window.visualViewport;
  if (!viewport) return false;
  return window.innerHeight - viewport.height > MIN_KEYBOARD_PX;
}

function subscribeWebKeyboard(listener: (open: boolean) => void): () => void {
  const viewport = typeof window !== 'undefined' ? window.visualViewport : null;
  if (!viewport) return () => {};
  const update = () => listener(webKeyboardOpen());
  viewport.addEventListener('resize', update);
  update();
  return () => viewport.removeEventListener('resize', update);
}

/** Só diz se o teclado está aberto (ex.: para esconder a barra de abas). */
export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return subscribeWebKeyboard(setOpen);
    const subs = [
      Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () =>
        setOpen(true)
      ),
      Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () =>
        setOpen(false)
      ),
    ];
    return () => subs.forEach((sub) => sub.remove());
  }, []);
  return open;
}

/**
 * Na web, rola até o campo que acabou de ganhar o foco depois que o teclado termina de
 * subir: o iPhone não rola áreas internas (como a gaveta do assistente) sozinho.
 */
export function revealFocusedInput() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  setTimeout(() => {
    const el = document.activeElement as HTMLElement | null;
    el?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  }, 350);
}
