import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  SKILL_FILE_NAME,
  isPathOutOfBounds,
  isWithinRoot,
  normalizeResourcePath,
  resolveSkillFilePath,
} from "../../../src/public/skill-system/paths.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function tempRoot(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "kibi-skill-paths-"));
  roots.push(root);
  return root;
}

describe("skill-system paths", () => {
  test("names the skill file", () => {
    expect(SKILL_FILE_NAME).toBe("SKILL.md");
  });

  test("normalizes resource paths to forward slashes", () => {
    expect(normalizeResourcePath("a/./b/../c.md")).toBe("a/c.md");
    expect(normalizeResourcePath("a\\b\\c.md")).toBe("a/b/c.md");
  });

  test.each([
    ["/abs/file.md", true],
    ["..", true],
    ["../x.md", true],
    ["a/../../x.md", true],
    ["..\\x.md", true],
    ["a/b.md", false],
    ["a/../b.md", false],
    ["..x/b.md", false],
    ["a/..b/c.md", false],
  ] as const)("isPathOutOfBounds(%p) is %p", (input, expected) => {
    expect(isPathOutOfBounds(input)).toBe(expected);
  });

  test("detects paths that keep a /../ segment after normalizing", () => {
    // normalize() removes interior ".." segments, so only an already
    // escaping path keeps one; "x/../../y" normalizes to "../y".
    expect(isPathOutOfBounds("x/../../y")).toBe(true);
  });

  test.each([
    ["/root", "/root", true],
    ["/root", "/root/a/b", true],
    ["/root", "/root/..x", true],
    ["/root", "/other", false],
    ["/root", "/", false],
  ] as const)("isWithinRoot(%p, %p) is %p", (root, candidate, expected) => {
    expect(isWithinRoot(root, candidate)).toBe(expected);
  });

  test("resolves a directory to its SKILL.md", () => {
    const root = tempRoot();
    expect(resolveSkillFilePath(root)).toBe(path.join(root, "SKILL.md"));
  });

  test("keeps an explicit SKILL.md path, existing or not", () => {
    const root = tempRoot();
    const missing = path.join(root, "missing", "SKILL.md");
    expect(resolveSkillFilePath(missing)).toBe(missing);
    const file = path.join(root, "SKILL.md");
    writeFileSync(file, "x");
    expect(resolveSkillFilePath(file)).toBe(file);
  });

  test("joins SKILL.md onto other paths", () => {
    const root = tempRoot();
    const missing = path.join(root, "skill");
    expect(resolveSkillFilePath(missing)).toBe(path.join(missing, "SKILL.md"));
    const file = path.join(root, "notes.md");
    writeFileSync(file, "x");
    expect(resolveSkillFilePath(file)).toBe(path.join(file, "SKILL.md"));
    mkdirSync(path.join(root, "dir"));
    expect(resolveSkillFilePath(path.join(root, "dir"))).toBe(
      path.join(root, "dir", "SKILL.md"),
    );
  });

  test("resolves relative paths against the working directory", () => {
    expect(resolveSkillFilePath("some-missing-skill-dir-xyz")).toBe(
      path.join(process.cwd(), "some-missing-skill-dir-xyz", "SKILL.md"),
    );
  });
});

describe("resolveSkillFilePath on a directory named SKILL.md", () => {
  test("still points inside the directory", () => {
    const root = tempRoot();
    const dir = path.join(root, "SKILL.md");
    mkdirSync(dir);
    expect(resolveSkillFilePath(dir)).toBe(path.join(dir, "SKILL.md"));
  });
});
