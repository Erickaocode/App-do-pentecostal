'use dom';

import { IS_DOM, useDOMImperativeHandle, type DOMImperativeFactory } from 'expo/dom';
import React, { useEffect, useRef, type Ref } from 'react';

/**
 * Editor de anotações com formatação, no estilo das Notas do iPhone.
 * No celular roda dentro de uma WebView; na web e no computador é uma página normal.
 * O conteúdo é HTML e não é controlado pelo React: o app só manda comandos.
 */

export type BlockStyle = 'h1' | 'h2' | 'h3' | 'div' | 'pre';
export type ListKind = 'bullet' | 'dash' | 'number' | 'checklist';

export interface EditorFormats {
  block: BlockStyle | 'blockquote';
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  list: ListKind | null;
  inTable: boolean;
}

export type EditorCommand =
  | { type: 'block'; value: BlockStyle }
  | { type: 'bold' | 'italic' | 'underline' | 'strikeThrough' }
  | { type: 'list'; value: ListKind }
  | { type: 'indent' | 'outdent' | 'quote' }
  | { type: 'color'; value: string | null }
  | { type: 'table' | 'tableRow' | 'tableCol' | 'tableDelete' }
  | { type: 'appendHtml'; value: string }
  | { type: 'focus' | 'blur' };

export interface RichNoteEditorRef extends DOMImperativeFactory {
  /** Os argumentos atravessam a ponte com o app, por isso são só texto. */
  run: (type: any, value: any) => void;
}

export interface EditorColors {
  text: string;
  secondary: string;
  primary: string;
  surface: string;
  border: string;
  background: string;
}

interface Props {
  ref?: Ref<RichNoteEditorRef>;
  /** Conteúdo inicial; volta a ser aplicado quando `docKey` muda. */
  initialHtml: string;
  docKey: string;
  placeholder: string;
  colors: EditorColors;
  onChange: (html: string, text: string) => Promise<void> | void;
  onFormats?: (formats: EditorFormats) => Promise<void> | void;
  onFocusChange?: (focused: boolean) => Promise<void> | void;
  onSelectText?: (text: string) => Promise<void> | void;
  dom?: import('expo/dom').DOMProps;
}

/** Cor "nenhuma": aplicada como cor provisória e depois removida. */
const NO_COLOR = '#010203';

const BLOCK_TAGS = ['H1', 'H2', 'H3', 'PRE', 'BLOCKQUOTE'];

function plainText(editor: HTMLElement): string {
  return editor.innerText.replace(/ /g, ' ');
}

function closest(node: Node | null, selector: string, editor: HTMLElement): HTMLElement | null {
  let el: Node | null = node;
  if (el && el.nodeType !== 1) el = el.parentNode;
  const found = el ? (el as HTMLElement).closest(selector) : null;
  return found && editor.contains(found) && found !== editor ? (found as HTMLElement) : null;
}

function listKindOf(list: HTMLElement): ListKind {
  if (list.tagName === 'OL') return 'number';
  if (list.classList.contains('checklist')) return 'checklist';
  if (list.classList.contains('dashed')) return 'dash';
  return 'bullet';
}

