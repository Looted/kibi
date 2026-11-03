// implements REQ-vscode-traceability
import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  handleKbSymbolsRefresh,
  refreshCoordinatesForSymbolId,
  resolveManifestPath,
} from "../../src/tools/symbols.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(): string {
  const root = realpathSync(
    mkdtempSync(path.join(tmpdir(), "kibi-mcp-symbols-exact-")),
  );
  roots.push(root);
  mkdirSync(path.join(root, ".kb"), { recursive: true });
  mkdirSync(path.join(root, "src"), { recursive: true });
  return root;
}

const manifestFile = (root: string) => path.join(root, ".kb", "symbols.yaml");
const coordsFile = (root: string) =>
  path.join(root, ".kb", "symbol-coordinates.yaml");

function manifest(root: string, body: string) {
  writeFileSync(manifestFile(root), body);
}

const HASH = "a".repeat(64);
const SPAN =
  "sourceFile: src/a.ts\n    sourceLine: 1\n    sourceColumn: 0\n    sourceEndLine: 1\n    sourceEndColumn: 1";

describe("coordinate artifact validation", () => {
  test("the manifest path is under .kb", async () => {
    expect(await resolveManifestPath("/ws")).toBe("/ws/.kb/symbols.yaml");
  });

  test("a manifest without a symbols list is rejected", async () => {
    for (const body of ["", "symbols: nope\n", "- a\n"]) {
      const root = workspace();
      manifest(root, body);
      await expect(
        handleKbSymbolsRefresh({ workspaceRoot: root }),
      ).rejects.toThrow(
        new Error(`Invalid symbols manifest at ${manifestFile(root)}`),
      );
    }
  });

  const artifactErrors: Array<[string, string, string]> = [
    [
      "unparseable YAML",
      "coordinates: [unclosed\n",
      "Failed to parse coordinate artifact: ",
    ],
    ["a list root", "- a\n", "Coordinate artifact root must be a mapping"],
    ["a scalar root", "plain\n", "Coordinate artifact root must be a mapping"],
    [
      "missing coordinates",
      "version: 2\n",
      "Coordinate artifact coordinates must be a mapping",
    ],
    [
      "list coordinates",
      "coordinates: []\n",
      "Coordinate artifact coordinates must be a mapping",
    ],
    [
      "an unknown version",
      "version: 3\ncoordinates: {}\n",
      "Unsupported coordinate artifact version: 3",
    ],
    [
      "a text version",
      "version: '2'\ncoordinates: {}\n",
      "Unsupported coordinate artifact version: 2",
    ],
    [
      "a legacy record without a span",
      "coordinates:\n  SYM-1:\n    sourceFile: src/a.ts\n",
      "Coordinate artifact record 'SYM-1' has an invalid coordinate span",
    ],
    [
      "a bound record without hashes",
      `version: 2\ncoordinates:\n  SYM-2:\n    ${SPAN}\n`,
      "Coordinate artifact record 'SYM-2' is missing a valid identity/source binding or span",
    ],
    [
      "a bound record with a short identity hash",
      `version: 2\ncoordinates:\n  SYM-3:\n    ${SPAN}\n    identityHash: ${"a".repeat(63)}\n    sourceHash: ${HASH}\n`,
      "Coordinate artifact record 'SYM-3' is missing a valid identity/source binding or span",
    ],
    [
      "a bound record with an upper-case source hash",
      `version: 2\ncoordinates:\n  SYM-4:\n    ${SPAN}\n    identityHash: ${HASH}\n    sourceHash: ${"A".repeat(64)}\n`,
      "Coordinate artifact record 'SYM-4' is missing a valid identity/source binding or span",
    ],
    [
      "a bound record with a padded hash",
      `version: 2\ncoordinates:\n  SYM-5:\n    ${SPAN}\n    identityHash: x${HASH}\n    sourceHash: ${HASH}\n`,
      "Coordinate artifact record 'SYM-5' is missing a valid identity/source binding or span",
    ],
    [
      "a bound record that is not a mapping",
      "version: 2\ncoordinates:\n  SYM-6: text\n",
      "Coordinate artifact record 'SYM-6' is missing a valid identity/source binding or span",
    ],
  ];
  for (const [label, artifact, message] of artifactErrors) {
    test(`an artifact with ${label} is rejected`, async () => {
      const root = workspace();
      manifest(root, "symbols: []\n");
      writeFileSync(coordsFile(root), artifact);
      const run = handleKbSymbolsRefresh({ workspaceRoot: root });
      await expect(run).rejects.toThrow(message);
    });
  }

  const spans: Array<[string, Record<string, unknown>]> = [
    ["an empty source file", { sourceFile: "" }],
    ["a numeric source file", { sourceFile: 1 }],
    ["line 0", { sourceLine: 0 }],
    ["a fractional line", { sourceLine: 1.5 }],
    ["a text line", { sourceLine: "1" }],
    ["column -1", { sourceColumn: -1 }],
    ["a fractional column", { sourceColumn: 0.5 }],
    ["a text column", { sourceColumn: "0" }],
    ["an end line before the start", { sourceLine: 2, sourceEndLine: 1 }],
    ["a fractional end line", { sourceEndLine: 1.5 }],
    ["a text end line", { sourceEndLine: "1" }],
    ["end column -1", { sourceEndColumn: -1 }],
    ["a fractional end column", { sourceEndColumn: 1.5 }],
    ["a text end column", { sourceEndColumn: "1" }],
  ];
  for (const [label, change] of spans) {
    test(`a legacy span with ${label} is rejected`, async () => {
      const root = workspace();
      manifest(root, "symbols: []\n");
      const record = {
        sourceFile: "src/a.ts",
        sourceLine: 1,
        sourceColumn: 0,
        sourceEndLine: 1,
        sourceEndColumn: 0,
        ...change,
      };
      writeFileSync(
        coordsFile(root),
        `coordinates:\n  SYM-1: ${JSON.stringify(record)}\n`,
      );
      await expect(
        handleKbSymbolsRefresh({ workspaceRoot: root }),
      ).rejects.toThrow(
        "Coordinate artifact record 'SYM-1' has an invalid coordinate span",
      );
    });
  }

  test("boundary spans are accepted", async () => {
    const root = workspace();
    manifest(root, "symbols: []\n");
    writeFileSync(
      coordsFile(root),
      `coordinates:\n  SYM-1: ${JSON.stringify({
        sourceFile: "s",
        sourceLine: 1,
        sourceColumn: 0,
        sourceEndLine: 1,
        sourceEndColumn: 0,
      })}\n`,
    );
    const result = await handleKbSymbolsRefresh({ workspaceRoot: root });
    expect(result.structuredContent).toStrictEqual({
      refreshed: 0,
      failed: 0,
      unchanged: 0,
      dryRun: false,
    });
  });

  test("an empty artifact counts as legacy and is rewritten as version 2", async () => {
    const root = workspace();
    writeFileSync(
      path.join(root, "src", "a.ts"),
      "export function alpha() {}\n",
    );
    manifest(
      root,
      "symbols:\n  - id: SYM-A\n    title: alpha\n    sourceFile: src/a.ts\n",
    );
    writeFileSync(coordsFile(root), "");
    const result = await handleKbSymbolsRefresh({ workspaceRoot: root });
    expect(result.content).toStrictEqual([
      {
        type: "text",
        text: "kb_symbols_refresh completed for .kb/symbol-coordinates.yaml: refreshed=1, unchanged=0, failed=0",
      },
    ]);
    const written = readFileSync(coordsFile(root), "utf8");
    expect(written).toStartWith("# symbol-coordinates.yaml");
    expect(written).toContain("version: 2\ncoordinates:\n  SYM-A:\n");
    const sourceHash = createHash("sha256")
      .update("export function alpha() {}\n")
      .digest("hex");
    expect(written).toContain(`sourceHash: ${sourceHash}`);
    expect(existsSync(`${coordsFile(root)}.kibi-tmp-${process.pid}`)).toBe(
      false,
    );
  });

  test("a dry run reports without writing", async () => {
    const root = workspace();
    writeFileSync(
      path.join(root, "src", "a.ts"),
      "export function alpha() {}\n",
    );
    manifest(
      root,
      "symbols:\n  - id: SYM-A\n    title: alpha\n    sourceFile: src/a.ts\n",
    );
    const result = await handleKbSymbolsRefresh({
      workspaceRoot: root,
      dryRun: true,
    });
    expect(result.content[0]?.text).toBe(
      "kb_symbols_refresh (dry run) completed for .kb/symbol-coordinates.yaml: refreshed=1, unchanged=0, failed=0",
    );
    expect(result.structuredContent?.dryRun).toBe(true);
    expect(existsSync(coordsFile(root))).toBe(false);
  });

  test("a symbol id that is not in the manifest is not found", async () => {
    const root = workspace();
    manifest(root, "symbols:\n  - id: SYM-A\n");
    expect(await refreshCoordinatesForSymbolId("SYM-B", root)).toStrictEqual({
      refreshed: false,
      found: false,
    });
    manifest(root, "symbols: 1\n");
    expect(await refreshCoordinatesForSymbolId("SYM-A", root)).toStrictEqual({
      refreshed: false,
      found: false,
    });
  });
});
