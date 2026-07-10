# Markdown Editor

A local-first cross-platform Markdown editor built with Tauri v2, React,
TypeScript, Vite, CodeMirror 6, markdown-it, and MathJax.

The first MVP uses a split layout: Markdown source editing on the left and live
HTML preview on the right.

## Features

- Open, edit, save, and save as local `.md` and `.markdown` files.
- Workspace file tree for browsing Markdown notes.
- Live Markdown preview powered by markdown-it.
- LaTeX math preview powered by MathJax, including inline `$...$` and block
  `$$...$$` formulas.
- TOML front matter parsing and visual editing, including Obsidian-like tag
  chips.
- Relative local image preview through the Tauri asset protocol.
- Dirty-state prompts before replacing unsaved changes or closing the window.
- Debounced local draft recovery with restore/discard prompt on startup.
- Dark and light themes.
- Persistent workspace, file tree visibility, expanded folders, last file, and
  theme state.

## Tech Stack

- Desktop: Tauri v2
- Frontend: React + TypeScript
- Build tool: Vite
- Editor: CodeMirror 6
- Markdown: markdown-it
- Math: MathJax
- Backend commands: Rust / Tauri

## Development

Install dependencies:

```bash
pnpm install
```

Start the desktop app in development mode:

```bash
pnpm tauri dev
```

Start only the Vite frontend:

```bash
pnpm dev
```

## Testing

Run frontend unit tests:

```bash
pnpm test
```

Run TypeScript type checking:

```bash
pnpm exec tsc --noEmit
```

Run Rust checks:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
```

## Build

Build the frontend:

```bash
pnpm build
```

Build the Tauri app:

```bash
pnpm tauri build
```

## Shortcuts

| Shortcut             | Action                                     |
| -------------------- | ------------------------------------------ |
| Cmd/Ctrl + N         | New file                                   |
| Cmd/Ctrl + O         | Open file                                  |
| Cmd/Ctrl + S         | Save                                       |
| Cmd/Ctrl + Shift + S | Save as                                    |
| Cmd/Ctrl + B         | Toggle bold around the current selection   |
| Cmd/Ctrl + I         | Toggle italic around the current selection |

## Notes

- Visual front matter editing may reformat TOML. Comments and original spacing
  may not be preserved.
- Local image paths are resolved relative to the current Markdown file directory
  and are constrained before being converted to Tauri asset URLs.
- MathJax rendering is debounced to keep editing responsive on larger notes.
