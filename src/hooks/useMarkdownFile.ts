import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { useCallback, useMemo, useState } from "react";
import { getDirName, getFileName } from "../utils/paths";

const MARKDOWN_FILTERS = [
  {
    name: "Markdown",
    extensions: ["md", "markdown"],
  },
];

export const INITIAL_MARKDOWN = `# Markdown Editor MVP

Welcome to a local-first Markdown editor built with Tauri, React, CodeMirror, markdown-it, and MathJax.

## Basics

- Live preview while you type
- **Bold**, *italic*, and ~~strikethrough~~
- Inline code like \`const answer = 42\`
- Links: [Tauri](https://tauri.app)

## Code

\`\`\`ts
type Note = {
  title: string;
  dirty: boolean;
};
\`\`\`

## Table

| Feature | Status |
| --- | --- |
| Open Markdown | Ready |
| Save Markdown | Ready |
| MathJax preview | Ready |

## Quote

> Keep the source on the left, and let the preview breathe on the right.

## Math

Inline formula: $E = mc^2$

Block formula:

$$
\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}
$$

---

Try opening a local \`.md\` file, or save this draft as a new note.
`;

export function useMarkdownFile() {
  const [content, setContentState] = useState(INITIAL_MARKDOWN);
  const [savedContent, setSavedContent] = useState(INITIAL_MARKDOWN);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dirty = content !== savedContent;
  const fileName = useMemo(() => getFileName(currentPath), [currentPath]);
  const baseDir = useMemo(() => getDirName(currentPath), [currentPath]);

  const setContent = useCallback((nextContent: string) => {
    setContentState(nextContent);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const newFile = useCallback(() => {
    setContentState("");
    setSavedContent("");
    setCurrentPath(null);
    setError(null);
  }, []);

  const openPath = useCallback(async (path: string) => {
    try {
      setError(null);
      const fileContent = await invoke<string>("read_text_file", { path });
      setContentState(fileContent);
      setSavedContent(fileContent);
      setCurrentPath(path);
    } catch (caughtError) {
      setError(`Open failed: ${formatError(caughtError)}`);
    }
  }, []);

  const openFile = useCallback(async () => {
    try {
      setError(null);
      const selected = await open({
        multiple: false,
        directory: false,
        filters: MARKDOWN_FILTERS,
      });

      if (!selected) {
        return;
      }

      const path = Array.isArray(selected) ? selected[0] : selected;
      if (!path) {
        return;
      }

      await openPath(path);
    } catch (caughtError) {
      setError(`Open failed: ${formatError(caughtError)}`);
    }
  }, [openPath]);

  const saveToPath = useCallback(
    async (path: string) => {
      await invoke<void>("write_text_file", { path, content });
      setSavedContent(content);
      setCurrentPath(path);
      setError(null);
    },
    [content],
  );

  const saveFileAs = useCallback(async () => {
    try {
      setError(null);
      const selectedPath = await save({
        filters: MARKDOWN_FILTERS,
        defaultPath: currentPath ?? "Untitled.md",
      });

      if (!selectedPath) {
        return;
      }

      await saveToPath(selectedPath);
    } catch (caughtError) {
      setError(`Save as failed: ${formatError(caughtError)}`);
    }
  }, [currentPath, saveToPath]);

  const saveFile = useCallback(async () => {
    if (!currentPath) {
      await saveFileAs();
      return;
    }

    try {
      setError(null);
      await saveToPath(currentPath);
    } catch (caughtError) {
      setError(`Save failed: ${formatError(caughtError)}`);
    }
  }, [currentPath, saveFileAs, saveToPath]);

  return {
    content,
    currentPath,
    dirty,
    error,
    fileName,
    baseDir,
    setContent,
    clearError,
    newFile,
    openPath,
    openFile,
    saveFile,
    saveFileAs,
  };
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown error";
}
