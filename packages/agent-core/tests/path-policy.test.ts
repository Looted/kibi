import { describe, expect, test } from "bun:test";
import path from "node:path";

import {
  canonicalizeWorkspacePath,
  classifyPath,
  extractEditedPaths,
  extractExplicitPathFields,
  extractPatchFilePaths,
  isDocumentationTrackedPath,
  isKbPath,
  isMeaningfulTrackedPath,
  isRootKbPath,
  isSourceImpactRelevantPath,
  normalizeWorkspacePath,
  toWorkspacePath,
} from "../src/path-policy";

const CODE_EXTENSIONS = [
  ".c",
  ".cc",
  ".cjs",
  ".cpp",
  ".cs",
  ".css",
  ".go",
  ".h",
  ".hpp",
  ".html",
  ".java",
  ".js",
  ".jsx",
  ".kt",
  ".lua",
  ".mjs",
  ".mts",
  ".cts",
  ".php",
  ".pl",
  ".py",
  ".rb",
  ".rs",
  ".scala",
  ".sh",
  ".swift",
  ".ts",
  ".tsx",
  ".vue",
  ".svelte",
];
const IGNORED_SEGMENTS = [
  "node_modules",
  "dist",
  "build",
  "out",
  "coverage",
  "vendor",
  "target",
  ".git",
  ".next",
  ".turbo",
  ".cache",
  "__pycache__",
];
const TEST_SEGMENTS = [
  "test",
  "tests",
  "__tests__",
  "spec",
  "specs",
  "e2e",
  "__mocks__",
  "fixtures",
];
const DOC_EXTENSIONS = [".md", ".mdx", ".rst", ".txt"];
const KB_LANES = [
  "requirements",
  "scenarios",
  "tests",
  "facts",
  "adr",
  "flags",
  "events",
];
const PATH_KEYS = [
  "absolute_path",
  "file",
  "file_path",
  "filepath",
  "new_path",
  "old_path",
  "path",
  "paths",
  "relative_path",
  "target_path",
];

describe("classifyPath", () => {
  test("every code extension is source, case-insensitively", () => {
    for (const extension of CODE_EXTENSIONS) {
      expect([extension, classifyPath(`lib/a${extension}`)]).toEqual([
        extension,
        "source",
      ]);
      expect(classifyPath(`lib/A${extension.toUpperCase()}`)).toBe("source");
    }
    expect(classifyPath("lib/a.yaml")).toBe("other");
    expect(classifyPath("lib/Makefile")).toBe("other");
  });

  test("ignored, documentation and kb paths", () => {
    for (const segment of IGNORED_SEGMENTS) {
      expect([segment, classifyPath(`a/${segment}/b.ts`)]).toEqual([
        segment,
        "other",
      ]);
    }
    expect(classifyPath("docs/a.ts")).toBe("other");
    expect(classifyPath("x/documentation/a.ts")).toBe("other");
    expect(classifyPath(".kb/requirements/a.md")).toBe("kb");
    expect(classifyPath("/.kb/x.ts")).toBe("kb");
    expect(classifyPath("  .kb\\x.ts ")).toBe("kb");
    expect(classifyPath("pkg/.kb/x.ts")).toBe("source");
    expect(classifyPath("")).toBe("other");
    expect(classifyPath("/")).toBe("other");
  });

  test("test directories and test file names", () => {
    for (const segment of TEST_SEGMENTS) {
      expect([segment, classifyPath(`pkg/src/${segment}/deep/a.ts`)]).toEqual([
        segment,
        "test",
      ]);
    }
    for (const name of [
      "a.test.ts",
      "a.spec.js",
      "a.e2e.ts",
      "a_test.go",
      "test_a.py",
    ]) {
      expect([name, classifyPath(`src/${name}`)]).toEqual([name, "test"]);
    }
    for (const name of [
      "a.test.ts.bak.ts",
      "atest.ts",
      "contest.ts",
      "test_a.pyc.ts",
      "my_test_a.py",
      "a.testing.ts",
    ]) {
      expect([name, classifyPath(`src/${name}`)]).toEqual([name, "source"]);
    }
  });
});

