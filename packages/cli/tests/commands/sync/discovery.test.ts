import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";

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
    expect(normalizeMarkdownPath(".kb/requirements")).toBe(
      ".kb/requirements/**/*.md",
    );
  });

  test("preserves special characters in pattern", () => {
    expect(normalizeMarkdownPath("docs/[v1]")).toBe("docs/[v1]/**/*.md");
  });
});

describe("discoverSourceFiles", () => {
  const canonicalMarkdownPatterns = [
    ".kb/requirements/**/*.md",
    ".kb/scenarios/**/*.md",
    ".kb/tests/**/*.md",
    ".kb/adr/**/*.md",
    ".kb/flags/**/*.md",
    ".kb/events/**/*.md",
    ".kb/facts/**/*.md",
  ];

  beforeEach(() => {
    fgMock.mockReset();
  });

  afterAll(() => {
    mock.restore();
  });

  test("globs canonical .kb/ lanes regardless of leftover path arguments", async () => {
    const mdFiles = [
      "/project/.kb/requirements/REQ-001.md",
      "/project/.kb/scenarios/SCEN-001.md",
    ];
    fgMock.mockResolvedValueOnce(mdFiles);
    fgMock.mockResolvedValueOnce(["/project/.kb/symbols.yaml"]);

    const result = await discoverSourceFiles("/project");

    expect(result.markdownFiles).toEqual(mdFiles);
    expect(result.manifestFiles).toEqual(["/project/.kb/symbols.yaml"]);
    expect(result.relationshipsDir).toBe("/project/.kb/relationships");
    expect(fgMock).toHaveBeenCalledTimes(2);
    expect(fgMock.mock.calls[0][0]).toEqual(canonicalMarkdownPatterns);
    expect(fgMock.mock.calls[1][0]).toBe(".kb/symbols.yaml");
  });

  test("always discovers every canonical markdown lane", async () => {
    fgMock.mockResolvedValueOnce(["/project/.kb/requirements/REQ-001.md"]);
    fgMock.mockResolvedValueOnce([]);

    await discoverSourceFiles("/project");

    expect(fgMock.mock.calls[0][0]).toEqual(canonicalMarkdownPatterns);
  });

  test("discovers the canonical symbols manifest", async () => {
    const symbolFiles = ["/project/.kb/symbols.yaml"];
    fgMock.mockResolvedValueOnce([]);
    fgMock.mockResolvedValueOnce(symbolFiles);

    const result = await discoverSourceFiles("/project");

    expect(result.manifestFiles).toEqual(symbolFiles);
    expect(fgMock.mock.calls[1]).toEqual([
      ".kb/symbols.yaml",
      { cwd: "/project", absolute: true },
    ]);
  });

  test("passes cwd and absolute options to fast-glob for markdown patterns", async () => {
    fgMock.mockResolvedValueOnce([]);
    fgMock.mockResolvedValueOnce([]);

    await discoverSourceFiles("/test/cwd");

    expect(fgMock.mock.calls[0]).toEqual([
      canonicalMarkdownPatterns,
      { cwd: "/test/cwd", absolute: true, ignore: ["**/README.md"] },
    ]);
  });

  test("ignores README markdown files under entity directories", async () => {
    fgMock.mockResolvedValueOnce([
      "/project/.kb/tests/README.md",
      "/project/.kb/tests/TEST-001.md",
    ]);
    fgMock.mockResolvedValueOnce([]);

    const result = await discoverSourceFiles("/project");

    expect(result.markdownFiles).toEqual(["/project/.kb/tests/TEST-001.md"]);
    expect(fgMock.mock.calls[0]).toEqual([
      canonicalMarkdownPatterns,
      { cwd: "/project", absolute: true, ignore: ["**/README.md"] },
    ]);
  });

  test("returns correct relationshipsDir based on cwd", async () => {
    fgMock.mockResolvedValueOnce([]);
    fgMock.mockResolvedValueOnce([]);

    const result = await discoverSourceFiles("/my/project");

    expect(result.relationshipsDir).toBe("/my/project/.kb/relationships");
  });

  test("does not honor leftover wildcard config paths", async () => {
    fgMock.mockResolvedValueOnce(["/project/.kb/requirements/REQ-001.md"]);
    fgMock.mockResolvedValueOnce([]);

    await discoverSourceFiles("/project", {
      requirements: "docs/**/reqs/**/*.md",
      symbols: "src/**/*.symbols.yaml",
    } as never);

    expect(fgMock.mock.calls[0][0]).toEqual(canonicalMarkdownPatterns);
    expect(fgMock.mock.calls[1][0]).toBe(".kb/symbols.yaml");
  });
});
