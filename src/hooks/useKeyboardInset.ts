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

  useEffect(() => {
    const apply = (value: number) => {
      const next = value > MIN_KEYBOARD_PX ? Math.round(value) : 0;
      if (next === insetRef.current) return;
      insetRef.current = next;
      setInset(next);
    };

    if (Platform.OS === 'web') {
      const viewport = typeof window !== 'undefined' ? window.visualViewport : null;
      if (!viewport) return;
      const update = () => {
        const node = containerRef.current as unknown as HTMLElement | null;
        if (!node?.getBoundingClientRect) return;
        // O padding fica dentro da caixa, então a borda de baixo não muda com ele.
        const bottom = node.getBoundingClientRect().bottom;
        apply(bottom - (viewport.offsetTop + viewport.height));
      };
      viewport.addEventListener('resize', update);
      viewport.addEventListener('scroll', update);
      update();
      return () => {
        viewport.removeEventListener('resize', update);
        viewport.removeEventListener('scroll', update);
      };
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

  return { inset, keyboardVisible: inset > 0 };
}
