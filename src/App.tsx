import { useEffect, useLayoutEffect, useState } from "react";
import Editor from "./components/Editor";
import Preview from "./components/Preview";
import Toolbar from "./components/Toolbar";
import { useMarkdownFile } from "./hooks/useMarkdownFile";
import "./App.css";

export type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "markdown-editor-theme";

function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());
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
    openFile,
    saveFile,
    saveFileAs,
  } = useMarkdownFile();

  useEffect(() => {
    document.title = `${dirty ? "* " : ""}${fileName} - Markdown Editor`;
  }, [dirty, fileName]);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  };

  return (
    <main className="app-shell">
      <Toolbar
        fileName={fileName}
        filePath={currentPath}
        dirty={dirty}
        theme={theme}
        onNew={newFile}
        onOpen={openFile}
        onSave={saveFile}
        onSaveAs={saveFileAs}
        onToggleTheme={toggleTheme}
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
        <Editor value={content} theme={theme} onChange={setContent} />
        <Preview markdown={content} baseDir={baseDir} renderKey={theme} />
      </section>
    </main>
  );
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
