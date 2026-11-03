import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { buildIndex } from "../src/symbolIndex";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function workspace(manifest?: string, coordinates?: string) {
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "kibi-vsc-symidx-mut-")),
  );
  roots.push(root);
  fs.mkdirSync(path.join(root, ".kb"));
  const manifestPath = path.join(root, ".kb", "symbols.yaml");
  if (manifest !== undefined) fs.writeFileSync(manifestPath, manifest);
  const coordinatesPath = path.join(root, ".kb", "symbol-coordinates.yaml");
  if (coordinates !== undefined) fs.writeFileSync(coordinatesPath, coordinates);
  return { root, manifestPath, coordinatesPath };
}

function entries(manifest: string, coordinates?: string) {
  const { root, manifestPath, coordinatesPath } = workspace(
    manifest,
    coordinates,
  );
  return {
    root,
    byId: buildIndex(manifestPath, root, coordinatesPath).byId,
  };
}

describe("buildIndex", () => {
  test("a missing manifest gives an empty index", () => {
    const { root, manifestPath } = workspace();
    expect(buildIndex(manifestPath, root)).toStrictEqual({
      byTitle: new Map(),
      byFile: new Map(),
      byId: new Map(),
    });
  });

  test("items need a title; sources are optional and URLs are not files", () => {
    const { root, byId } = entries(
      [
        "symbols:",
        "  - id: SYM-untitled",
        "  - id: SYM-bare",
        "    title: bare",
        "  - id: SYM-web",
        "    title: web",
        "    source: https://example.test/x.ts",
        "  - id: SYM-src",
        "    title: src",
        "    source: lib/x.ts",
        "",
      ].join("\n"),
    );
    expect([...byId.keys()]).toEqual(["SYM-bare", "SYM-web", "SYM-src"]);
    expect(byId.get("SYM-bare")).toStrictEqual({
      id: "SYM-bare",
      title: "bare",
      sourceFile: undefined,
      sourceLine: undefined,
      links: [],
    });
    expect(byId.get("SYM-web")?.sourceFile).toBeUndefined();
    expect(byId.get("SYM-src")?.sourceFile).toBe(
      path.join(root, "lib", "x.ts"),
    );
  });

  test("balanced quotes are removed, unbalanced ones kept", () => {
    const { byId } = entries(
      [
        "symbols:",
        '  - id: "SYM-1"',
        "    title: 'one'",
        "    links:",
        '      - "REQ-a',
        "      - 'REQ-b",
        '      - REQ-c"',
        "      - REQ-d'",
        "      - 'REQ-e'",
        "",
      ].join("\n"),
    );
    expect(byId.get("SYM-1")).toStrictEqual({
      id: "SYM-1",
      title: "one",
      sourceFile: undefined,
      sourceLine: undefined,
      links: ['"REQ-a', "'REQ-b", 'REQ-c"', "REQ-d'", "REQ-e"],
    });
  });

  test("coordinates override sources, lines and links when well typed", () => {
    const { root, byId } = entries(
      [
        "symbols:",
        "  - id: SYM-1",
        "    title: one",
        "    sourceFile: src/one.ts",
        "    sourceLine: 3",
        "    links:",
        "      - REQ-1",
        "  - id: SYM-2",
        "    title: two",
        "    sourceFile: src/two.ts",
        "    sourceLine: 4",
        "    links:",
        "      - REQ-2",
        "  - id: SYM-3",
        "    title: three",
        "    sourceFile: src/three.ts",
        "  - id: SYM-4",
        "    title: four",
        "",
      ].join("\n"),
      [
        "coordinates:",
        "  SYM-1:",
        "    sourceFile: moved/one.ts",
        "    sourceLine: 30",
        "    links: [REQ-9, 7]",
        "  SYM-2:",
        "    sourceFile: 5",
        "    sourceLine: '40'",
        "    links: REQ-x",
        "  SYM-3: null",
        "",
      ].join("\n"),
    );
    expect(byId.get("SYM-1")).toStrictEqual({
      id: "SYM-1",
      title: "one",
      sourceFile: path.join(root, "moved", "one.ts"),
      sourceLine: 30,
      links: ["REQ-9", "7"],
    });
    expect(byId.get("SYM-2")).toStrictEqual({
      id: "SYM-2",
      title: "two",
      sourceFile: path.join(root, "src", "two.ts"),
      sourceLine: 4,
      links: ["REQ-2"],
    });
    expect(byId.get("SYM-3")?.sourceFile).toBe(
      path.join(root, "src", "three.ts"),
    );
    expect(byId.get("SYM-4")?.sourceFile).toBeUndefined();
  });

  test.each([
    ["no coordinates file", undefined],
    ["a malformed file", "coordinates: [\n"],
    ["a scalar file", "just text\n"],
    ["an empty file", ""],
  ])("%s leaves the manifest values", (_name, coordinates) => {
    const { root, byId } = entries(
      "symbols:\n  - id: SYM-1\n    title: one\n    sourceFile: src/one.ts\n",
      coordinates,
    );
    expect(byId.get("SYM-1")?.sourceFile).toBe(
      path.join(root, "src", "one.ts"),
    );
  });
});
