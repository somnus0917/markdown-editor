import type { ThemeMode } from "../App";

type ToolbarProps = {
  fileName: string;
  filePath: string | null;
  dirty: boolean;
  theme: ThemeMode;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onToggleTheme: () => void;
};

function Toolbar({
  fileName,
  filePath,
  dirty,
  theme,
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onToggleTheme,
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
