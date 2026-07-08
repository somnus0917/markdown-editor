import { indentWithTab } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { autocompletion } from "@codemirror/autocomplete";
import { searchKeymap } from "@codemirror/search";
import { EditorState, Extension } from "@codemirror/state";
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
import { defaultHighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { useEffect, useMemo, useRef } from "react";

type EditorProps = {
  value: string;
  onChange: (value: string) => void;
};

const editorTheme = EditorView.theme(
  {
    "&": {
      height: "100%",
      color: "#d8dee9",
      backgroundColor: "#111318",
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
      caretColor: "#f3f6ff",
    },
    ".cm-gutters": {
      backgroundColor: "#111318",
      color: "#5d6472",
      borderRight: "1px solid #242936",
    },
    ".cm-activeLine": {
      backgroundColor: "#181c24",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "#181c24",
      color: "#aab2c5",
    },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
      backgroundColor: "#33415f",
    },
    "&.cm-focused": {
      outline: "none",
    },
  },
  { dark: true },
);

function Editor({ value, onChange }: EditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
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
      editorTheme,
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

        const nextValue = update.state.doc.toString();
        valueRef.current = nextValue;
        onChangeRef.current(nextValue);
      }),
    ],
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

    const currentValue = view.state.doc.toString();
    if (value === currentValue) {
      return;
    }

    view.dispatch({
      changes: {
        from: 0,
        to: currentValue.length,
        insert: value,
      },
    });
  }, [value]);

  return (
    <section className="editor-pane" aria-label="Markdown source editor">
      <div ref={hostRef} className="editor-host" />
    </section>
  );
}

export default Editor;
