import { describe, expect, test } from "bun:test";
import path from "node:path";
import { getKbExistenceTargets, shouldHandleFile } from "../src/file-filter";

describe("getKbExistenceTargets", () => {
  test("lists every canonical lane root and the symbols manifest", () => {
    expect(getKbExistenceTargets("/r")).toStrictEqual([
      { key: "requirements", relativePath: ".kb/requirements", kind: "dir" },
      { key: "scenarios", relativePath: ".kb/scenarios", kind: "dir" },
      { key: "tests", relativePath: ".kb/tests", kind: "dir" },
      { key: "adr", relativePath: ".kb/adr", kind: "dir" },
      { key: "flags", relativePath: ".kb/flags", kind: "dir" },
      { key: "events", relativePath: ".kb/events", kind: "dir" },
      { key: "facts", relativePath: ".kb/facts", kind: "dir" },
      { key: "symbols", relativePath: ".kb/symbols.yaml", kind: "file" },
    ]);
  });
});

describe("shouldHandleFile", () => {
  test.each([
    [".kb/requirements/a.md", true],
    [".kb/requirements/sub/a.md", true],
    [".kb/facts/a.md", true],
    [".kb/symbols.yaml", true],
    [".kb/symbols.yamlx", false],
    [".kb/requirements/a.txt", false],
    [".kb/requirements.md", false],
    [".kb/requirementsx/a.md", false],
    ["x/.kb/requirements/a.md", false],
    ["docs/a.md", false],
  ])("relative %s -> %p", (file, expected) => {
    expect(shouldHandleFile(file, "/r")).toBe(expected);
  });

  test("absolute paths are made relative to cwd", () => {
    expect(shouldHandleFile("/r/.kb/requirements/a.md", "/r")).toBe(true);
    expect(shouldHandleFile("/r/.kb/symbols.yaml", "/r")).toBe(true);
    expect(shouldHandleFile("/other/.kb/requirements/a.md", "/r")).toBe(false);
  });

  test("relative paths are not resolved against the process directory", () => {
    const elsewhere = path.join(path.parse(process.cwd()).root, "elsewhere");
    expect(shouldHandleFile(".kb/requirements/a.md", elsewhere)).toBe(true);
  });
});
