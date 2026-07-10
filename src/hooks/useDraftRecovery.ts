import { message } from "@tauri-apps/plugin-dialog";
import { useEffect, useRef } from "react";

export type DraftSnapshot = {
  content: string;
  currentPath: string | null;
  savedContent: string;
  savedAt: number;
};

const DRAFT_STORAGE_KEY = "markdown-editor-draft";
const DRAFT_DEBOUNCE_MS = 900;

type UseDraftRecoveryOptions = {
  content: string;
  currentPath: string | null;
  savedContent: string;
  dirty: boolean;
  onRestore: (
    content: string,
    currentPath: string | null,
    savedContent: string,
  ) => void;
  onChecked?: (restored: boolean) => void;
};

export function useDraftRecovery({
  content,
  currentPath,
  savedContent,
  dirty,
  onRestore,
  onChecked,
}: UseDraftRecoveryOptions) {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;
    const draft = readDraft();
    if (!draft) {
      onChecked?.(false);
      return;
    }

    void askToRestoreDraft(draft).then((restore) => {
      if (restore) {
        onRestore(draft.content, draft.currentPath, draft.savedContent);
      } else {
        clearDraft();
      }
      onChecked?.(restore);
    });
  }, [onChecked, onRestore]);

  useEffect(() => {
    if (!initializedRef.current) {
      return;
    }

    if (!dirty) {
      clearDraft();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      writeDraft({
        content,
        currentPath,
        savedContent,
        savedAt: Date.now(),
      });
    }, DRAFT_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [content, currentPath, dirty, savedContent]);
}

function readDraft(): DraftSnapshot | null {
  try {
    const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!rawDraft) {
      return null;
    }

    const draft = JSON.parse(rawDraft) as Partial<DraftSnapshot>;
    if (
      typeof draft.content !== "string" ||
      typeof draft.savedContent !== "string" ||
      typeof draft.savedAt !== "number"
    ) {
      return null;
    }

    return {
      content: draft.content,
      currentPath:
        typeof draft.currentPath === "string" ? draft.currentPath : null,
      savedContent: draft.savedContent,
      savedAt: draft.savedAt,
    };
  } catch {
    return null;
  }
}

function writeDraft(draft: DraftSnapshot) {
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

function clearDraft() {
  localStorage.removeItem(DRAFT_STORAGE_KEY);
}

async function askToRestoreDraft(draft: DraftSnapshot): Promise<boolean> {
  const savedAt = new Date(draft.savedAt).toLocaleString();
  try {
    const result = await message(
      `A local draft from ${savedAt} was found. Restore it?`,
      {
        title: "Restore Draft",
        kind: "warning",
        buttons: {
          yes: "Restore",
          no: "Discard",
          cancel: "Discard",
        },
      },
    );

    return result === "Restore";
  } catch {
    return false;
  }
}
