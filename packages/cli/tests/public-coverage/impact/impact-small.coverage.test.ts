import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { ExtractionResult } from "../../../src/extractors/markdown.js";
import { createCoarseAnchorQualityDiagnostics } from "../../../src/public/impact/coverage-depth-quality.js";
import { createSymbolGranularityDiagnostics } from "../../../src/public/impact/diagnostics.js";
import { createImpactManifestLookup } from "../../../src/public/impact/manifest.js";
import { collectSourceChanges } from "../../../src/public/impact/source-changes.js";
import { createUnownedFileDiagnostics } from "../../../src/public/impact/unowned-files.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(files: Record<string, string | Uint8Array> = {}): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-impact-small-cov-"));
  roots.push(root);
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), content);
  }
  return root;
}

function result(
  entity: {
    id: string;
    type: string;
    title?: string;
    source?: string;
  } & Record<string, unknown>,
  relationships: ExtractionResult["relationships"] = [],
  sourceFile?: string,
): ExtractionResult {
  return {
    entity: {
      title: entity.id,
      status: "active",
      created_at: "2026-07-01T00:00:00.000Z",
      updated_at: "2026-07-01T00:00:00.000Z",
      source: `documentation/${entity.id}.md`,
      ...entity,
    },
    relationships,
    ...(sourceFile !== undefined ? { sourceFile } : {}),
  } as ExtractionResult;
}

describe("createImpactManifestLookup", () => {
  test("a source file and title that two manifest entries share is ambiguous", () => {
    const lookup = createImpactManifestLookup([
      result({ id: "SYM-a", type: "symbol", title: "run" }, [], "src/a.ts"),
      result({ id: "SYM-b", type: "symbol", title: "run" }, [], "src/a.ts"),
      result({ id: "SYM-c", type: "symbol", title: "run" }, [], "src/a.ts"),
      result({ id: "SYM-d", type: "symbol", title: "stop" }, [], "src/a.ts"),
    ]);
    expect(lookup.has("src/a.ts:run")).toBe(false);
    expect(lookup.get("src/a.ts:stop")?.id).toBe("SYM-d");
  });
});

describe("createSymbolGranularityDiagnostics source fallback", () => {
  const source =
    "export function alpha() { return 1; }\nexport function beta() { return 2; }\n";
  const coarse = (sourceFile: string) =>
    result(
      { id: `SYM-${sourceFile}`, type: "symbol", title: "module" },
      [{ type: "implements", from: `SYM-${sourceFile}`, to: "REQ-1" }],
      sourceFile,
    );

  test("reads the source file from the workspace when nothing is staged", () => {
    const root = workspace({ "src/a.ts": source });
    const diagnostics = createSymbolGranularityDiagnostics({
      manifestResults: [coarse("src/a.ts"), coarse("src/missing.ts")],
      symbolsByFile: new Map(),
      workspaceRoot: root,
    });
    expect(diagnostics.map((diagnostic) => diagnostic.entityId)).toStrictEqual([
      "SYM-src/a.ts",
    ]);
    expect(diagnostics[0]?.message).toContain("alpha, beta");
  });

  test("staged content wins over the workspace", () => {
    const root = workspace();
    const diagnostics = createSymbolGranularityDiagnostics({
      manifestResults: [coarse("src/a.ts")],
      symbolsByFile: new Map(),
      sourceContentByFile: new Map([["src/a.ts", source]]),
      workspaceRoot: root,
    });
    expect(diagnostics).toHaveLength(1);
  });
});

describe("collectSourceChanges", () => {
  test("a source file that is not valid UTF-8 is skipped", () => {
    const root = workspace({
      "src/bad.ts": new Uint8Array([0xff, 0xfe, 0x41]),
      "src/ok.ts": "export const ok = 1;\n",
    });
    expect(
      collectSourceChanges({
        workspaceRoot: root,
        sourceFiles: ["src/bad.ts", "src/ok.ts"],
      } as Parameters<typeof collectSourceChanges>[0]).map(
        (change) => change.file,
      ),
    ).toStrictEqual(["src/ok.ts"]);
  });
});

describe("createUnownedFileDiagnostics", () => {
  test("a requirement entry that cannot be read is skipped", () => {
    const root = workspace({
      ".kb/requirements/REQ-search.md":
        "---\nid: REQ-search\ntitle: Search results page\nstatus: open\n---\n",
    });
    mkdirSync(join(root, ".kb/requirements/folder.md"));
    const [diagnostic] = createUnownedFileDiagnostics({
      workspaceRoot: root,
      requestedFiles: ["src/search/results.ts"],
      linkedSourceFiles: new Set(),
    });
    expect(diagnostic?.evidence).toStrictEqual({
      candidates: [{ id: "REQ-search", title: "Search results page" }],
    });
  });
});

describe("createCoarseAnchorQualityDiagnostics", () => {
  test("diagnostics are sorted by requirement", () => {
    const anchor = (id: string, requirement: string) =>
      result(
        { id, type: "symbol", granularity_reason: "module-level-behavior" },
        [{ type: "implements", from: id, to: requirement }],
      );
    const diagnostics = createCoarseAnchorQualityDiagnostics([
      result({ id: "REQ-b", type: "req" }),
      result({ id: "REQ-a", type: "req" }),
      anchor("SYM-1", "REQ-b"),
      anchor("SYM-2", "REQ-a"),
    ]);
    expect(diagnostics.map((diagnostic) => diagnostic.entityId)).toStrictEqual([
      "REQ-a",
      "REQ-b",
    ]);
  });
});
