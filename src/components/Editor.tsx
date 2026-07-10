import { indentWithTab } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { autocompletion } from "@codemirror/autocomplete";
import { searchKeymap } from "@codemirror/search";
import { Compartment, EditorState, Extension } from "@codemirror/state";
import {
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  keymap,
  lineNumbers,
  rectangularSelection,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  defaultHighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import type { ThemeMode } from "../App";

type EditorProps = {
  value: string;
  theme: ThemeMode;
  onChange: (value: string) => void;
};

export type EditorHandle = {
  toggleBold: () => void;
  toggleItalic: () => void;
  focus: () => void;
};

const editorTheme = (theme: ThemeMode) => {
  const dark = theme === "dark";

  return EditorView.theme(
    {
      "&": {
        height: "100%",
        color: dark ? "#d8dee9" : "#273142",
        backgroundColor: dark ? "#111318" : "#fbfcff",
        fontSize: "14px",
      },
      ".cm-scroller": {
        fontFamily:
          '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
        lineHeight: "1.65",
        overflow: "auto",
      },
      ".cm-content": {
        padding: "22px 24px 48px",
        caretColor: dark ? "#f3f6ff" : "#24324a",
      },
      ".cm-gutters": {
        backgroundColor: dark ? "#111318" : "#f2f5fa",
        color: dark ? "#5d6472" : "#8a95a8",
        borderRight: `1px solid ${dark ? "#242936" : "#dbe2ee"}`,
      },
      ".cm-activeLine": {
        backgroundColor: dark ? "#181c24" : "#f1f5fb",
      },
      ".cm-activeLineGutter": {
        backgroundColor: dark ? "#181c24" : "#edf2f8",
        color: dark ? "#aab2c5" : "#526078",
      },
      ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
        backgroundColor: dark ? "#33415f" : "#c8d9ff",
      },
      "&.cm-focused": {
        outline: "none",
      },
    },
    { dark },
  );
};

const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { value, theme, onChange },
  ref,
) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeCompartmentRef = useRef(new Compartment());
  const suppressChangeRef = useRef(false);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const extensions = useMemo<Extension[]>(
    () => [
      lineNumbers(),
      history(),
      drawSelection(),
      dropCursor(),
      rectangularSelection(),
      highlightActiveLine(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      markdown(),
      autocompletion(),
      EditorView.lineWrapping,
      themeCompartmentRef.current.of(editorTheme(theme)),
      keymap.of([
        indentWithTab,
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
      ]),
      EditorView.updateListener.of((update) => {
        if (!update.docChanged) {
          return;
        }

        if (suppressChangeRef.current) {
          return;
        }

        const nextValue = update.state.doc.toString();
        valueRef.current = nextValue;
        onChangeRef.current(nextValue);
      }),
    ],
    [],
  );

  useImperativeHandle(
    ref,
    () => ({
      toggleBold: () => toggleMarkup(viewRef.current, "**"),
      toggleItalic: () => toggleMarkup(viewRef.current, "*"),
      focus: () => viewRef.current?.focus(),
    }),
    [],
  );

  useEffect(() => {
    if (!hostRef.current) {
      return;
    }

    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: valueRef.current,
        extensions,
      }),
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [extensions]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }

    view.dispatch({
      effects: themeCompartmentRef.current.reconfigure(editorTheme(theme)),
    });
  }, [theme]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }

    const currentValue = view.state.doc.toString();
    if (value === currentValue) {
      return;
    }

    suppressChangeRef.current = true;
    view.dispatch({
      changes: {
        from: 0,
        to: currentValue.length,
        insert: value,
      },
    });
    suppressChangeRef.current = false;
    valueRef.current = value;
  }, [value]);

  return (
    <section className="editor-pane" aria-label="Markdown source editor">
      <div ref={hostRef} className="editor-host" />
    </section>
  );
});

function toggleMarkup(view: EditorView | null, marker: string) {
  if (!view) {
    return;
  }

  const selection = view.state.selection.main;
  const selectedText = view.state.sliceDoc(selection.from, selection.to);

  if (selection.empty) {
    view.dispatch({
      changes: {
        from: selection.from,
        insert: `${marker}${marker}`,
      },
      selection: {
        anchor: selection.from + marker.length,
      },
    });
    view.focus();
    return;
  }

  view.dispatch({
    changes: {
      from: selection.from,
      to: selection.to,
      insert: `${marker}${selectedText}${marker}`,
    },
    selection: {
      anchor: selection.from + marker.length,
      head: selection.to + marker.length,
    },
  });
  view.focus();
}

export default Editor;