describe("tracked path helpers", () => {
  test("kb path predicates", () => {
    expect(isKbPath("a/.kb/x")).toBe(true);
    expect(isKbPath("a/kb/x")).toBe(false);
    expect(isRootKbPath(".kb/x")).toBe(true);
    expect(isRootKbPath("//.kb/x")).toBe(true);
    expect(isRootKbPath("a/.kb/x")).toBe(false);
  });

  test("isMeaningfulTrackedPath", () => {
    for (const lane of KB_LANES) {
      expect([lane, isMeaningfulTrackedPath(`.kb/${lane}/a.md`)]).toEqual([
        lane,
        true,
      ]);
    }
    expect(isMeaningfulTrackedPath(".kb/symbols.yaml")).toBe(true);
    expect(isMeaningfulTrackedPath("pkg/.kb/symbol-coordinates.yaml")).toBe(
      true,
    );
    expect(isMeaningfulTrackedPath(".kb/branches/x")).toBe(false);
    expect(isMeaningfulTrackedPath(".kb")).toBe(false);
    for (const segment of IGNORED_SEGMENTS) {
      expect(isMeaningfulTrackedPath(`${segment}/README.md`)).toBe(false);
    }
    expect(isMeaningfulTrackedPath("x/README.md")).toBe(true);
    expect(isMeaningfulTrackedPath("x/readme.md")).toBe(false);
    for (const extension of DOC_EXTENSIONS) {
      expect(isMeaningfulTrackedPath(`docs/a${extension}`)).toBe(true);
      expect(isMeaningfulTrackedPath(`tests/a${extension}`)).toBe(true);
      expect(isMeaningfulTrackedPath(`src/a${extension}`)).toBe(false);
    }
    expect(isMeaningfulTrackedPath("documentation/a.ts")).toBe(false);
    expect(isMeaningfulTrackedPath("tests/a.ts")).toBe(true);
    expect(isMeaningfulTrackedPath("src/a.test.ts")).toBe(true);
    expect(isMeaningfulTrackedPath("tests/a.json")).toBe(false);
    expect(isMeaningfulTrackedPath("src/a.ts")).toBe(true);
    expect(isMeaningfulTrackedPath("src/a.json")).toBe(false);
    expect(isMeaningfulTrackedPath("")).toBe(false);
  });

  test("source impact and documentation paths", () => {
    expect(isSourceImpactRelevantPath(" src\\a.ts ")).toBe(true);
    expect(isSourceImpactRelevantPath("src/a.test.ts")).toBe(false);
    expect(isDocumentationTrackedPath("x/README.md")).toBe(true);
    expect(isDocumentationTrackedPath("a/b/README.md")).toBe(true);
    expect(isDocumentationTrackedPath("docs/a.png")).toBe(true);
    expect(isDocumentationTrackedPath("x/documentation/a.png")).toBe(true);
    for (const extension of DOC_EXTENSIONS) {
      expect(isDocumentationTrackedPath(`x/a${extension.toUpperCase()}`)).toBe(
        true,
      );
    }
    expect(isDocumentationTrackedPath("x/a.ts")).toBe(false);
    expect(isDocumentationTrackedPath("")).toBe(false);
  });
});

describe("path extraction", () => {
  test("every explicit path key, case-insensitively, at any depth", () => {
    for (const key of PATH_KEYS) {
      expect(
        extractExplicitPathFields({ [key.toUpperCase()]: " a\\b.ts " }),
      ).toEqual(["a/b.ts"]);
    }
    expect(
      extractExplicitPathFields({
        edits: [{ file_path: "a.ts" }, [{ path: ["b.ts", "", 3, ["c.ts"]] }]],
        nested: { inner: { new_path: "d.ts", old_path: "a.ts" } },
        name: "e.ts",
        path: { file: "f.ts" },
      }),
    ).toEqual(["a.ts", "b.ts", "c.ts", "d.ts", "f.ts"]);
    expect(extractExplicitPathFields("a.ts")).toEqual([]);
    expect(extractExplicitPathFields(null)).toEqual([]);
  });

  test("patch headers", () => {
    expect(
      extractPatchFilePaths(
        [
          "*** Begin Patch",
          "  *** Update File: src\\a.ts  ",
          "*** Add File: b.ts",
          "*** Delete File: c.ts",
          "*** Move File: d.ts",
          "x*** Add File: e.ts",
          "*** Update File: a.ts\r",
          "*** Add File:   ",
        ].join("\r\n"),
      ),
    ).toEqual(["src/a.ts", "b.ts", "c.ts", "a.ts"]);
  });

  test("edited paths merge explicit fields and patch text", () => {
    expect(
      extractEditedPaths({
        file_path: "a.ts",
        command: "*** Update File: b.ts",
        patch: "*** Add File: a.ts",
        input: 1,
        patchText: "*** Delete File: c.ts",
        other: "*** Add File: d.ts",
      }),
    ).toEqual(["a.ts", "b.ts", "c.ts"]);
    expect(extractEditedPaths(["*** Add File: x.ts"])).toEqual([]);
    expect(extractEditedPaths(null)).toEqual([]);
    expect(extractEditedPaths("*** Add File: x.ts")).toEqual([]);
  });
});

describe("workspace paths", () => {
  const root = path.resolve("/work/repo");

  test("relative, absolute and based paths inside the workspace", () => {
    expect(canonicalizeWorkspacePath(root, { rawPath: "src/a.ts" })).toEqual({
      workspaceRelative: "src/a.ts",
      absolute: path.join(root, "src/a.ts"),
    });
    expect(
      canonicalizeWorkspacePath(root, {
        rawPath: "a.ts",
        eventCwd: path.join(root, "pkg"),
      }),
    ).toEqual({
      workspaceRelative: "pkg/a.ts",
      absolute: path.join(root, "pkg/a.ts"),
    });
    expect(
      canonicalizeWorkspacePath(root, {
        rawPath: "a.ts",
        eventCwd: path.join(root, "pkg"),
        base: path.join(root, "lib"),
      })?.workspaceRelative,
    ).toBe("lib/a.ts");
    expect(
      canonicalizeWorkspacePath(root, {
        rawPath: path.join(root, "x/../b.ts"),
        eventCwd: "/elsewhere",
      })?.workspaceRelative,
    ).toBe("b.ts");
    expect(toWorkspacePath(root, " src\\c.ts ")).toEqual({
      relative: "src/c.ts",
      absolute: path.join(root, "src/c.ts"),
    });
    expect(toWorkspacePath(root, "c.ts", path.join(root, "d"))?.relative).toBe(
      "d/c.ts",
    );
    expect(toWorkspacePath(root, "..")).toBeUndefined();
  });

  test("the root itself and anything outside are refused", () => {
    for (const rawPath of ["", "  ", ".", "..", "../x.ts", "/other/x.ts"]) {
      expect([rawPath, canonicalizeWorkspacePath(root, { rawPath })]).toEqual([
        rawPath,
        undefined,
      ]);
    }
    expect(
      canonicalizeWorkspacePath(root, { rawPath: "..x/a.ts" })
        ?.workspaceRelative,
    ).toBe("..x/a.ts");
    expect(normalizeWorkspacePath(" a\\b ")).toBe("a/b");
  });
});
