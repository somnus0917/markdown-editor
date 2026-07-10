import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import Editor, { type EditorHandle } from "./components/Editor";
import FileTree from "./components/FileTree";
import Preview from "./components/Preview";
import Toolbar from "./components/Toolbar";
import { useDraftRecovery } from "./hooks/useDraftRecovery";
import { useMarkdownFile } from "./hooks/useMarkdownFile";
import { useWorkspaceTree } from "./hooks/useWorkspaceTree";
import {
  confirmUnsavedChanges,
  type UnsavedDecision,
} from "./utils/unsavedChanges";
import "./App.css";

export type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "markdown-editor-theme";
const FILE_TREE_VISIBLE_STORAGE_KEY = "markdown-editor-file-tree-visible";
const LAST_FILE_KEY = "markdown-editor-last-file";

function App() {
  const editorRef = useRef<EditorHandle | null>(null);
  const allowCloseRef = useRef(false);
  const dirtyRef = useRef(false);
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());
  const [fileTreeVisible, setFileTreeVisible] = useState(() =>
    getInitialFileTreeVisible(),
  );
  const [draftChecked, setDraftChecked] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const {
    content,
    currentPath,
    dirty,
    error,
    fileName,
    baseDir,
    setContent,
    savedContent,
    clearError,
    newFile,
    restoreFileState,
    openPath,
    openFile,
    saveFile,
    saveFileAs,
  } = useMarkdownFile();
  const {
    workspacePath,
    workspaceName,
    entries,
    expandedPaths,
    loading: workspaceLoading,
    error: workspaceError,
    openWorkspace,
    refreshWorkspace,
    toggleDirectory,
    expandSelectedPath,
    clearWorkspaceError,
  } = useWorkspaceTree();

  useDraftRecovery({
    content,
    currentPath,
    savedContent,
    dirty,
    onRestore: restoreFileState,
    onChecked: (restored) => {
      setDraftRestored(restored);
      setDraftChecked(true);
    },
  });

  useEffect(() => {
    document.title = `${dirty ? "* " : ""}${fileName} - Markdown Editor`;
  }, [dirty, fileName]);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    if (!draftChecked || !currentPath) {
      return;
    }

    localStorage.setItem(LAST_FILE_KEY, currentPath);
  }, [currentPath, draftChecked]);

  useEffect(() => {
    if (!draftChecked || draftRestored || currentPath) {
      return;
    }

    const lastFile = localStorage.getItem(LAST_FILE_KEY);
    if (!lastFile) {
      return;
    }

    void openPath(lastFile);
  }, [currentPath, draftChecked, draftRestored, openPath]);

  useEffect(() => {
    expandSelectedPath(currentPath);
  }, [currentPath, expandSelectedPath]);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(
      FILE_TREE_VISIBLE_STORAGE_KEY,
      fileTreeVisible ? "true" : "false",
    );
  }, [fileTreeVisible]);

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  };

  const toggleFileTree = () => {
    setFileTreeVisible((currentVisibility) => !currentVisibility);
  };

  const runAfterUnsavedCheck = useCallback(
    async (
      action: () => Promise<boolean> | boolean | void,
    ): Promise<boolean> => {
      if (dirtyRef.current) {
        const decision: UnsavedDecision = await confirmUnsavedChanges();

        if (decision === "cancel") {
          return false;
        }

        if (decision === "save") {
          const saved = await saveFile();
          if (!saved) {
            return false;
          }
        }
      }

      const result = await action();
      return result !== false;
    },
    [saveFile],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const modifierPressed = event.metaKey || event.ctrlKey;
      if (!modifierPressed) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "n") {
        event.preventDefault();
        void runAfterUnsavedCheck(() => {
          newFile();
          localStorage.removeItem(LAST_FILE_KEY);
        });
      } else if (key === "o") {
        event.preventDefault();
        void runAfterUnsavedCheck(openFile);
      } else if (key === "s" && event.shiftKey) {
        event.preventDefault();
        void saveFileAs();
      } else if (key === "s") {
        event.preventDefault();
        void saveFile();
      } else if (key === "b") {
        event.preventDefault();
        editorRef.current?.toggleBold();
      } else if (key === "i") {
        event.preventDefault();
        editorRef.current?.toggleItalic();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [newFile, openFile, runAfterUnsavedCheck, saveFile, saveFileAs]);

  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    let unlisten: (() => void) | null = null;
    const appWindow = getCurrentWindow();

    void appWindow
      .onCloseRequested(async (event) => {
        if (allowCloseRef.current || !dirtyRef.current) {
          return;
        }

        event.preventDefault();
        const canClose = await runAfterUnsavedCheck(() => true);
        if (!canClose) {
          return;
        }

        allowCloseRef.current = true;
        await appWindow.close();
      })
      .then((unlistenClose) => {
        unlisten = unlistenClose;
      });

    return () => {
      unlisten?.();
    };
  }, [runAfterUnsavedCheck]);

  const handleNewFile = () => {
    void runAfterUnsavedCheck(() => {
      newFile();
      localStorage.removeItem(LAST_FILE_KEY);
    });
  };

  const handleOpenFile = () => {
    void runAfterUnsavedCheck(openFile);
  };

  const handleOpenWorkspace = () => {
    void runAfterUnsavedCheck(openWorkspace);
  };

  const handleOpenPath = (path: string) => {
    void runAfterUnsavedCheck(() => openPath(path));
  };

  return (
    <main className="app-shell">
      <Toolbar
        fileName={fileName}
        filePath={currentPath}
        dirty={dirty}
        theme={theme}
        fileTreeVisible={fileTreeVisible}
        onNew={handleNewFile}
        onOpen={handleOpenFile}
        onOpenWorkspace={handleOpenWorkspace}
        onSave={saveFile}
        onSaveAs={saveFileAs}
        onToggleTheme={toggleTheme}
        onToggleFileTree={toggleFileTree}
      />

      {error ? (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button type="button" onClick={clearError} aria-label="Dismiss error">
            Dismiss
          </button>
        </div>
      ) : null}

      <section className="workspace" aria-label="Markdown editor workspace">
        {fileTreeVisible ? (
          <FileTree
            workspacePath={workspacePath}
            workspaceName={workspaceName}
            entries={entries}
            selectedPath={currentPath}
            expandedPaths={expandedPaths}
            loading={workspaceLoading}
            error={workspaceError}
            onOpenWorkspace={handleOpenWorkspace}
            onRefreshWorkspace={refreshWorkspace}
            onOpenFile={handleOpenPath}
            onToggleDirectory={toggleDirectory}
            onDismissError={clearWorkspaceError}
          />
        ) : null}
        <Editor
          ref={editorRef}
          value={content}
          theme={theme}
          onChange={setContent}
        />
        <Preview
          markdown={content}
          baseDir={baseDir}
          renderKey={theme}
          onMarkdownChange={setContent}
        />
      </section>
    </main>
  );
}

function getInitialFileTreeVisible(): boolean {
  const savedVisibility = localStorage.getItem(FILE_TREE_VISIBLE_STORAGE_KEY);
  if (savedVisibility === "true" || savedVisibility === "false") {
    return savedVisibility === "true";
  }

  return true;
}

function getInitialTheme(): ThemeMode {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export default App;
