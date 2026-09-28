// implements REQ-claude-code-kibi-plugin-v1
import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";

import {
  buildKnowledgeIndex,
  loadKnowledgeIndex,
  readEntitySummary,
  scanSymbolCoordinates,
  scanSymbolsManifest,
} from "../src/knowledge-index";
import {
  COORDINATES_YAML,
  SYMBOLS_YAML,
  cleanupTempDirs,
  createKibiWorkspace,
  tempDir,
  write,
} from "./fixture";

afterEach(cleanupTempDirs);

function referenceIndex(symbolsText: string, coordinatesText: string) {
  const parsed = parse(symbolsText) as unknown;
  const records = Array.isArray(parsed)
    ? parsed
    : ((parsed as { symbols: unknown[] }).symbols ?? []);
  const rawCoordinates =
    (parse(coordinatesText) as { coordinates?: Record<string, never> })
      ?.coordinates ?? {};
  const coordinates: Record<string, { line?: number; endLine?: number }> = {};
  for (const [id, value] of Object.entries(rawCoordinates) as [
    string,
    { sourceLine?: number; sourceEndLine?: number },
  ][]) {
    coordinates[id] = { line: value.sourceLine, endLine: value.sourceEndLine };
  }
  return buildKnowledgeIndex(records as Record<string, unknown>[], coordinates);
}

describe("symbol manifest scanner", () => {
  test("matches a full YAML parse on the canonical writer layout", () => {
    expect(
      buildKnowledgeIndex(
        scanSymbolsManifest(SYMBOLS_YAML),
        scanSymbolCoordinates(COORDINATES_YAML),
      ),
    ).toEqual(referenceIndex(SYMBOLS_YAML, COORDINATES_YAML));
  });

  test("matches a full YAML parse on hand-authored variants", () => {
    const variants = [
      // Indentless nested sequences, double quotes, flow links, comments.
      `symbols:
- id: "SYM-a"
  title: "a: quoted \\"title\\""
  sourceFile: ./src/a.ts
  links: [REQ-1, 'REQ-2']
  relationships:
  - target: TEST-1
    type: covered_by
- id: SYM-b # trailing comment
  sourceFile: src/b.ts
  sourceLine: 4
  sourceEndLine: 9
  links:
    - type: implements
      target: REQ-3
other:
  - id: SYM-not-a-symbol
    sourceFile: src/c.ts
    links: [REQ-9]
`,
      // Bare top-level sequence.
      `- id: SYM-c
  title: c
  sourceFile: src/c.ts
  links: REQ-4
`,
    ];
    for (const variant of variants) {
      expect(buildKnowledgeIndex(scanSymbolsManifest(variant), {})).toEqual(
        referenceIndex(variant, ""),
      );
    }
  });

  test("keys symbols by workspace-relative file and keeps relationships", () => {
    const index = buildKnowledgeIndex(
      scanSymbolsManifest(SYMBOLS_YAML),
      scanSymbolCoordinates(COORDINATES_YAML),
    );
    expect(index.symbolCount).toBe(4);
    // The unlinked symbol carries no relationship, so it is not indexed.
    expect(index.files["src/helper.ts"]).toBeUndefined();
    expect(index.files["src/checkout.ts"]).toEqual([
      {
        id: "SYM-computeTotal",
        title: "computeTotal",
        implements: ["REQ-checkout-rounding"],
        coveredBy: ["TEST-checkout-rounding"],
        executableFor: [],
        line: 3,
        endLine: 7,
      },
      {
        id: "SYM-formatTotal",
        title: "formatTotal",
        implements: ["REQ-currency-display"],
        coveredBy: [],
        executableFor: [],
        line: 9,
        endLine: 11,
      },
    ]);
  });
});

describe("knowledge index cache", () => {
  test("reuses the cache until a manifest changes", () => {
    const { root } = createKibiWorkspace();
    const cacheDir = tempDir("kibi-claude-cache-");
    const first = loadKnowledgeIndex(root, cacheDir);
    const cachePath = path.join(cacheDir, "knowledge-index.json");
    expect(fs.existsSync(cachePath)).toBe(true);

    // A cache hit returns the cached payload even if it was tampered with.
    const cached = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    cached.index.files["src/checkout.ts"][0].title = "from-cache";
    fs.writeFileSync(cachePath, JSON.stringify(cached));
    expect(
      loadKnowledgeIndex(root, cacheDir).files["src/checkout.ts"]?.[0]?.title,
    ).toBe("from-cache");

    // Changing the manifest invalidates the cache.
    write(
      root,
      ".kb/symbols.yaml",
      `${SYMBOLS_YAML}  - id: SYM-new\n    sourceFile: src/new.ts\n    links: [REQ-new]\n`,
    );
    const rebuilt = loadKnowledgeIndex(root, cacheDir);
    expect(rebuilt.files["src/checkout.ts"]).toEqual(
      first.files["src/checkout.ts"],
    );
    expect(rebuilt.files["src/new.ts"]?.[0]?.implements).toEqual(["REQ-new"]);
  });

  test("an absent manifest yields an empty index", () => {
    const root = tempDir("kibi-claude-empty-");
    expect(loadKnowledgeIndex(root)).toEqual({ files: {}, symbolCount: 0 });
  });
});

describe("entity summaries", () => {
  test("read title and status from the canonical document", () => {
    const { root } = createKibiWorkspace();
    expect(readEntitySummary(root, "REQ-currency-display")).toEqual({
      id: "REQ-currency-display",
      title: "Totals display with a currency symbol",
      status: "superseded",
    });
  });

  test("never resolve paths outside the lane", () => {
    const { root } = createKibiWorkspace();
    write(root, "secret.md", "---\ntitle: leaked\n---\n");
    expect(readEntitySummary(root, "REQ-../../secret")).toEqual({
      id: "REQ-../../secret",
    });
    expect(readEntitySummary(root, "REQ-missing")).toEqual({
      id: "REQ-missing",
    });
  });
});
