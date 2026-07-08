import { convertFileSrc, isTauri } from "@tauri-apps/api/core";
import { useEffect, useMemo, useRef } from "react";
import { renderMarkdown } from "../utils/markdown";
import { typesetMath } from "../utils/mathjax";
import { isExternalOrDataSource, resolveLocalPath } from "../utils/paths";

type PreviewProps = {
  markdown: string;
  baseDir: string | null;
};

function Preview({ markdown, baseDir }: PreviewProps) {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const html = useMemo(() => renderMarkdown(markdown), [markdown]);

  useEffect(() => {
    const container = previewRef.current;
    if (!container) {
      return;
    }

    rewriteLocalImageSources(container, baseDir);
    void typesetMath(container);
  }, [html, baseDir]);

  return (
    <section className="preview-pane" aria-label="Markdown rendered preview">
      <article
        ref={previewRef}
        className="markdown-preview"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}

function rewriteLocalImageSources(container: HTMLElement, baseDir: string | null) {
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
