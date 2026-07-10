export type TomlValue =
  string | number | boolean | TomlValue[] | { [key: string]: TomlValue };

export type TomlRecord = {
  [key: string]: TomlValue;
};

export type ParsedMarkdownDocument = {
  body: string;
  frontMatter: TomlRecord | null;
  frontMatterError: string | null;
};

export function parseMarkdownDocument(
  markdown: string,
): ParsedMarkdownDocument {
  const normalized = stripByteOrderMark(markdown);
  const frontMatter = extractTomlFrontMatter(normalized);

  if (!frontMatter) {
    return {
      body: normalized,
      frontMatter: null,
      frontMatterError: null,
    };
  }

  try {
    return {
      body: frontMatter.body,
      frontMatter: parseToml(frontMatter.raw),
      frontMatterError: null,
    };
  } catch (error) {
    return {
      body: frontMatter.body,
      frontMatter: null,
      frontMatterError: formatError(error),
    };
  }
}

export function parseTomlLiteral(value: string): TomlValue {
  return parseTomlValue(value.trim());
}

export function updateMarkdownFrontMatter(
  markdown: string,
  frontMatter: TomlRecord,
): string {
  const normalized = stripByteOrderMark(markdown);
  const existingFrontMatter = extractTomlFrontMatter(normalized);
  const body = existingFrontMatter?.body ?? normalized;
  const serializedFrontMatter = serializeToml(frontMatter);

  if (!serializedFrontMatter) {
    return body.replace(/^\n+/, "");
  }

  return `+++\n${serializedFrontMatter}\n+++\n\n${body.replace(/^\n+/, "")}`;
}

export function serializeToml(record: TomlRecord): string {
  const lines = serializeTomlTable(record);
  return lines.join("\n").trim();
}

function extractTomlFrontMatter(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  if (lines[0]?.trim() !== "+++") {
    return null;
  }

  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === "+++") {
      return {
        raw: lines.slice(1, index).join("\n"),
        body: lines.slice(index + 1).join("\n"),
      };
    }
  }

  return null;
}

function parseToml(toml: string): TomlRecord {
  const root: TomlRecord = {};
  let currentTable = root;

  toml.split(/\r?\n/).forEach((line, index) => {
    const trimmed = stripTomlComment(line).trim();
    if (!trimmed) {
      return;
    }

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      const tablePath = parseKeyPath(trimmed.slice(1, -1).trim());
      currentTable = ensureTable(root, tablePath);
      return;
    }

    const separatorIndex = findUnquotedSeparator(trimmed, "=");
    if (separatorIndex === -1) {
      throw new Error(`Invalid TOML on line ${index + 1}: ${line}`);
    }

    const keyPath = parseKeyPath(trimmed.slice(0, separatorIndex).trim());
    const value = parseTomlValue(trimmed.slice(separatorIndex + 1).trim());
    setNestedValue(currentTable, keyPath, value);
  });

  return root;
}

function serializeTomlTable(record: TomlRecord, path: string[] = []): string[] {
  const lines: string[] = [];
  const childTables: Array<[string, TomlRecord]> = [];

  Object.entries(record).forEach(([key, value]) => {
    if (isRecord(value)) {
      childTables.push([key, value]);
      return;
    }

    lines.push(`${formatTomlKey(key)} = ${formatTomlValue(value)}`);
  });

  childTables.forEach(([key, childRecord]) => {
    if (lines.length > 0) {
      lines.push("");
    }

    const childPath = [...path, key];
    lines.push(`[${childPath.map(formatTomlKey).join(".")}]`);
    lines.push(...serializeTomlTable(childRecord, childPath));
  });

  return lines;
}

function formatTomlValue(value: TomlValue): string {
  if (Array.isArray(value)) {
    return `[${value.map(formatTomlValue).join(", ")}]`;
  }

  if (isRecord(value)) {
    return `{ ${Object.entries(value)
      .map(
        ([key, childValue]) =>
          `${formatTomlKey(key)} = ${formatTomlValue(childValue)}`,
      )
      .join(", ")} }`;
  }

  if (typeof value === "boolean" || typeof value === "number") {
    return String(value);
  }

  if (isTomlDateTime(value)) {
    return value;
  }

  return `"${escapeTomlString(value)}"`;
}

function formatTomlKey(key: string): string {
  return /^[A-Za-z0-9_-]+$/.test(key) ? key : `"${escapeTomlString(key)}"`;
}

function escapeTomlString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t");
}

function isTomlDateTime(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}(?:[Tt ][0-9:.+-]+)?$/.test(value);
}

function parseTomlValue(value: string): TomlValue {
  if (value.startsWith('"') && value.endsWith('"')) {
    return parseBasicString(value);
  }

  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }

  if (value.startsWith("[") && value.endsWith("]")) {
    return parseArray(value);
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  if (/^[+-]?\d+(?:\.\d+)?$/.test(value)) {
    return Number(value);
  }

  return value;
}

function parseArray(value: string): TomlValue[] {
  const inner = value.slice(1, -1).trim();
  if (!inner) {
    return [];
  }

  return splitTopLevel(inner, ",").map((item) => parseTomlValue(item.trim()));
}

function parseBasicString(value: string): string {
  return value
    .slice(1, -1)
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function ensureTable(root: TomlRecord, path: string[]): TomlRecord {
  let current = root;

  for (const key of path) {
    const existing = current[key];
    if (!existing) {
      current[key] = {};
    } else if (!isRecord(existing)) {
      throw new Error(
        `${key} is already defined and cannot be used as a table`,
      );
    }

    current = current[key] as TomlRecord;
  }

  return current;
}

function setNestedValue(target: TomlRecord, path: string[], value: TomlValue) {
  let current = target;

  path.slice(0, -1).forEach((key) => {
    const existing = current[key];
    if (!existing) {
      current[key] = {};
    } else if (!isRecord(existing)) {
      throw new Error(`${key} is already defined and cannot be nested`);
    }

    current = current[key] as TomlRecord;
  });

  current[path[path.length - 1]] = value;
}

function parseKeyPath(key: string): string[] {
  return splitTopLevel(key, ".").map((part) => unquoteKey(part.trim()));
}

function unquoteKey(key: string): string {
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    return key.slice(1, -1);
  }

  return key;
}

function splitTopLevel(value: string, separator: string): string[] {
  const parts: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  let bracketDepth = 0;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const previous = value[index - 1];

    if ((char === '"' || char === "'") && previous !== "\\") {
      quote = quote === char ? null : (quote ?? char);
    }

    if (!quote) {
      if (char === "[") {
        bracketDepth += 1;
      } else if (char === "]") {
        bracketDepth -= 1;
      } else if (char === separator && bracketDepth === 0) {
        parts.push(current);
        current = "";
        continue;
      }
    }

    current += char;
  }

  parts.push(current);
  return parts;
}

function findUnquotedSeparator(value: string, separator: string): number {
  let quote: '"' | "'" | null = null;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const previous = value[index - 1];

    if ((char === '"' || char === "'") && previous !== "\\") {
      quote = quote === char ? null : (quote ?? char);
    }

    if (!quote && char === separator) {
      return index;
    }
  }

  return -1;
}

function stripTomlComment(line: string): string {
  let quote: '"' | "'" | null = null;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const previous = line[index - 1];

    if ((char === '"' || char === "'") && previous !== "\\") {
      quote = quote === char ? null : (quote ?? char);
    }

    if (!quote && char === "#") {
      return line.slice(0, index);
    }
  }

  return line;
}

function isRecord(value: TomlValue): value is TomlRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stripByteOrderMark(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown TOML parse error";
}
