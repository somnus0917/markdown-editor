import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown";

describe("markdown renderer", () => {
  it("renders inline math formulas", () => {
    const html = renderMarkdown("Inline $E = mc^2$ formula.");

    expect(html).toContain(
      '<span class="math math-inline">\\(E = mc^2\\)</span>',
    );
  });

  it("does not treat escaped dollars as math delimiters", () => {
    const html = renderMarkdown("\\$E = mc^2$");

    expect(html).not.toContain("math-inline");
  });

  it("renders block math formulas", () => {
    const html = renderMarkdown(`$$
\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}
$$`);

    expect(html).toContain('<div class="math math-block">');
    expect(html).toContain("\\[\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}\n\\]");
  });

  it("does not render empty inline formulas", () => {
    const html = renderMarkdown("Empty $ $ formula.");

    expect(html).not.toContain("math-inline");
  });

  it("does not output script tags as HTML", () => {
    const html = renderMarkdown("<script>alert('xss')</script>");

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes angle brackets inside math formulas", () => {
    const html = renderMarkdown("$a < b > c$");

    expect(html).toContain("\\(a &lt; b &gt; c\\)");
    expect(html).not.toContain("\\(a < b > c\\)");
  });
});
