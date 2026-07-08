const WINDOWS_DRIVE_RE = /^[a-zA-Z]:[\\/]/;
const URL_SCHEME_RE = /^[a-zA-Z][a-zA-Z\d+.-]*:/;

export function getFileName(path: string | null): string {
  if (!path) {
    return "Untitled.md";
  }

  const normalized = path.replace(/\\/g, "/");
  return normalized.split("/").filter(Boolean).pop() ?? "Untitled.md";
}

export function getDirName(path: string | null): string | null {
  if (!path) {
    return null;
  }

  const slashIndex = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  if (slashIndex <= 0) {
    return null;
  }

  return path.slice(0, slashIndex);
}

export function isExternalOrDataSource(src: string): boolean {
  return (
    URL_SCHEME_RE.test(src) ||
    src.startsWith("//") ||
    src.startsWith("#") ||
    src.trim() === ""
  );
}

export function isAbsolutePath(path: string): boolean {
  return path.startsWith("/") || path.startsWith("\\") || WINDOWS_DRIVE_RE.test(path);
}

export function resolveLocalPath(baseDir: string, src: string): string {
  const decodedSrc = safeDecodeUri(src.split("#")[0].split("?")[0]);
  if (isAbsolutePath(decodedSrc)) {
    return decodedSrc;
  }

  const separator = baseDir.includes("\\") && !baseDir.includes("/") ? "\\" : "/";
  const baseParts = baseDir.split(/[\\/]+/);
  const srcParts = decodedSrc.split(/[\\/]+/);
  const parts = [...baseParts];

  for (const part of srcParts) {
    if (!part || part === ".") {
      continue;
    }

    if (part === "..") {
      if (parts.length > 1) {
        parts.pop();
      }
      continue;
    }

    parts.push(part);
  }

  return parts.join(separator);
}

function safeDecodeUri(value: string): string {
  try {
    return decodeURI(value);
  } catch {
    return value;
  }
}
