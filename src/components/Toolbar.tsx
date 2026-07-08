type ToolbarProps = {
  fileName: string;
  filePath: string | null;
  dirty: boolean;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
};

function Toolbar({
  fileName,
  filePath,
  dirty,
  onNew,
  onOpen,
  onSave,
  onSaveAs,
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
