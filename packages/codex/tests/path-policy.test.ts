import { describe, expect, test } from "bun:test";

import {
  extractExplicitPathFields,
  isDirectKbPath,
  isMeaningfulTrackedPath,
} from "../src/path-policy";

describe("Codex hook path policy", () => {
  test("recognizes direct .kb paths without flagging similarly named paths", () => {
    expect(isDirectKbPath(".kb/config.json")).toBe(true);
    expect(isDirectKbPath("/workspace/.kb/entities/REQ-001.md")).toBe(true);
    expect(isDirectKbPath("src/.kb-helper.ts")).toBe(false);
    expect(isDirectKbPath("docs/kb/config.json")).toBe(false);
  });

  test("extracts only explicit path fields from structured tool input", () => {
    const paths = extractExplicitPathFields({
      command: "cat .kb/config.json",
      file_path: ".kb/config.json",
      new_path: "src/new-file.ts",
      nested: { path: "docs/guide.md" },
      patches: [{ path: "packages/codex/src/index.ts" }],
    });

    expect(paths).toEqual([
      ".kb/config.json",
      "src/new-file.ts",
      "docs/guide.md",
      "packages/codex/src/index.ts",
    ]);
  });

  test("tracks source, tests, and documentation paths only", () => {
    expect(isMeaningfulTrackedPath("src/hook-runner.ts")).toBe(true);
    expect(
      isMeaningfulTrackedPath("packages/codex/tests/hook-runner.test.ts"),
    ).toBe(true);
    expect(isMeaningfulTrackedPath("docs/codex.md")).toBe(true);
    expect(isMeaningfulTrackedPath("README.md")).toBe(true);

    expect(isMeaningfulTrackedPath("package.json")).toBe(false);
    expect(isMeaningfulTrackedPath("dist/hook-runner.js")).toBe(false);
    expect(isMeaningfulTrackedPath(".kb/config.json")).toBe(false);
  });
});