export default function RichNoteEditor({
  ref,
  initialHtml,
  docKey,
  placeholder,
  colors,
  onChange,
  onFormats,
  onFocusChange,
  onSelectText,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const changeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFormats = useRef('');
  const lastSelected = useRef('');
  const callbacks = useRef({ onChange, onFormats, onFocusChange, onSelectText });
  callbacks.current = { onChange, onFormats, onFocusChange, onSelectText };

  function updateEmpty() {
    const editor = editorRef.current;
    if (!editor) return;
    const empty =
      !plainText(editor).trim() && !editor.querySelector('li, table, hr');
    editor.classList.toggle('is-empty', empty);
  }

  function emitChange(immediate = false) {
    updateEmpty();
    if (changeTimer.current) clearTimeout(changeTimer.current);
    const send = () => {
      changeTimer.current = null;
      const editor = editorRef.current;
      if (!editor) return;
      callbacks.current.onChange(editor.innerHTML, plainText(editor));
    };
    if (immediate) send();
    else changeTimer.current = setTimeout(send, 120);
  }

  function selectionInEditor(): Selection | null {
    const editor = editorRef.current;
    const sel = window.getSelection();
    if (!editor || !sel || sel.rangeCount === 0) return null;
    return editor.contains(sel.anchorNode) ? sel : null;
  }

  function emitFormats() {
    const editor = editorRef.current;
    const sel = selectionInEditor();
    if (!editor || !sel) return;
    savedRange.current = sel.getRangeAt(0).cloneRange();
    const anchor = sel.anchorNode;
    const blockEl = closest(anchor, 'h1, h2, h3, pre, blockquote', editor);
    const listEl = closest(anchor, 'ul, ol', editor);
    const formats: EditorFormats = {
      block: blockEl ? (blockEl.tagName.toLowerCase() as EditorFormats['block']) : 'div',
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strike: document.queryCommandState('strikeThrough'),
      list: listEl ? listKindOf(listEl) : null,
      inTable: !!closest(anchor, 'td, th', editor),
    };
    const key = JSON.stringify(formats);
    if (key !== lastFormats.current) {
      lastFormats.current = key;
      callbacks.current.onFormats?.(formats);
    }
    const selected = sel.toString();
    if (selected !== lastSelected.current) {
      lastSelected.current = selected;
      callbacks.current.onSelectText?.(selected);
    }
  }

  /** Devolve o cursor para onde estava antes de tocar num botão fora do editor. */
  function restoreSelection() {
    const editor = editorRef.current;
    if (!editor) return;
    if (document.activeElement !== editor) editor.focus({ preventScroll: true });
    const sel = window.getSelection();
    if (!sel) return;
    if (selectionInEditor()) return;
    if (savedRange.current && editor.contains(savedRange.current.startContainer)) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    } else {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  function scrollCaretIntoView() {
    const sel = selectionInEditor();
    if (!sel) return;
    const range = sel.getRangeAt(0);
    let rect = range.getBoundingClientRect();
    if (!rect || (rect.top === 0 && rect.bottom === 0)) {
      const node = range.startContainer;
      const el = (node.nodeType === 1 ? node : node.parentNode) as HTMLElement | null;
      if (!el?.getBoundingClientRect) return;
      rect = el.getBoundingClientRect();
    }
    const margin = 24;
    if (rect.bottom > window.innerHeight - margin) {
      window.scrollBy(0, rect.bottom - window.innerHeight + margin);
    } else if (rect.top < margin) {
      window.scrollBy(0, rect.top - margin);
    }
  }

  function applyList(kind: ListKind) {
    const editor = editorRef.current!;
    const sel = selectionInEditor();
    const current = sel ? closest(sel.anchorNode, 'ul, ol', editor) : null;
    const currentKind = current ? listKindOf(current) : null;
    if (current && currentKind === kind) {
      // Tocar de novo no mesmo tipo de lista tira a lista.
      document.execCommand(current.tagName === 'OL' ? 'insertOrderedList' : 'insertUnorderedList');
      return;
    }
    const wantsOl = kind === 'number';
    const isOl = current?.tagName === 'OL';
    if (!current || wantsOl !== isOl) {
      document.execCommand(wantsOl ? 'insertOrderedList' : 'insertUnorderedList');
    }
    const after = selectionInEditor();
    const list = after ? closest(after.anchorNode, 'ul, ol', editor) : null;
    if (!list) return;
    list.classList.remove('dashed', 'checklist');
    list.removeAttribute('style');
    if (kind === 'dash') list.classList.add('dashed');
    if (kind === 'checklist') list.classList.add('checklist');
    if (kind !== 'checklist') {
      list.querySelectorAll('li.checked').forEach((li) => li.classList.remove('checked'));
    }
  }

  function applyColor(color: string | null) {
    const editor = editorRef.current!;
    document.execCommand('styleWithCSS', false, 'false');
    document.execCommand('foreColor', false, color ?? NO_COLOR);
    if (color) return;
    editor.querySelectorAll('font').forEach((font) => {
      if ((font.getAttribute('color') ?? '').toLowerCase() !== NO_COLOR) return;
      const parent = font.parentNode!;
      while (font.firstChild) parent.insertBefore(font.firstChild, font);
      parent.removeChild(font);
    });
  }

  function insertTable() {
    const cell = '<td><br></td>';
    const row = `<tr>${cell}${cell}</tr>`;
    document.execCommand(
      'insertHTML',
      false,
      `<table data-new="1">${row}${row}</table><div><br></div>`
    );
    // Coloca o cursor na primeira célula da tabela nova.
    const table = editorRef.current?.querySelector('table[data-new]');
    if (!table) return;
    table.removeAttribute('data-new');
    const first = table.querySelector('td');
    const sel = window.getSelection();
    if (!first || !sel) return;
    const range = document.createRange();
    range.setStart(first, 0);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function tableAction(action: 'tableRow' | 'tableCol' | 'tableDelete') {
    const editor = editorRef.current!;
    const sel = selectionInEditor();
    const cell = sel ? closest(sel.anchorNode, 'td, th', editor) : null;
    const table = cell?.closest('table');
    if (!cell || !table) return;
    const row = cell.parentElement as HTMLTableRowElement;
    if (action === 'tableDelete') {
      const after = document.createElement('div');
      after.innerHTML = '<br>';
      table.replaceWith(after);
      const range = document.createRange();
      range.setStart(after, 0);
      range.collapse(true);
      sel!.removeAllRanges();
      sel!.addRange(range);
      return;
    }
    if (action === 'tableRow') {
      const newRow = document.createElement('tr');
      for (let i = 0; i < row.cells.length; i++) newRow.innerHTML += '<td><br></td>';
      row.after(newRow);
      const range = document.createRange();
      range.setStart(newRow.cells[0], 0);
      range.collapse(true);
      sel!.removeAllRanges();
      sel!.addRange(range);
      return;
    }
    const index = (cell as HTMLTableCellElement).cellIndex;
    Array.from(table.rows).forEach((r) => {
      const td = document.createElement('td');
      td.innerHTML = '<br>';
      const ref = r.cells[index];
      if (ref) ref.after(td);
      else r.appendChild(td);
    });
  }

  function run(command: EditorCommand) {
    const editor = editorRef.current;
    if (!editor) return;
    if (command.type === 'blur') {
      editor.blur();
      return;
    }
    if (command.type === 'appendHtml') {
      const last = editor.lastElementChild;
      const lastEmpty = last && !last.textContent?.trim() && !last.querySelector('table, li');
      if (lastEmpty) last.remove();
      const needsGap = !!plainText(editor).trim();
      editor.insertAdjacentHTML(
        'beforeend',
        `${needsGap ? '<div><br></div>' : ''}${command.value}`
      );
      emitChange(true);
      return;
    }
    restoreSelection();
    document.execCommand('defaultParagraphSeparator', false, 'div');
    switch (command.type) {
      case 'focus':
        break;
      case 'block': {
        const sel = selectionInEditor();
        const current = sel ? closest(sel.anchorNode, 'h1, h2, h3, pre', editor) : null;
        const tag =
          current && current.tagName.toLowerCase() === command.value ? 'div' : command.value;
        document.execCommand('formatBlock', false, `<${tag}>`);
        break;
      }
      case 'bold':
      case 'italic':
      case 'underline':
      case 'strikeThrough':
        document.execCommand(command.type);
        break;
      case 'list':
        applyList(command.value);
        break;
      case 'indent':
      case 'outdent':
        document.execCommand(command.type);
        break;
      case 'quote': {
        const sel = selectionInEditor();
        const inQuote = sel ? closest(sel.anchorNode, 'blockquote', editor) : null;
        if (inQuote) {
          const div = document.createElement('div');
          while (inQuote.firstChild) div.appendChild(inQuote.firstChild);
          inQuote.replaceWith(div);
        } else {
          document.execCommand('formatBlock', false, '<blockquote>');
        }
        break;
      }
      case 'color':
        applyColor(command.value);
        break;
      case 'table':
        insertTable();
        break;
      case 'tableRow':
      case 'tableCol':
      case 'tableDelete':
        tableAction(command.type);
        break;
    }
    emitChange(true);
    emitFormats();
  }

  useDOMImperativeHandle(
    ref as Ref<RichNoteEditorRef>,
    () => ({
      run: (type: any, value: any) => run({ type, value } as EditorCommand),
    }),
    []
  );

  // Carrega o conteúdo quando a anotação muda (não a cada tecla).
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.innerHTML = initialHtml;
    updateEmpty();
  }, [docKey]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const onSelection = () => {
      if (selectionInEditor()) emitFormats();
    };
    const onInput = (event: Event) => {
      const inputType = (event as InputEvent).inputType;
      if (inputType === 'insertParagraph') {
        // Item novo de lista de tarefas começa desmarcado.
        const sel = selectionInEditor();
        const li = sel ? closest(sel.anchorNode, 'li', editor) : null;
        if (li && !li.textContent?.trim()) li.classList.remove('checked');
      }
      emitChange();
      emitFormats();
      requestAnimationFrame(scrollCaretIntoView);
    };
    const onClick = (event: MouseEvent) => {
      const li = closest(event.target as Node, 'ul.checklist > li', editor);
      if (!li) return;
      const rect = li.getBoundingClientRect();
      if (event.clientX - rect.left > 30) return;
      event.preventDefault();
      li.classList.toggle('checked');
      emitChange(true);
    };
    const onPaste = (event: ClipboardEvent) => {
      // Cola só o texto, para não trazer cores e fontes de outros lugares.
      const text = event.clipboardData?.getData('text/plain');
      if (text == null) return;
      event.preventDefault();
      document.execCommand('insertText', false, text);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const sel = selectionInEditor();
      const node = sel?.anchorNode ?? null;
      const cell = closest(node, 'td, th', editor);
      if (cell) {
        // Tab anda pelas células da tabela; na última, cria uma linha nova.
        event.preventDefault();
        const cells = Array.from(cell.closest('table')!.querySelectorAll('td, th'));
        let index = cells.indexOf(cell) + (event.shiftKey ? -1 : 1);
        if (index >= cells.length) {
          tableAction('tableRow');
          emitChange(true);
          return;
        }
        index = Math.max(0, index);
        const range = document.createRange();
        range.selectNodeContents(cells[index]);
        range.collapse(false);
        sel!.removeAllRanges();
        sel!.addRange(range);
        return;
      }
      if (closest(node, 'li', editor)) {
        // Tab numa lista aumenta o recuo; Shift+Tab diminui.
        event.preventDefault();
        document.execCommand(event.shiftKey ? 'outdent' : 'indent');
        emitChange(true);
      }
    };
    const onFocus = () => callbacks.current.onFocusChange?.(true);
    const onBlur = () => {
      callbacks.current.onFocusChange?.(false);
      if (changeTimer.current) emitChange(true);
    };
    const onResize = () => requestAnimationFrame(scrollCaretIntoView);

    document.addEventListener('selectionchange', onSelection);
    editor.addEventListener('input', onInput);
    editor.addEventListener('click', onClick);
    editor.addEventListener('paste', onPaste);
    editor.addEventListener('keydown', onKeyDown);
    editor.addEventListener('focus', onFocus);
    editor.addEventListener('blur', onBlur);
    if (IS_DOM) window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('selectionchange', onSelection);
      editor.removeEventListener('input', onInput);
      editor.removeEventListener('click', onClick);
      editor.removeEventListener('paste', onPaste);
      editor.removeEventListener('keydown', onKeyDown);
      editor.removeEventListener('focus', onFocus);
      editor.removeEventListener('blur', onBlur);
      if (IS_DOM) window.removeEventListener('resize', onResize);
    };
  }, []);

  const vars = {
    '--text': colors.text,
    '--secondary': colors.secondary,
    '--primary': colors.primary,
    '--surface': colors.surface,
    '--border': colors.border,
    '--bg': colors.background,
  } as React.CSSProperties;

  return (
    <div className={IS_DOM ? 'rne-root rne-native' : 'rne-root'} style={vars}>
      <style>{CSS}</style>
      <div
        ref={editorRef}
        className="rne-editor is-empty"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        spellCheck
        autoCapitalize="sentences"
      />
    </div>
  );
}

