import { describe, expect, it } from "vitest";
import { parseMarkdownDocument, parseToml, serializeToml } from "./frontMatter";

describe("front matter TOML parser", () => {
  it("parses strings, booleans, numbers, arrays, nested tables, and datetimes", () => {
    const document = parseMarkdownDocument(`+++
title = "ppo vs dpo vs grpo"
date = 2026-06-30T14:30:47+08:00
draft = false
weight = 42
ratio = 1.5

[taxonomies]
tags = ["llm", "learning", "rl"]

[extra]
math = true
+++

# Body`);

    expect(document.frontMatterError).toBeNull();
    expect(document.body.trim()).toBe("# Body");
    expect(document.frontMatter).toEqual({
      title: "ppo vs dpo vs grpo",
      date: "2026-06-30T14:30:47+08:00",
      draft: false,
      weight: 42,
      ratio: 1.5,
      taxonomies: {
        tags: ["llm", "learning", "rl"],
      },
      extra: {
        math: true,
      },
    });
  });

  it("keeps # inside strings instead of treating it as a comment", () => {
    expect(parseToml('title = "Hash # inside"')).toEqual({
      title: "Hash # inside",
    });
  });

  it("parses escaped quotes inside strings", () => {
    expect(parseToml('title = "Say \\"hello\\""')).toEqual({
      title: 'Say "hello"',
    });
  });

  it("serializes common Hugo front matter values", () => {
    expect(
      serializeToml({
        title: "Hello",
        date: "2026-06-30T14:30:47+08:00",
        draft: false,
        taxonomies: {
          tags: ["llm", "rl"],
        },
      }),
    ).toBe(`title = "Hello"
date = 2026-06-30T14:30:47+08:00
draft = false

[taxonomies]
tags = ["llm", "rl"]`);
  });
});
