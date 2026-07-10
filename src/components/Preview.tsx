import { convertFileSrc, isTauri } from "@tauri-apps/api/core";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  parseMarkdownDocument,
  parseTomlLiteral,
  type TomlRecord,
  type TomlValue,
  updateMarkdownFrontMatter,
} from "../utils/frontMatter";
import { renderMarkdown } from "../utils/markdown";
import { typesetMath } from "../utils/mathjax";
import { isExternalOrDataSource, resolveLocalPath } from "../utils/paths";

type PreviewProps = {
  markdown: string;
  baseDir: string | null;
  renderKey: string;
  onMarkdownChange: (markdown: string) => void;
};

function Preview({
  markdown,
  baseDir,
  renderKey,
  onMarkdownChange,
}: PreviewProps) {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const renderVersionRef = useRef(0);
  const parsedDocument = useMemo(
    () => parseMarkdownDocument(markdown),
    [markdown],
  );
  const html = useMemo(
    () => renderMarkdown(parsedDocument.body),
    [parsedDocument.body],
  );

  useEffect(() => {
    const container = previewRef.current;
    const renderVersion = renderVersionRef.current + 1;
    renderVersionRef.current = renderVersion;

    if (!container) {
      return;
    }

    rewriteLocalImageSources(container, baseDir);

    if (!containsMath(parsedDocument.body)) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (renderVersionRef.current !== renderVersion) {
        return;
      }

      if (container.innerHTML !== html) {
        return;
      }

      void typesetMath(container).catch((error) => {
        if (renderVersionRef.current === renderVersion) {
          console.error("MathJax render failed", error);
        }
      });
    }, 150);

    return () => {
      window.clearTimeout(timeoutId);
      renderVersionRef.current += 1;
    };
  }, [html, baseDir, renderKey, parsedDocument.body]);

  return (
    <section className="preview-pane" aria-label="Markdown rendered preview">
      <FrontMatterSummary
        markdown={markdown}
        frontMatter={parsedDocument.frontMatter}
        error={parsedDocument.frontMatterError}
        onMarkdownChange={onMarkdownChange}
      />
      <article
        ref={previewRef}
        className="markdown-preview"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}

function containsMath(markdown: string): boolean {
  return /(^|[^\\])\$[^$\n]+?\$|(^|\n)\s*\$\$\s*(\n|$)/.test(markdown);
}

type FrontMatterSummaryProps = {
  markdown: string;
  frontMatter: TomlRecord | null;
  error: string | null;
  onMarkdownChange: (markdown: string) => void;
};

function FrontMatterSummary({
  markdown,
  frontMatter,
  error,
  onMarkdownChange,
}: FrontMatterSummaryProps) {
  if (error) {
    return (
      <div className="frontmatter-panel frontmatter-error" role="alert">
        <span className="frontmatter-kicker">TOML</span>
        <span>{error}</span>
      </div>
    );
  }

  if (!frontMatter || Object.keys(frontMatter).length === 0) {
    return null;
  }

  const rows = flattenFrontMatter(frontMatter);
  const updateValue = (path: string, value: TomlValue) => {
    const nextFrontMatter = cloneTomlRecord(frontMatter);
    setTomlValueAtPath(nextFrontMatter, path.split("."), value);
    onMarkdownChange(updateMarkdownFrontMatter(markdown, nextFrontMatter));
  };

  const removeValue = (path: string) => {
    const nextFrontMatter = cloneTomlRecord(frontMatter);
    deleteTomlValueAtPath(nextFrontMatter, path.split("."));
    onMarkdownChange(updateMarkdownFrontMatter(markdown, nextFrontMatter));
  };

  const addValue = (path: string, value: TomlValue) => {
    const nextFrontMatter = cloneTomlRecord(frontMatter);
    setTomlValueAtPath(nextFrontMatter, path.split("."), value);
    onMarkdownChange(updateMarkdownFrontMatter(markdown, nextFrontMatter));
  };

  return (
    <div className="frontmatter-panel" aria-label="Parsed TOML front matter">
      <div className="frontmatter-heading">
        <span className="frontmatter-kicker">TOML</span>
        <span className="frontmatter-hint">
          Visual edits may reformat TOML; comments and original spacing may not
          be preserved.
        </span>
      </div>
      <div className="frontmatter-grid">
        {rows.map(([key, value]) => (
          <EditableFrontMatterRow
            key={key}
            path={key}
            value={value}
            onChange={updateValue}
            onRemove={removeValue}
          />
        ))}
      </div>
      <AddFrontMatterRow onAdd={addValue} />
    </div>
  );
}

type EditableFrontMatterRowProps = {
  path: string;
  value: TomlValue;
  onChange: (path: string, value: TomlValue) => void;
  onRemove: (path: string) => void;
};

function EditableFrontMatterRow({
  path,
  value,
  onChange,
  onRemove,
}: EditableFrontMatterRowProps) {
  const [draft, setDraft] = useState(formatEditableTomlValue(value));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(formatEditableTomlValue(value));
    setError(null);
  }, [value]);

  if (isTagsField(path, value)) {
    return (
      <TagsFrontMatterRow
        path={path}
        tags={value}
        onChange={onChange}
        onRemove={onRemove}
      />
    );
  }

  if (typeof value === "boolean") {
    return (
      <label className="frontmatter-field boolean-field">
        <span>{path}</span>
        <input
          type="checkbox"
          checked={value}
          onChange={(event) => onChange(path, event.currentTarget.checked)}
        />
        <button type="button" onClick={() => onRemove(path)}>
          Remove
        </button>
      </label>
    );
  }

  const commitDraft = () => {
    try {
      onChange(path, parseTomlLiteral(draft));
      setError(null);
    } catch (caughtError) {
      setError(formatError(caughtError));
    }
  };

  return (
    <label className="frontmatter-field">
      <span>{path}</span>
      <input
        type="text"
        value={draft}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onBlur={commitDraft}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        aria-invalid={error ? true : undefined}
      />
      <button type="button" onClick={() => onRemove(path)}>
        Remove
      </button>
      {error ? <em>{error}</em> : null}
    </label>
  );
}

