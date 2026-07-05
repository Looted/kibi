import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import type { KbConfigPaths } from "../../../src/utils/config.js";

const fgMock = mock(
  async (
    ..._args: [
      string | string[],
      { cwd: string; absolute: boolean; ignore?: string[] }?,
    ]
  ) => [] as string[],
);

mock.module("fast-glob", () => ({
  default: fgMock,
}));

mock.module("../../../src/extractors/relationships.js", () => ({
  getRelationshipsDir: (kbRoot: string) => `${kbRoot}/relationships`,
}));

const { normalizeMarkdownPath, discoverSourceFiles } = await import(
  "../../../src/commands/sync/discovery.js"
);

describe("normalizeMarkdownPath", () => {
  test("returns null for undefined pattern", () => {
    expect(normalizeMarkdownPath(undefined)).toBeNull();
  });

  test("returns null for empty string", () => {
    expect(normalizeMarkdownPath("")).toBeNull();
  });

  test("returns pattern unchanged when it contains * wildcard", () => {
    expect(normalizeMarkdownPath("docs/**/*.md")).toBe("docs/**/*.md");
  });

  test("returns pattern with wildcard * anywhere (not just **)", () => {
    expect(normalizeMarkdownPath("src/*.md")).toBe("src/*.md");
  });

  test("appends /**/*.md to normal pattern without wildcard", () => {
    expect(normalizeMarkdownPath("documentation/requirements")).toBe(
      "documentation/requirements/**/*.md",
    );
  });

  test("preserves special characters in pattern", () => {
    expect(normalizeMarkdownPath("docs/[v1]")).toBe("docs/[v1]/**/*.md");
  });
});

describe("discoverSourceFiles", () => {
  beforeEach(() => {
    fgMock.mockReset();
  });

  afterAll(() => {
    mock.restore();
  });

  test("returns all markdown files when all paths are set", async () => {
    const mdFiles = ["/project/docs/REQ-001.md", "/project/docs/SCEN-001.md"];
    fgMock.mockResolvedValueOnce(mdFiles);
    fgMock.mockResolvedValueOnce(["/project/docs/symbols.yaml"]);

    const paths: KbConfigPaths = {
      requirements: "docs/requirements",
      scenarios: "docs/scenarios",
      tests: "docs/tests",
      adr: "docs/adr",
      flags: "docs/flags",
      events: "docs/events",
      facts: "docs/facts",
      symbols: "docs/symbols.yaml",
    };

    const result = await discoverSourceFiles("/project", paths);

    expect(result.markdownFiles).toEqual(mdFiles);
    expect(result.manifestFiles).toEqual(["/project/docs/symbols.yaml"]);
    expect(result.relationshipsDir).toBe("/project/.kb/relationships");
    expect(fgMock).toHaveBeenCalledTimes(2);
  });

  test("filters out undefined paths from markdown patterns", async () => {
    fgMock.mockResolvedValueOnce(["/project/docs/REQ-001.md"]);

    const paths: KbConfigPaths = {
      requirements: "docs/requirements",
      // scenarios is undefined
      tests: undefined,
      adr: undefined,
      flags: undefined,
      events: undefined,
      facts: undefined,
    };

    const result = await discoverSourceFiles("/project", paths);

    // Only one pattern should be passed (requirements)
    const patternsArg = fgMock.mock.calls[0][0];
    expect(patternsArg).toEqual(["docs/requirements/**/*.md"]);
    expect(result.markdownFiles).toEqual(["/project/docs/REQ-001.md"]);
  });

  test("returns empty markdownFiles when all paths are undefined", async () => {
    fgMock.mockResolvedValueOnce([]);

    const paths: KbConfigPaths = {};

    const result = await discoverSourceFiles("/project", paths);

    expect(result.markdownFiles).toEqual([]);
    const patternsArg = fgMock.mock.calls[0][0];
    expect(patternsArg).toEqual([]);
  });

  test("returns empty manifestFiles when symbols is undefined", async () => {
    fgMock.mockResolvedValueOnce([]);

    const paths: KbConfigPaths = {
      requirements: "docs/reqs",
    };

    const result = await discoverSourceFiles("/project", paths);

    expect(result.manifestFiles).toEqual([]);
    // fg should only be called once (for markdown, not symbols)
    expect(fgMock).toHaveBeenCalledTimes(1);
  });

  test("returns manifestFiles when symbols path is set", async () => {
    const symbolFiles = ["/project/docs/symbols.yaml"];
    fgMock.mockResolvedValueOnce([]);
    fgMock.mockResolvedValueOnce(symbolFiles);

    const paths: KbConfigPaths = {
      symbols: "docs/symbols.yaml",
    };

    const result = await discoverSourceFiles("/project", paths);

    expect(result.manifestFiles).toEqual(symbolFiles);
    // Second call should be for symbols with cwd and absolute
    expect(fgMock.mock.calls[1]).toEqual([
      "docs/symbols.yaml",
      { cwd: "/project", absolute: true },
    ]);
  });

  test("passes cwd and absolute options to fast-glob for markdown patterns", async () => {
    fgMock.mockResolvedValueOnce([]);

    const paths: KbConfigPaths = {
      requirements: "docs/requirements",
    };

    await discoverSourceFiles("/test/cwd", paths);

    expect(fgMock.mock.calls[0]).toEqual([
      ["docs/requirements/**/*.md"],
      { cwd: "/test/cwd", absolute: true, ignore: ["**/README.md"] },
    ]);
  });

  test("ignores README markdown files under entity directories", async () => {
    fgMock.mockResolvedValueOnce([
      "/project/docs/tests/README.md",
      "/project/docs/tests/TEST-001.md",
    ]);

    const paths: KbConfigPaths = {
      tests: "docs/tests",
    };

    const result = await discoverSourceFiles("/project", paths);

    expect(result.markdownFiles).toEqual(["/project/docs/tests/TEST-001.md"]);
    expect(fgMock.mock.calls[0]).toEqual([
      ["docs/tests/**/*.md"],
      { cwd: "/project", absolute: true, ignore: ["**/README.md"] },
    ]);
  });

  test("returns correct relationshipsDir based on cwd", async () => {
    fgMock.mockResolvedValueOnce([]);

    const paths: KbConfigPaths = {};

    const result = await discoverSourceFiles("/my/project", paths);

    expect(result.relationshipsDir).toBe("/my/project/.kb/relationships");
  });

  test("handles wildcard patterns from config paths", async () => {
    fgMock.mockResolvedValueOnce(["/project/docs/REQ-001.md"]);
    fgMock.mockResolvedValueOnce([]);

    const paths: KbConfigPaths = {
      requirements: "docs/**/reqs/**/*.md",
      symbols: "src/**/*.symbols.yaml",
    };

    await discoverSourceFiles("/project", paths);

    // Wildcard patterns should pass through unchanged
    const mdPatterns = fgMock.mock.calls[0][0];
    expect(mdPatterns).toEqual(["docs/**/reqs/**/*.md"]);

    expect(fgMock.mock.calls[1][0]).toBe("src/**/*.symbols.yaml");
  });
});
