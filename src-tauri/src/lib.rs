use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

const MAX_TREE_DEPTH: usize = 10;
const MAX_TREE_ENTRIES: usize = 5_000;
const IGNORED_DIRECTORIES: &[&str] = &[
    ".git",
    ".hg",
    ".svn",
    ".tauri",
    "dist",
    "node_modules",
    "target",
];

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FileTreeEntry {
    name: String,
    path: String,
    kind: FileTreeEntryKind,
    children: Vec<FileTreeEntry>,
}

#[derive(Serialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "lowercase")]
enum FileTreeEntryKind {
    Directory,
    File,
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|error| format!("Unable to read {path}: {error}"))
}

#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|error| format!("Unable to write {path}: {error}"))
}

#[tauri::command]
fn list_workspace_tree(path: String) -> Result<Vec<FileTreeEntry>, String> {
    let root = PathBuf::from(&path);
    if !root.is_dir() {
        return Err(format!("{path} is not a directory"));
    }

    let mut entry_count = 0;
    read_workspace_directory(&root, 0, &mut entry_count)
}

fn read_workspace_directory(
    directory: &Path,
    depth: usize,
    entry_count: &mut usize,
) -> Result<Vec<FileTreeEntry>, String> {
    if depth >= MAX_TREE_DEPTH {
        return Ok(Vec::new());
    }

    let mut entries = Vec::new();
    let read_dir = fs::read_dir(directory)
        .map_err(|error| format!("Unable to read {}: {error}", path_to_string(directory)))?;

    for directory_entry in read_dir {
        if *entry_count >= MAX_TREE_ENTRIES {
            return Err(format!(
                "Workspace tree is too large. Showing more than {MAX_TREE_ENTRIES} entries is not supported yet."
            ));
        }

        let directory_entry = directory_entry.map_err(|error| {
            format!(
                "Unable to inspect an entry in {}: {error}",
                path_to_string(directory)
            )
        })?;
        let path = directory_entry.path();
        let name = directory_entry.file_name().to_string_lossy().to_string();
        let file_type = directory_entry
            .file_type()
            .map_err(|error| format!("Unable to inspect {}: {error}", path_to_string(&path)))?;

        if file_type.is_dir() {
            if should_ignore_directory(&name) {
                continue;
            }

            *entry_count += 1;
            let children = read_workspace_directory(&path, depth + 1, entry_count)?;
            entries.push(FileTreeEntry {
                name,
                path: path_to_string(&path),
                kind: FileTreeEntryKind::Directory,
                children,
            });
        } else if file_type.is_file() && is_markdown_file(&path) {
            *entry_count += 1;
            entries.push(FileTreeEntry {
                name,
                path: path_to_string(&path),
                kind: FileTreeEntryKind::File,
                children: Vec::new(),
            });
        }
    }

    entries.sort_by(|left, right| {
        left.kind
            .cmp(&right.kind)
            .then_with(|| left.name.to_lowercase().cmp(&right.name.to_lowercase()))
    });
    Ok(entries)
}

fn should_ignore_directory(name: &str) -> bool {
    IGNORED_DIRECTORIES.contains(&name) || (name.starts_with('.') && name != ".")
}

fn is_markdown_file(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| matches!(extension.to_ascii_lowercase().as_str(), "md" | "markdown"))
        .unwrap_or(false)
}

fn path_to_string(path: &Path) -> String {
    path.to_string_lossy().to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            read_text_file,
            write_text_file,
            list_workspace_tree
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
