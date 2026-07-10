import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getFileName } from "../utils/paths";

export type FileTreeEntry = {
  name: string;
  path: string;
  kind: "directory" | "file";
  children: FileTreeEntry[];
};

const LAST_WORKSPACE_KEY = "markdown-editor-last-workspace";
const expandedPathsKey = (workspacePath: string) =>
  `markdown-editor-expanded-paths:${workspacePath}`;

export function useWorkspaceTree() {
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const [entries, setEntries] = useState<FileTreeEntry[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const workspaceName = useMemo(
    () => (workspacePath ? getFileName(workspacePath) : "No Workspace"),
    [workspacePath],
  );

  const loadWorkspace = useCallback(async (path: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const tree = await invoke<FileTreeEntry[]>("list_workspace_tree", {
        path,
      });
      setWorkspacePath(path);
      setEntries(tree);
      setExpandedPaths(readExpandedPaths(path));
      localStorage.setItem(LAST_WORKSPACE_KEY, path);
      return true;
    } catch (caughtError) {
      setError(`Workspace failed: ${formatError(caughtError)}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const lastWorkspace = localStorage.getItem(LAST_WORKSPACE_KEY);
    if (!lastWorkspace) {
      return;
    }

    void loadWorkspace(lastWorkspace);
  }, [loadWorkspace]);

  useEffect(() => {
    if (!workspacePath) {
      return;
    }

    localStorage.setItem(
      expandedPathsKey(workspacePath),
      JSON.stringify([...expandedPaths]),
    );
  }, [expandedPaths, workspacePath]);

  const openWorkspace = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      const selected = await open({
        multiple: false,
        directory: true,
      });

      if (!selected) {
        return false;
      }

      const path = Array.isArray(selected) ? selected[0] : selected;
      if (!path) {
        return false;
      }

      return await loadWorkspace(path);
    } catch (caughtError) {
      setError(`Workspace failed: ${formatError(caughtError)}`);
      setLoading(false);
      return false;
    }
  }, [loadWorkspace]);

  const refreshWorkspace = useCallback(async (): Promise<boolean> => {
    if (!workspacePath) {
      return false;
    }

    return await loadWorkspace(workspacePath);
  }, [loadWorkspace, workspacePath]);

  const toggleDirectory = useCallback((path: string) => {
    setExpandedPaths((currentPaths) => {
      const nextPaths = new Set(currentPaths);
      if (nextPaths.has(path)) {
        nextPaths.delete(path);
      } else {
        nextPaths.add(path);
      }
      return nextPaths;
    });
  }, []);

  const expandSelectedPath = useCallback(
    (selectedPath: string | null) => {
      if (!selectedPath) {
        return;
      }

      setExpandedPaths((currentPaths) => {
        const nextPaths = new Set(currentPaths);
        for (const entry of entries) {
          expandSelectedAncestors(entry, selectedPath, nextPaths);
        }
        return nextPaths;
      });
    },
    [entries],
  );

  const clearWorkspaceError = useCallback(() => {
    setError(null);
  }, []);

  return {
    workspacePath,
    workspaceName,
    entries,
    expandedPaths,
    loading,
    error,
    loadWorkspace,
    openWorkspace,
    refreshWorkspace,
    toggleDirectory,
    expandSelectedPath,
    clearWorkspaceError,
  };
}

function readExpandedPaths(workspacePath: string): Set<string> {
  try {
    const rawValue = localStorage.getItem(expandedPathsKey(workspacePath));
    if (!rawValue) {
      return new Set();
    }

    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue)
      ? new Set(parsedValue.filter((item) => typeof item === "string"))
      : new Set();
  } catch {
    return new Set();
  }
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

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown error";
}
