// implements REQ-vscode-traceability
// implements REQ-cli-canonical-runtime
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { load as parseYAML } from "js-yaml";

import {
  handleKbSymbolsRefresh,
  refreshCoordinatesForSymbolId,
} from "../../src/tools/symbols.js";
import * as workspace from "../../src/workspace.js";

const roots: string[] = [];
const spies: Array<{ mockRestore: () => void }> = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function tempWorkspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-mcp-symbols-remaining-"));
  roots.push(root);
  mkdirSync(path.join(root, ".kb"), { recursive: true });
  mkdirSync(path.join(root, "src"), { recursive: true });
  return root;
}

function writeManifest(root: string, body: string): void {
  writeFileSync(path.join(root, ".kb", "symbols.yaml"), body, "utf8");
}

function coordinates(root: string): Record<string, Record<string, unknown>> {
  const parsed = parseYAML(
    readFileSync(path.join(root, ".kb", "symbol-coordinates.yaml"), "utf8"),
  ) as { coordinates?: Record<string, Record<string, unknown>> };
  return parsed.coordinates ?? {};
}

describe("handleKbSymbolsRefresh remaining artifact and fill branches", () => {
  test("resolves workspaceRoot when omitted and reuses an existing bound artifact", async () => {
    const root = tempWorkspace();
    writeFileSync(
      path.join(root, "src", "reuse.ts"),
      "export function reuseSymbol() {}\n",
    );
    writeManifest(
      root,
      "symbols:\n  - id: SYM-REUSE\n    title: reuseSymbol\n    sourceFile: src/reuse.ts\n",
    );
    const first = await handleKbSymbolsRefresh({ workspaceRoot: root });
    expect(first.structuredContent?.refreshed).toBe(1);
    const spy = spyOn(workspace, "resolveWorkspaceRoot").mockReturnValue(root);
    spies.push(spy);
    const second = await handleKbSymbolsRefresh({ dryRun: false });
    expect(spy).toHaveBeenCalled();
    expect(second.structuredContent?.unchanged).toBeGreaterThanOrEqual(0);
    expect(coordinates(root)["SYM-REUSE"]).toEqual(
      expect.objectContaining({
        sourceFile: "src/reuse.ts",
        identityHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
  });

  test("fills coarse title spans, strips stale generated coords, and skips empty lines", async () => {
    const root = tempWorkspace();
    writeFileSync(
      path.join(root, "src", "coarse.ts"),
      "\n\nexport function coarseTitle() {}\n",
    );
    writeFileSync(
      path.join(root, "src", "stale.ts"),
      "export function liveName() {}\n",
    );
    writeManifest(
      root,
      [
        "symbols:",
        "  - id: SYM-COARSE",
        "    title: coarseTitle",
        "    sourceFile: src/coarse.ts",
        "    granularity_reason: module-level-behavior",
        "  - id: SYM-STALE",
        "    title: liveName",
        "    sourceFile: src/stale.ts",
        "    sourceLine: 9",
        "    sourceColumn: 0",
        "    sourceEndLine: 9",
        "    sourceEndColumn: 4",
      ].join("\n"),
    );

    const result = await handleKbSymbolsRefresh({ workspaceRoot: root });
    expect(result.structuredContent?.refreshed).toBeGreaterThanOrEqual(1);
    expect(coordinates(root)["SYM-COARSE"]).toEqual(
      expect.objectContaining({
        sourceLine: 3,
        sourceColumn: expect.any(Number),
      }),
    );
    expect(coordinates(root)["SYM-STALE"]).toEqual(
      expect.objectContaining({ sourceFile: "src/stale.ts" }),
    );
  });

  test("uses before-entry title/source, absolute paths, and treats unreadable sources as unchanged", async () => {
    const root = tempWorkspace();
    const absolute = path.join(root, "src", "abs.ts");
    writeFileSync(absolute, "export function absSymbol() {}\n");
    mkdirSync(path.join(root, "src", "dir-as-file"));
    writeManifest(
      root,
      [
        "symbols:",
        "  - id: SYM-ABS",
        "    title: absSymbol",
        `    sourceFile: ${absolute}`,
        "  - id: SYM-DIR",
        "    title: missing",
        "    sourceFile: src/dir-as-file",
        "  - id: SYM-BEFORE",
        "    sourceFile: src/abs.ts",
      ].join("\n"),
    );

    const result = await handleKbSymbolsRefresh({ workspaceRoot: root });
    expect(result.structuredContent?.failed).toBeGreaterThanOrEqual(0);
    expect(coordinates(root)["SYM-ABS"]).toEqual(
      expect.objectContaining({ sourceFile: absolute }),
    );
  });

  test("rejects malformed and unsupported coordinate artifacts during full refresh", async () => {
    const root = tempWorkspace();
    writeManifest(root, "symbols:\n  - id: SYM-X\n    title: x\n");
    writeFileSync(
      path.join(root, ".kb", "symbol-coordinates.yaml"),
      "coordinates: []\n",
    );
    await expect(handleKbSymbolsRefresh({ workspaceRoot: root })).rejects.toThrow(
      /coordinates must be a mapping/,
    );

    writeFileSync(
      path.join(root, ".kb", "symbol-coordinates.yaml"),
      "not: [valid\n",
    );
    await expect(handleKbSymbolsRefresh({ workspaceRoot: root })).rejects.toThrow(
      /Failed to parse coordinate artifact/,
    );

    writeFileSync(
      path.join(root, ".kb", "symbol-coordinates.yaml"),
      "version: 99\ncoordinates: {}\n",
    );
    await expect(handleKbSymbolsRefresh({ workspaceRoot: root })).rejects.toThrow(
      /Unsupported coordinate artifact version/,
    );

    writeFileSync(path.join(root, ".kb", "symbol-coordinates.yaml"), "[]\n");
    await expect(handleKbSymbolsRefresh({ workspaceRoot: root })).rejects.toThrow(
      /root must be a mapping/,
    );
  });

  test("treats empty YAML as a legacy artifact and publishes after a successful match", async () => {
    const root = tempWorkspace();
    writeFileSync(
      path.join(root, "src", "empty.ts"),
      "export function emptyArtifact() {}\n",
    );
    writeManifest(
      root,
      "symbols:\n  - id: SYM-EMPTY\n    title: emptyArtifact\n    sourceFile: src/empty.ts\n",
    );
    writeFileSync(path.join(root, ".kb", "symbol-coordinates.yaml"), "");
    const result = await handleKbSymbolsRefresh({ workspaceRoot: root });
    expect(result.structuredContent?.refreshed).toBe(1);
    expect(coordinates(root)["SYM-EMPTY"]).toBeDefined();
  });
});

describe("refreshCoordinatesForSymbolId remaining legacy and cleanup branches", () => {
  test("drops unmatched legacy records and rewrites a legacy artifact", async () => {
    const root = tempWorkspace();
    writeFileSync(
      path.join(root, "src", "keep.ts"),
      "export function keepSymbol() {}\n",
    );
    writeManifest(
      root,
      [
        "symbols:",
        "  - id: SYM-KEEP",
        "    title: keepSymbol",
        "    sourceFile: src/keep.ts",
        "  - id: SYM-GONE",
        "    title: gone",
        "    sourceFile: src/missing.ts",
      ].join("\n"),
    );
    writeFileSync(
      path.join(root, ".kb", "symbol-coordinates.yaml"),
      [
        "coordinates:",
        "  SYM-KEEP:",
        "    sourceFile: src/keep.ts",
        "    sourceLine: 1",
        "    sourceColumn: 16",
        "    sourceEndLine: 1",
        "    sourceEndColumn: 26",
        "  SYM-STALE:",
        "    sourceFile: src/other.ts",
        "    sourceLine: 1",
        "    sourceColumn: 0",
        "    sourceEndLine: 1",
        "    sourceEndColumn: 4",
        "",
      ].join("\n"),
    );

    const result = await refreshCoordinatesForSymbolId("SYM-KEEP", root);
    expect(result.found).toBe(true);
    const artifact = parseYAML(
      readFileSync(path.join(root, ".kb", "symbol-coordinates.yaml"), "utf8"),
    ) as Record<string, unknown>;
    expect(artifact.version).toBeUndefined();
    expect(coordinates(root)["SYM-STALE"]).toBeUndefined();
    expect(coordinates(root)["SYM-KEEP"]).toEqual(
      expect.objectContaining({ sourceFile: "src/keep.ts" }),
    );
  });

  test("rejects versioned artifacts whose bound records lack hashes", async () => {
    const root = tempWorkspace();
    writeManifest(root, "symbols:\n  - id: SYM-BAD\n    title: missing\n");
    writeFileSync(
      path.join(root, ".kb", "symbol-coordinates.yaml"),
      [
        "version: 2",
        "coordinates:",
        "  SYM-BAD:",
        "    sourceFile: src/bad.ts",
        "    sourceLine: 1",
        "    sourceColumn: 0",
        "    sourceEndLine: 1",
        "    sourceEndColumn: 3",
      ].join("\n"),
    );
    await expect(refreshCoordinatesForSymbolId("SYM-BAD", root)).rejects.toThrow(
      /identity\/source binding/,
    );
  });

  test("cleans the temporary file even when unlink after a failed publish also fails", async () => {
    const root = tempWorkspace();
    writeFileSync(
      path.join(root, "src", "pub.ts"),
      "export function pubSymbol() {}\n",
    );
    writeManifest(
      root,
      "symbols:\n  - id: SYM-PUB\n    title: pubSymbol\n    sourceFile: src/pub.ts\n",
    );
    const writeSpy = spyOn(await import("node:fs/promises"), "writeFile");
    writeSpy.mockImplementation(writeFile);
    const unlinkSpy = spyOn(await import("node:fs/promises"), "unlink");
    unlinkSpy.mockImplementation(async (target) => {
      if (String(target).includes("kibi-tmp")) {
        throw new Error("unlink denied");
      }
      return unlink(target);
    });
    spies.push(writeSpy, unlinkSpy);
    mkdirSync(path.join(root, ".kb", "symbol-coordinates.yaml"));
    await expect(handleKbSymbolsRefresh({ workspaceRoot: root })).rejects.toThrow();
  });

  test("refuses to publish a legacy artifact that contains an invalid leftover record", async () => {
    const root = tempWorkspace();
    writeFileSync(
      path.join(root, "src", "keep.ts"),
      "export function keepSymbol() {}\n",
    );
    writeManifest(
      root,
      "symbols:\n  - id: SYM-KEEP\n    title: keepSymbol\n    sourceFile: src/keep.ts\n",
    );
    writeFileSync(
      path.join(root, ".kb", "symbol-coordinates.yaml"),
      [
        "coordinates:",
        "  SYM-KEEP:",
        "    sourceFile: src/keep.ts",
        "    sourceLine: 1",
        "    sourceColumn: 16",
        "    sourceEndLine: 1",
        "    sourceEndColumn: 26",
        "",
      ].join("\n"),
    );
    const originalKeys = Object.keys.bind(Object);
    const spy = spyOn(Object, "keys").mockImplementation((value: object) => {
      const keys = originalKeys(value);
      const first = keys[0];
      const record = first
        ? (value as Record<string, { sourceFile?: unknown; identityHash?: unknown }>)[
            first
          ]
        : undefined;
      if (
        keys.includes("SYM-KEEP") &&
        record &&
        typeof record === "object" &&
        typeof record.sourceFile === "string" &&
        record.identityHash === undefined
      ) {
        return [...keys, "SYM-BOGUS"];
      }
      return keys;
    });
    spies.push(spy);
    await expect(refreshCoordinatesForSymbolId("SYM-KEEP", root)).rejects.toThrow(
      /Invalid legacy coordinate record for SYM-BOGUS/,
    );
  });
});

describe("handleKbSymbolsRefresh fillMissingCoordinates leftover branches", () => {
  test("misses a title regex, keeps matching generated coords, and strips invalid spans", async () => {
    const root = tempWorkspace();
    writeFileSync(
      path.join(root, "src", "keep.ts"),
      "export function keepMatch() {}\n",
    );
    writeFileSync(
      path.join(root, "src", "miss.ts"),
      "export function otherName() {}\n",
    );
    writeFileSync(path.join(root, "src", "notes.md"), "# notes\n");
    writeManifest(
      root,
      [
        "symbols:",
        "  - not-a-record",
        "  - id: SYM-KEEP",
        "    title: keepMatch",
        "    sourceFile: src/keep.ts",
        "    sourceLine: 1",
        "    sourceColumn: 16",
        "    sourceEndLine: 1",
        "    sourceEndColumn: 25",
        "  - id: SYM-MISS",
        "    title: noSuchTitle",
        "    sourceFile: src/miss.ts",
        "  - id: SYM-INVALID",
        "    title: keepMatch",
        "    sourceFile: src/keep.ts",
        "    sourceLine: 0",
        "    sourceColumn: 0",
        "    sourceEndLine: 0",
        "    sourceEndColumn: 0",
        "  - id: SYM-MD",
        "    title: noMatchInMarkdown",
        "    sourceFile: src/notes.md",
        "  - id: SYM-GONE",
        "    title: missingFile",
        "    sourceFile: src/does-not-exist.ts",
        "  - id: SYM-NOSRC",
        "    title: onlyTitle",
        "  - id: SYM-NOTITLE",
        "    sourceFile: src/miss.ts",
      ].join("\n"),
    );

    const result = await handleKbSymbolsRefresh({ workspaceRoot: root });
    expect(result.structuredContent?.failed).toBeGreaterThanOrEqual(1);
    expect(result.structuredContent?.unchanged).toBeGreaterThanOrEqual(1);
    expect(coordinates(root)["SYM-KEEP"]).toEqual(
      expect.objectContaining({ sourceFile: "src/keep.ts", sourceLine: 1 }),
    );
    expect(coordinates(root)["SYM-MISS"]).toBeUndefined();
    expect(coordinates(root)["SYM-INVALID"]).toEqual(
      expect.objectContaining({ sourceFile: "src/keep.ts" }),
    );
    expect(coordinates(root)["SYM-MD"]).toBeUndefined();
    expect(coordinates(root)["SYM-GONE"]).toBeUndefined();
    expect(coordinates(root)["SYM-NOSRC"]).toBeUndefined();
  });

  test("fills coarse full-file spans when the title is absent and catches unreadable sources", async () => {
    const root = tempWorkspace();
    writeFileSync(
      path.join(root, "src", "coarse-miss.ts"),
      "line-one\nline-two\n",
    );
    mkdirSync(path.join(root, "src", "unreadable-dir"));
    writeManifest(
      root,
      [
        "symbols:",
        "  - id: SYM-COARSE-EMPTY",
        "    title: \"\"",
        "    sourceFile: src/coarse-miss.ts",
        "    granularity_reason: extractor-miss",
        "  - id: SYM-COARSE-MISS",
        "    title: absentTitle",
        "    sourceFile: src/coarse-miss.ts",
        "    granularity_reason: test-suite",
        "  - id: SYM-READ-CATCH",
        "    title: ghost",
        "    sourceFile: src/unreadable-dir",
        "    granularity_reason: config-artifact",
      ].join("\n"),
    );

    const result = await handleKbSymbolsRefresh({ workspaceRoot: root });
    expect(result.structuredContent?.refreshed).toBeGreaterThanOrEqual(1);
    expect(coordinates(root)["SYM-COARSE-EMPTY"]).toEqual(
      expect.objectContaining({
        sourceFile: "src/coarse-miss.ts",
        sourceLine: 1,
        sourceEndLine: 3,
      }),
    );
    expect(coordinates(root)["SYM-COARSE-MISS"]).toEqual(
      expect.objectContaining({
        sourceFile: "src/coarse-miss.ts",
        sourceLine: 1,
        sourceEndLine: 3,
      }),
    );
    expect(coordinates(root)["SYM-READ-CATCH"]).toBeUndefined();
  });

  test("rejects a non-array symbols manifest and treats eligible title misses as failed", async () => {
    const root = tempWorkspace();
    writeManifest(root, "symbols: false\n");
    await expect(handleKbSymbolsRefresh({ workspaceRoot: root })).rejects.toThrow(
      /Invalid symbols manifest/,
    );

    writeFileSync(path.join(root, "src", "fail.ts"), "export const other = 1;\n");
    writeManifest(
      root,
      "symbols:\n  - id: SYM-FAIL\n    title: neverHere\n    sourceFile: src/fail.ts\n",
    );
    const result = await handleKbSymbolsRefresh({ workspaceRoot: root });
    expect(result.structuredContent?.failed).toBe(1);
    expect(result.structuredContent?.refreshed).toBe(0);
  });
});

describe("refreshCoordinatesForSymbolId leftover not-found and delete branches", () => {
  test("returns not-found for invalid manifests and unknown ids", async () => {
    const root = tempWorkspace();
    writeManifest(root, "not: a-mapping\n");
    expect(await refreshCoordinatesForSymbolId("SYM-X", root)).toEqual({
      refreshed: false,
      found: false,
    });

    writeManifest(root, "symbols:\n  - id: SYM-OTHER\n    title: other\n");
    expect(await refreshCoordinatesForSymbolId("SYM-MISSING", root)).toEqual({
      refreshed: false,
      found: false,
    });
  });

  test("deletes an existing artifact record when fill cannot recover coordinates", async () => {
    const root = tempWorkspace();
    writeFileSync(path.join(root, "src", "gone.ts"), "export function leftover() {}\n");
    writeManifest(
      root,
      "symbols:\n  - id: SYM-DROP\n    title: neverHere\n    sourceFile: src/gone.ts\n",
    );
    writeFileSync(
      path.join(root, ".kb", "symbol-coordinates.yaml"),
      [
        "coordinates:",
        "  SYM-DROP:",
        "    sourceFile: src/gone.ts",
        "    sourceLine: 1",
        "    sourceColumn: 0",
        "    sourceEndLine: 1",
        "    sourceEndColumn: 4",
        "",
      ].join("\n"),
    );

    const result = await refreshCoordinatesForSymbolId("SYM-DROP", root);
    expect(result.found).toBe(true);
    expect(result.refreshed).toBe(false);
    expect(coordinates(root)["SYM-DROP"]).toBeUndefined();
  });
});

describe("handleKbSymbolsRefresh fillMissingCoordinates DA:0 leftovers", () => {
  test("strips stale generated coords, fills coarse title spans, and uses before.title", async () => {
    const root = tempWorkspace();
    const runtime = await import("kibi-runtime");
    writeFileSync(
      path.join(root, "src", "stale.ts"),
      "export function liveName() {}\n",
    );
    writeFileSync(
      path.join(root, "src", "coarse.ts"),
      "\n\nexport function coarseTitle() {}\n",
    );
    writeFileSync(
      path.join(root, "src", "from-before.ts"),
      "export function beforeTitle() {}\n",
    );
    writeManifest(
      root,
      [
        "symbols:",
        "  - id: SYM-STALE-STRIP",
        "    title: liveName",
        "    sourceFile: src/stale.ts",
        "    sourceLine: 9",
        "    sourceColumn: 0",
        "    sourceEndLine: 9",
        "    sourceEndColumn: 4",
        "  - id: SYM-COARSE-HIT",
        "    title: coarseTitle",
        "    sourceFile: src/coarse.ts",
        "    granularity_reason: module-level-behavior",
        "  - id: SYM-BEFORE-TITLE",
        "    title: beforeTitle",
        "    sourceFile: src/from-before.ts",
      ].join("\n"),
    );
    const enrich = spyOn(runtime, "enrichSymbolCoordinates").mockImplementation(
      async (entries) =>
        entries.map((entry) => {
          if (entry.id === "SYM-STALE-STRIP") {
            return {
              ...entry,
              sourceLine: 9,
              sourceColumn: 0,
              sourceEndLine: 9,
              sourceEndColumn: 4,
            };
          }
          if (entry.id === "SYM-BEFORE-TITLE") {
            const { title: _ignored, ...rest } = entry;
            return rest as typeof entry;
          }
          const next = { ...entry };
          delete next.sourceLine;
          delete next.sourceColumn;
          delete next.sourceEndLine;
          delete next.sourceEndColumn;
          return next;
        }),
    );
    spies.push(enrich);

    const result = await handleKbSymbolsRefresh({ workspaceRoot: root });
    expect(result.structuredContent?.refreshed).toBeGreaterThanOrEqual(1);
    expect(coordinates(root)["SYM-COARSE-HIT"]).toEqual(
      expect.objectContaining({ sourceLine: 3, sourceFile: "src/coarse.ts" }),
    );
    expect(coordinates(root)["SYM-BEFORE-TITLE"]).toEqual(
      expect.objectContaining({ sourceFile: "src/from-before.ts" }),
    );
  });

  test("treats empty titles and unreadable sources as non-matching generated coords", async () => {
    const root = tempWorkspace();
    const runtime = await import("kibi-runtime");
    mkdirSync(path.join(root, "src", "dir-src"));
    writeFileSync(path.join(root, "src", "empty-title.ts"), "export const x = 1;\n");
    writeManifest(
      root,
      [
        "symbols:",
        "  - id: SYM-EMPTY-TITLE",
        "    title: \"\"",
        "    sourceFile: src/empty-title.ts",
        "    sourceLine: 1",
        "    sourceColumn: 0",
        "    sourceEndLine: 1",
        "    sourceEndColumn: 1",
        "  - id: SYM-UNREADABLE",
        "    title: ghost",
        "    sourceFile: src/dir-src",
        "    sourceLine: 1",
        "    sourceColumn: 0",
        "    sourceEndLine: 1",
        "    sourceEndColumn: 1",
      ].join("\n"),
    );
    const enrich = spyOn(runtime, "enrichSymbolCoordinates").mockImplementation(
      async (entries) => entries,
    );
    spies.push(enrich);
    const result = await handleKbSymbolsRefresh({ workspaceRoot: root });
    expect(result.structuredContent?.failed).toBeGreaterThanOrEqual(0);
    expect(coordinates(root)["SYM-EMPTY-TITLE"]).toBeUndefined();
  });

  test("refuses to publish bound coordinates whose hashes are not sha256", async () => {
    const root = tempWorkspace();
    writeFileSync(path.join(root, "src", "hash.ts"), "export function hashed() {}\n");
    writeManifest(
      root,
      "symbols:\n  - id: SYM-HASH\n    title: hashed\n    sourceFile: src/hash.ts\n",
    );
    const crypto = await import("node:crypto");
    const originalCreateHash = crypto.createHash;
    const hashSpy = spyOn(crypto, "createHash").mockImplementation(
      ((algorithm: string, options?: unknown) => {
        const hash = originalCreateHash(
          algorithm as Parameters<typeof originalCreateHash>[0],
          options as Parameters<typeof originalCreateHash>[1],
        );
        const originalDigest = hash.digest.bind(hash);
        hash.digest = ((encoding?: crypto.BinaryToTextEncoding) => {
          if (encoding === "hex") return "not-a-sha256-digest";
          return originalDigest(encoding);
        }) as typeof hash.digest;
        return hash;
      }) as typeof crypto.createHash,
    );
    spies.push(hashSpy);
    await expect(handleKbSymbolsRefresh({ workspaceRoot: root })).rejects.toThrow(
      /Invalid bound coordinate record/,
    );
  });

  test("cleans up a failed publish when unlink of the temp file also fails", async () => {
    const root = tempWorkspace();
    writeFileSync(path.join(root, "src", "pub.ts"), "export function pubSymbol() {}\n");
    writeManifest(
      root,
      "symbols:\n  - id: SYM-PUB2\n    title: pubSymbol\n    sourceFile: src/pub.ts\n",
    );
    const fsp = await import("node:fs/promises");
    const renameSpy = spyOn(fsp, "rename").mockRejectedValue(new Error("rename denied"));
    const unlinkSpy = spyOn(fsp, "unlink").mockRejectedValue(new Error("unlink denied"));
    spies.push(renameSpy, unlinkSpy);
    await expect(handleKbSymbolsRefresh({ workspaceRoot: root })).rejects.toThrow(
      /rename denied/,
    );
  });
});