type TagsFrontMatterRowProps = {
  path: string;
  tags: string[];
  onChange: (path: string, value: TomlValue) => void;
  onRemove: (path: string) => void;
};

function TagsFrontMatterRow({
  path,
  tags,
  onChange,
  onRemove,
}: TagsFrontMatterRowProps) {
  const [draft, setDraft] = useState("");

  const addTag = (rawTag: string) => {
    const nextTag = normalizeTag(rawTag);
    if (!nextTag) {
      return;
    }

    if (tags.includes(nextTag)) {
      setDraft("");
      return;
    }

    onChange(path, [...tags, nextTag]);
    setDraft("");
  };

  const removeTag = (tag: string) => {
    onChange(
      path,
      tags.filter((currentTag) => currentTag !== tag),
    );
  };

  return (
    <div className="frontmatter-field tags-field">
      <span>{path}</span>
      <div className="tag-editor" role="list" aria-label={`${path} tags`}>
        {tags.map((tag) => (
          <span key={tag} className="tag-chip" role="listitem">
            <span>#{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Remove tag ${tag}`}
            >
              x
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onBlur={() => addTag(draft)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              addTag(event.currentTarget.value);
            }
          }}
          placeholder="Add tag"
          aria-label={`Add tag to ${path}`}
        />
      </div>
      <button type="button" onClick={() => onRemove(path)}>
        Remove
      </button>
    </div>
  );
}

type AddFrontMatterRowProps = {
  onAdd: (path: string, value: TomlValue) => void;
};

function AddFrontMatterRow({ onAdd }: AddFrontMatterRowProps) {
  const [path, setPath] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addField = () => {
    if (!path.trim()) {
      setError("Field name is required");
      return;
    }

    try {
      onAdd(path.trim(), parseTomlLiteral(value.trim() || '""'));
      setPath("");
      setValue("");
      setError(null);
    } catch (caughtError) {
      setError(formatError(caughtError));
    }
  };

  return (
    <div className="frontmatter-add-row">
      <input
        type="text"
        value={path}
        onChange={(event) => setPath(event.currentTarget.value)}
        placeholder="new field, e.g. extra.math"
        aria-label="New TOML field"
      />
      <input
        type="text"
        value={value}
        onChange={(event) => setValue(event.currentTarget.value)}
        placeholder='value, e.g. true or ["tag"]'
        aria-label="New TOML value"
      />
      <button type="button" onClick={addField}>
        Add
      </button>
      {error ? <em>{error}</em> : null}
    </div>
  );
}

function flattenFrontMatter(record: TomlRecord): Array<[string, TomlValue]> {
  const rows: Array<[string, TomlValue]> = [];

  Object.entries(record).forEach(([key, value]) => {
    if (isTomlRecord(value)) {
      Object.entries(value).forEach(([childKey, childValue]) => {
        rows.push([`${key}.${childKey}`, childValue]);
      });
      return;
    }

    rows.push([key, value]);
  });

  return rows;
}

function formatEditableTomlValue(value: TomlValue): string {
  if (Array.isArray(value)) {
    return `[${value.map(formatEditableTomlValue).join(", ")}]`;
  }

  if (isTomlRecord(value)) {
    return "{ ... }";
  }

  if (typeof value === "string") {
    return value;
  }

  return String(value);
}

function isTagsField(path: string, value: TomlValue): value is string[] {
  return (
    path.split(".").pop() === "tags" &&
    Array.isArray(value) &&
    value.every((item) => typeof item === "string")
  );
}

function normalizeTag(value: string): string {
  return value.trim().replace(/^#+/, "").replace(/,$/, "");
}

function cloneTomlRecord(record: TomlRecord): TomlRecord {
  return structuredClone(record) as TomlRecord;
}

function setTomlValueAtPath(
  record: TomlRecord,
  path: string[],
  value: TomlValue,
) {
  let current = record;

  path.slice(0, -1).forEach((key) => {
    const existing = current[key];
    if (!isTomlRecord(existing)) {
      current[key] = {};
    }

    current = current[key] as TomlRecord;
  });

  current[path[path.length - 1]] = value;
}

function deleteTomlValueAtPath(record: TomlRecord, path: string[]) {
  let current = record;

  path.slice(0, -1).forEach((key) => {
    const existing = current[key];
    if (!isTomlRecord(existing)) {
      return;
    }

    current = existing;
  });

  delete current[path[path.length - 1]];
}

function isTomlRecord(value: TomlValue): value is TomlRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Invalid TOML value";
}

function rewriteLocalImageSources(
  container: HTMLElement,
  baseDir: string | null,
) {
  if (!baseDir || !isTauri()) {
    return;
  }

  const images = container.querySelectorAll<HTMLImageElement>("img[src]");

  images.forEach((image) => {
    const src = image.getAttribute("src");
    if (!src || isExternalOrDataSource(src)) {
      return;
    }

    try {
      const localPath = resolveLocalPath(baseDir, src);
      image.src = convertFileSrc(localPath);
    } catch (error) {
      console.warn("Unable to resolve local image path", src, error);
    }
  });
}

export default Preview;
