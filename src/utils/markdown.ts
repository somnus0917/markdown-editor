import MarkdownIt from "markdown-it";
import type StateBlock from "markdown-it/lib/rules_block/state_block.mjs";
import type StateInline from "markdown-it/lib/rules_inline/state_inline.mjs";
import type Token from "markdown-it/lib/token.mjs";

const mathPlugin = (md: MarkdownIt) => {
  md.inline.ruler.before("escape", "math_inline", mathInlineRule);
  md.block.ruler.before("fence", "math_block", mathBlockRule, {
    alt: ["paragraph", "reference", "blockquote", "list"],
  });

  md.renderer.rules.math_inline = renderInlineMath;
  md.renderer.rules.math_block = renderBlockMath;
};

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: false,
  typographer: true,
})
  .enable(["table", "strikethrough"])
  .use(mathPlugin);

export function renderMarkdown(markdown: string): string {
  return md.render(stripByteOrderMark(markdown));
}

function mathInlineRule(state: StateInline, silent: boolean): boolean {
  const start = state.pos;

  if (state.src.charCodeAt(start) !== 0x24 /* $ */) {
    return false;
  }

  if (state.src.charCodeAt(start + 1) === 0x24) {
    return false;
  }

  if (start > 0 && state.src.charCodeAt(start - 1) === 0x5c /* \ */) {
    return false;
  }

  let match = start + 1;
  while ((match = state.src.indexOf("$", match)) !== -1) {
    if (match === start + 1) {
      match += 1;
      continue;
    }

    if (isEscaped(state.src, match)) {
      match += 1;
      continue;
    }

    const content = state.src.slice(start + 1, match);
    if (!content.trim()) {
      return false;
    }

    if (!silent) {
      const token = state.push("math_inline", "span", 0);
      token.content = content;
      token.markup = "$";
    }

    state.pos = match + 1;
    return true;
  }

  return false;
}

function mathBlockRule(
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean,
): boolean {
  const startPos = state.bMarks[startLine] + state.tShift[startLine];
  const maxPos = state.eMarks[startLine];
  const marker = state.src.slice(startPos, maxPos).trim();

  if (marker !== "$$") {
    return false;
  }

  if (silent) {
    return true;
  }

  let nextLine = startLine + 1;
  let found = false;

  for (; nextLine < endLine; nextLine += 1) {
    const lineStart = state.bMarks[nextLine] + state.tShift[nextLine];
    const lineEnd = state.eMarks[nextLine];
    if (state.src.slice(lineStart, lineEnd).trim() === "$$") {
      found = true;
      break;
    }
  }

  const token = state.push("math_block", "div", 0);
  token.block = true;
  token.markup = "$$";
  token.content = state.getLines(
    startLine + 1,
    found ? nextLine : endLine,
    state.tShift[startLine],
    true,
  );
  token.map = [startLine, found ? nextLine + 1 : endLine];

  state.line = found ? nextLine + 1 : endLine;
  return true;
}

function renderInlineMath(tokens: Token[], idx: number): string {
  return `<span class="math math-inline">\\(${escapeHtml(tokens[idx].content)}\\)</span>`;
}

function renderBlockMath(tokens: Token[], idx: number): string {
  return `<div class="math math-block">\\[${escapeHtml(tokens[idx].content)}\\]</div>\n`;
}

function isEscaped(src: string, pos: number): boolean {
  let slashCount = 0;
  let cursor = pos - 1;

  while (cursor >= 0 && src.charCodeAt(cursor) === 0x5c /* \ */) {
    slashCount += 1;
    cursor -= 1;
  }

  return slashCount % 2 === 1;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function stripByteOrderMark(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}
