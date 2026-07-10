import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useMemo, useState } from "react";
import { getFileName } from "../utils/paths";

export type FileTreeEntry = {
  name: string;
  path: string;
  kind: "directory" | "file";
  children: FileTreeEntry[];
};

export function useWorkspaceTree() {
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const [entries, setEntries] = useState<FileTreeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const workspaceName = useMemo(
    () => (workspacePath ? getFileName(workspacePath) : "No Workspace"),
    [workspacePath],
  );

  const loadWorkspace = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);

    try {
      const tree = await invoke<FileTreeEntry[]>("list_workspace_tree", {
        path,
      });
      setWorkspacePath(path);
      setEntries(tree);
    } catch (caughtError) {
      setError(`Workspace failed: ${formatError(caughtError)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const openWorkspace = useCallback(async () => {
    try {
      setError(null);
      const selected = await open({
        multiple: false,
        directory: true,
      });

      if (!selected) {
        return;
      }

      const path = Array.isArray(selected) ? selected[0] : selected;
      if (!path) {
        return;
      }

      await loadWorkspace(path);
    } catch (caughtError) {
      setError(`Workspace failed: ${formatError(caughtError)}`);
      setLoading(false);
    }
  }, [loadWorkspace]);

  const refreshWorkspace = useCallback(async () => {
    if (!workspacePath) {
      return;
    }

    await loadWorkspace(workspacePath);
  }, [loadWorkspace, workspacePath]);

  const clearWorkspaceError = useCallback(() => {
    setError(null);
  }, []);

  return {
    workspacePath,
    workspaceName,
    entries,
    loading,
    error,
    openWorkspace,
    refreshWorkspace,
    clearWorkspaceError,
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
