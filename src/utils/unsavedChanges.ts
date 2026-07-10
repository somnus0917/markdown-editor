import { message } from "@tauri-apps/plugin-dialog";

export type UnsavedDecision = "save" | "discard" | "cancel";

export async function confirmUnsavedChanges(): Promise<UnsavedDecision> {
  const result = await message(
    "The current file has unsaved changes. What would you like to do?",
    {
      title: "Unsaved Changes",
      kind: "warning",
      buttons: {
        yes: "Save",
        no: "Don't Save",
        cancel: "Cancel",
      },
    },
  );

  if (result === "Save") {
    return "save";
  }

  if (result === "Don't Save") {
    return "discard";
  }

  return "cancel";
}