const CHECK_SVG =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M6 12.5l4 4 8-9' fill='none' stroke='white' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'/></svg>\")";

const CSS = `
html, body { margin: 0; padding: 0; background: transparent; }
.rne-native { min-height: 100vh; }
.rne-root:not(.rne-native) { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; }
.rne-root {
  color: var(--text);
  background: var(--bg);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-text-size-adjust: 100%;
  -webkit-tap-highlight-color: transparent;
}
.rne-editor {
  flex: 1;
  min-height: 240px;
  padding: 4px 16px 120px;
  outline: none;
  font-size: 16px;
  line-height: 1.45;
  word-wrap: break-word;
  overflow-wrap: anywhere;
  caret-color: var(--primary);
}
.rne-native .rne-editor { min-height: calc(100vh - 8px); box-sizing: border-box; }
.rne-editor.is-empty::before {
  content: attr(data-placeholder);
  color: var(--secondary);
  position: absolute;
  pointer-events: none;
}
.rne-editor h1 { font-size: 27px; line-height: 1.25; font-weight: 700; margin: 6px 0 2px; }
.rne-editor h2 { font-size: 21px; line-height: 1.3; font-weight: 700; margin: 6px 0 2px; }
.rne-editor h3 { font-size: 17px; line-height: 1.35; font-weight: 600; margin: 4px 0 2px; }
.rne-editor pre {
  font-family: ui-monospace, Menlo, Consolas, 'Roboto Mono', monospace;
  font-size: 14.5px;
  white-space: pre-wrap;
  margin: 0;
}
.rne-editor blockquote {
  margin: 4px 0;
  padding: 2px 0 2px 12px;
  border-left: 3px solid var(--primary);
  color: var(--secondary);
}
.rne-editor ul, .rne-editor ol { margin: 0; padding-left: 28px; }
.rne-editor ul.dashed { list-style: none; }
.rne-editor ul.dashed > li::before { content: '–'; display: inline-block; width: 18px; margin-left: -18px; }
.rne-editor ul.checklist { list-style: none; padding-left: 4px; }
.rne-editor ul.checklist > li { position: relative; padding-left: 30px; margin: 4px 0; }
.rne-editor ul.checklist > li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.12em;
  width: 20px;
  height: 20px;
  box-sizing: border-box;
  border-radius: 50%;
  border: 1.6px solid var(--secondary);
  cursor: pointer;
}
.rne-editor ul.checklist > li.checked::before {
  background: var(--primary) ${CHECK_SVG} center / 16px no-repeat;
  border-color: var(--primary);
}
.rne-editor ul.checklist > li.checked { color: var(--secondary); }
.rne-editor table {
  border-collapse: collapse;
  width: 100%;
  margin: 6px 0;
  table-layout: fixed;
}
.rne-editor td, .rne-editor th {
  border: 1px solid var(--border);
  padding: 6px 8px;
  vertical-align: top;
  min-width: 40px;
}
.rne-editor hr { border: none; border-top: 1px solid var(--border); }
`;
