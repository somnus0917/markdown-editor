import type { ThemeMode } from "../App";

type ToolbarProps = {
  fileName: string;
  filePath: string | null;
  dirty: boolean;
  theme: ThemeMode;
  fileTreeVisible: boolean;
  onNew: () => void;
  onOpen: () => void;
  onOpenWorkspace: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onToggleTheme: () => void;
  onToggleFileTree: () => void;
};

function Toolbar({
  fileName,
  filePath,
  dirty,
  theme,
  fileTreeVisible,
  onNew,
  onOpen,
  onOpenWorkspace,
  onSave,
  onSaveAs,
  onToggleTheme,
  onToggleFileTree,
}: ToolbarProps) {
  return (
    <header className="toolbar">
      <div className="toolbar-actions" aria-label="File actions">
        <button type="button" onClick={onNew}>
          New
        </button>
        <button type="button" onClick={onOpen}>
          Open
        </button>
        <button type="button" onClick={onOpenWorkspace}>
          Open Workspace
        </button>
        <button
          type="button"
          onClick={onToggleFileTree}
          aria-pressed={fileTreeVisible}
        >
          {fileTreeVisible ? "Hide Tree" : "Show Tree"}
        </button>
        <button type="button" onClick={onSave}>
          Save
        </button>
        <button type="button" onClick={onSaveAs}>
          Save As
        </button>
      </div>

      <button
        type="button"
        className="theme-toggle"
        onClick={onToggleTheme}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? "Light" : "Dark"}
      </button>

      <div className="file-status" title={filePath ?? "No file path yet"}>
        <span className="file-name">
          {fileName}
          {dirty ? "*" : ""}
        </span>
        <span className="file-path">{filePath ?? "Draft"}</span>
      </div>
    </header>
  );
}

export default Toolbar;
