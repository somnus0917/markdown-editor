import { describe, expect, it } from "vitest";
import {
  getDirName,
  getFileName,
  isAbsolutePath,
  resolveLocalPath,
} from "./paths";

describe("path helpers", () => {
  it("gets file names from slash and backslash paths", () => {
    expect(getFileName("/notes/learning/rl.md")).toBe("rl.md");
    expect(getFileName("C:\\notes\\learning\\rl.md")).toBe("rl.md");
  });

  it("gets directory names from slash and backslash paths", () => {
    expect(getDirName("/notes/learning/rl.md")).toBe("/notes/learning");
    expect(getDirName("C:\\notes\\learning\\rl.md")).toBe(
      "C:\\notes\\learning",
    );
  });

  it("detects Unix roots and Windows drive paths as absolute", () => {
    expect(isAbsolutePath("/notes/rl.md")).toBe(true);
    expect(isAbsolutePath("C:\\notes\\rl.md")).toBe(true);
    expect(isAbsolutePath("C:/notes/rl.md")).toBe(true);
    expect(isAbsolutePath("notes/rl.md")).toBe(false);
  });

  it("resolves relative paths", () => {
    expect(resolveLocalPath("/notes", "./images/a.png")).toBe(
      "/notes/images/a.png",
    );
  });

  it("resolves parent segments without escaping the base directory", () => {
    expect(resolveLocalPath("/notes", "drafts/../images/a.png")).toBe(
      "/notes/images/a.png",
    );
  });

  it("clamps traversal attempts to the base directory", () => {
    const resolved = resolveLocalPath("/notes", "../../../etc/passwd");

    expect(resolved).toBe("/notes/etc/passwd");
    expect(resolved === "/notes" || resolved.startsWith("/notes/")).toBe(true);
  });
});
