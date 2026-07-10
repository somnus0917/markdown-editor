import { useEffect, useMemo, useState } from "react";
import type { FileTreeEntry } from "../hooks/useWorkspaceTree";

type FileTreeProps = {
  workspacePath: string | null;
  workspaceName: string;
  entries: FileTreeEntry[];
  selectedPath: string | null;
  loading: boolean;
  error: string | null;
  onOpenWorkspace: () => void;
  onRefreshWorkspace: () => void;
  onOpenFile: (path: string) => void;
  onDismissError: () => void;
};

function FileTree({
  workspacePath,
  workspaceName,
  entries,
  selectedPath,
  loading,
  error,
  onOpenWorkspace,
  onRefreshWorkspace,
  onOpenFile,
  onDismissError,
}: FileTreeProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  useEffect(() => {
    setExpandedPaths(new Set());
  }, [workspacePath]);

  useEffect(() => {
    if (!selectedPath || !workspacePath) {
      return;
    }

    setExpandedPaths((currentPaths) => {
      const nextPaths = new Set(currentPaths);
      for (const entry of entries) {
        expandSelectedAncestors(entry, selectedPath, nextPaths);
      }
      return nextPaths;
    });
  }, [entries, selectedPath, workspacePath]);

  const hasEntries = entries.length > 0;
  const treeLabel = useMemo(
    () => (workspacePath ? `Workspace files in ${workspaceName}` : "Workspace"),
    [workspaceName, workspacePath],
  );

  const toggleDirectory = (path: string) => {
    setExpandedPaths((currentPaths) => {
      const nextPaths = new Set(currentPaths);
      if (nextPaths.has(path)) {
        nextPaths.delete(path);
      } else {
        nextPaths.add(path);
      }
      return nextPaths;
    });
  };

  return (
    <aside className="file-tree-pane" aria-label="Workspace file tree">
      <div className="file-tree-header">
        <div className="workspace-title" title={workspacePath ?? undefined}>
          <span className="workspace-label">Workspace</span>
          <strong>{workspaceName}</strong>
        </div>

        <div className="workspace-actions">
          <button type="button" onClick={onOpenWorkspace}>
            Open
          </button>
          <button
            type="button"
            onClick={onRefreshWorkspace}
            disabled={!workspacePath || loading}
          >
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="workspace-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={onDismissError}>
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="file-tree-scroll">
        {!workspacePath ? (
          <div className="file-tree-empty">
            <p>Open a folder to browse Markdown files.</p>
            <button type="button" onClick={onOpenWorkspace}>
              Open Workspace
            </button>
          </div>
        ) : null}

        {workspacePath && loading ? (
          <div className="file-tree-status">Loading workspace...</div>
        ) : null}

        {workspacePath && !loading && !hasEntries ? (
          <div className="file-tree-status">No Markdown files found.</div>
        ) : null}

        {workspacePath && hasEntries ? (
          <ul className="file-tree-list" role="tree" aria-label={treeLabel}>
            {entries.map((entry) => (
              <TreeEntry
                key={entry.path}
                entry={entry}
                depth={0}
                selectedPath={selectedPath}
                expandedPaths={expandedPaths}
                onToggleDirectory={toggleDirectory}
                onOpenFile={onOpenFile}
              />
            ))}
          </ul>
        ) : null}
      </div>
    </aside>
  );
}

type TreeEntryProps = {
  entry: FileTreeEntry;
  depth: number;
  selectedPath: string | null;
  expandedPaths: Set<string>;
  onToggleDirectory: (path: string) => void;
  onOpenFile: (path: string) => void;
};

function TreeEntry({
  entry,
  depth,
  selectedPath,
  expandedPaths,
  onToggleDirectory,
  onOpenFile,
}: TreeEntryProps) {
  const isDirectory = entry.kind === "directory";
  const isExpanded = expandedPaths.has(entry.path);
  const isSelected = selectedPath === entry.path;
  const paddingLeft = 12 + depth * 14;

  if (isDirectory) {
    return (
      <li role="none">
        <button
          type="button"
          className="file-tree-item directory"
          style={{ paddingLeft }}
          onClick={() => onToggleDirectory(entry.path)}
          title={entry.path}
          role="treeitem"
          aria-expanded={isExpanded}
        >
          <span className="tree-disclosure">{isExpanded ? "v" : ">"}</span>
          <span className="tree-icon" aria-hidden="true">
            {isExpanded ? "dir" : "dir"}
          </span>
          <span className="tree-name">{entry.name}</span>
        </button>

        {isExpanded ? (
          <ul className="file-tree-list nested" role="group">
            {entry.children.map((child) => (
              <TreeEntry
                key={child.path}
                entry={child}
                depth={depth + 1}
                selectedPath={selectedPath}
                expandedPaths={expandedPaths}
                onToggleDirectory={onToggleDirectory}
                onOpenFile={onOpenFile}
              />
            ))}
          </ul>
        ) : null}
      </li>
    );
  }

  return (
    <li role="none">
      <button
        type="button"
        className={`file-tree-item file${isSelected ? " selected" : ""}`}
        style={{ paddingLeft }}
        onClick={() => onOpenFile(entry.path)}
        title={entry.path}
        role="treeitem"
        aria-selected={isSelected}
      >
        <span className="tree-disclosure" aria-hidden="true" />
        <span className="tree-icon" aria-hidden="true">
          md
        </span>
        <span className="tree-name">{entry.name}</span>
      </button>
    </li>
  );
}

function expandSelectedAncestors(
  entry: FileTreeEntry,
  selectedPath: string,
  expandedPaths: Set<string>,
): boolean {
  if (entry.path === selectedPath) {
    return true;
  }

  for (const child of entry.children) {
    if (expandSelectedAncestors(child, selectedPath, expandedPaths)) {
      expandedPaths.add(entry.path);
      return true;
    }
  }

  return false;
}

export default FileTree;
