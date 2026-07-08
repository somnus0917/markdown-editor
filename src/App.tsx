import { useEffect } from "react";
import Editor from "./components/Editor";
import Preview from "./components/Preview";
import Toolbar from "./components/Toolbar";
import { useMarkdownFile } from "./hooks/useMarkdownFile";
import "./App.css";

function App() {
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

  return (
    <main className="app-shell">
      <Toolbar
        fileName={fileName}
        filePath={currentPath}
        dirty={dirty}
        onNew={newFile}
        onOpen={openFile}
        onSave={saveFile}
        onSaveAs={saveFileAs}
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
        <Editor value={content} onChange={setContent} />
        <Preview markdown={content} baseDir={baseDir} />
      </section>
    </main>
  );
}

export default App;
