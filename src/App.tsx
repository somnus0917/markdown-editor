import { useEffect, useLayoutEffect, useState } from "react";
import Editor from "./components/Editor";
import FileTree from "./components/FileTree";
import Preview from "./components/Preview";
import Toolbar from "./components/Toolbar";
import { useMarkdownFile } from "./hooks/useMarkdownFile";
import { useWorkspaceTree } from "./hooks/useWorkspaceTree";
import "./App.css";

export type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "markdown-editor-theme";
const FILE_TREE_VISIBLE_STORAGE_KEY = "markdown-editor-file-tree-visible";

function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());
  const [fileTreeVisible, setFileTreeVisible] = useState(() =>
    getInitialFileTreeVisible(),
  );
  const {
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
  } = useMarkdownFile();
  const {
    workspacePath,
    workspaceName,
    entries,
    loading: workspaceLoading,
    error: workspaceError,
    openWorkspace,
    refreshWorkspace,
    clearWorkspaceError,
  } = useWorkspaceTree();

  useEffect(() => {
    document.title = `${dirty ? "* " : ""}${fileName} - Markdown Editor`;
  }, [dirty, fileName]);

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

  return (
    <main className="app-shell">
      <Toolbar
        fileName={fileName}
        filePath={currentPath}
        dirty={dirty}
        theme={theme}
        fileTreeVisible={fileTreeVisible}
        onNew={newFile}
        onOpen={openFile}
        onOpenWorkspace={openWorkspace}
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
            loading={workspaceLoading}
            error={workspaceError}
            onOpenWorkspace={openWorkspace}
            onRefreshWorkspace={refreshWorkspace}
            onOpenFile={openPath}
            onDismissError={clearWorkspaceError}
          />
        ) : null}
        <Editor value={content} theme={theme} onChange={setContent} />
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
