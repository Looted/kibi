import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ExtractionResult } from "../../../src/extractors/markdown.js";
import {
  createImpactManifestLookup,
  readImpactManifestResults,
} from "../../../src/public/impact/manifest.js";

function withTempWorkspace(run: (workspaceRoot: string) => void): void {
  const workspaceRoot = mkdtempSync(join(tmpdir(), "kibi-impact-manifest-"));
  try {
    run(workspaceRoot);
  } finally {
    rmSync(workspaceRoot, { recursive: true, force: true });
  }
}

describe("impact manifest", () => {
  it("returns no results when .kb/symbols.yaml is absent", () => {
    withTempWorkspace((workspaceRoot) => {
      mkdirSync(join(workspaceRoot, ".kb"), { recursive: true });
      writeFileSync(
        join(workspaceRoot, ".kb", "config.json"),
        JSON.stringify({ paths: { symbols: "documentation/missing.yaml" } }),
      );

      expect(readImpactManifestResults(workspaceRoot)).toEqual([]);
    });
  });

  it("reads canonical .kb/symbols.yaml and normalizes source paths", () => {
    withTempWorkspace((workspaceRoot) => {
      mkdirSync(join(workspaceRoot, ".kb"), { recursive: true });
      writeFileSync(
        join(workspaceRoot, ".kb", "config.json"),
        JSON.stringify({ paths: { symbols: "documentation/symbols.yaml" } }),
      );
      writeFileSync(
        join(workspaceRoot, ".kb", "symbols.yaml"),
        [
          "symbols:",
          "  - id: SYM-UPLOAD",
          "    title: upload",
          `    source: ${join(workspaceRoot, ".kb", "symbols.yaml")}`,
          `    sourceFile: ${join(workspaceRoot, "src", "upload.ts")}`,
          "    relationships:",
          "      - type: implements",
          "        target: REQ-UPLOAD",
          "      - type: relates_to",
          "        target: ADR-UPLOAD",
          "",
        ].join("\n"),
      );

      expect(readImpactManifestResults(workspaceRoot)).toEqual([
        expect.objectContaining({
          entity: expect.objectContaining({
            id: "SYM-UPLOAD",
            source: ".kb/symbols.yaml",
          }),
          sourceFile: "src/upload.ts",
          relationships: [
            { type: "implements", from: "SYM-UPLOAD", to: "REQ-UPLOAD" },
            { type: "relates_to", from: "SYM-UPLOAD", to: "ADR-UPLOAD" },
          ],
        }),
      ]);
    });
  });

  it("ignores leftover config.json absolute symbol paths", () => {
    withTempWorkspace((workspaceRoot) => {
      const leftoverManifestPath = join(workspaceRoot, "absolute-symbols.yaml");
      mkdirSync(join(workspaceRoot, ".kb"), { recursive: true });
      writeFileSync(
        join(workspaceRoot, ".kb", "config.json"),
        JSON.stringify({ paths: { symbols: leftoverManifestPath } }),
      );
      writeFileSync(
        leftoverManifestPath,
        ["symbols:", "  - id: SYM-ABS", "    title: absolute", ""].join("\n"),
      );
      writeFileSync(
        join(workspaceRoot, ".kb", "symbols.yaml"),
        ["symbols:", "  - id: SYM-CANONICAL", "    title: canonical", ""].join(
          "\n",
        ),
      );

      expect(readImpactManifestResults(workspaceRoot)[0]?.entity.id).toBe(
        "SYM-CANONICAL",
      );
    });
  });

  it("builds manifest lookup with traceability relationships only", () => {
    const manifestResults: readonly ExtractionResult[] = [
      {
        entity: {
          id: "SYM-A",
          type: "symbol",
          title: "upload",
          status: "active",
          created_at: "2026-07-01T00:00:00.000Z",
          updated_at: "2026-07-01T00:00:00.000Z",
          source: ".kb/symbols.yaml",
        },
        sourceFile: "src/upload.ts",
        relationships: [
          { type: "implements", from: "SYM-A", to: "REQ-A" },
          { type: "relates_to", from: "SYM-A", to: "ADR-A" },
        ],
      },
      {
        entity: {
          id: "SYM-B",
          type: "symbol",
          title: "fallback",
          status: "active",
          created_at: "2026-07-01T00:00:00.000Z",
          updated_at: "2026-07-01T00:00:00.000Z",
          source: "documentation/fallback.yaml",
        },
        relationships: [{ type: "covered_by", from: "SYM-B", to: "TEST-B" }],
      },
    ];

    expect(createImpactManifestLookup(manifestResults)).toEqual(
      new Map([
        [
          "src/upload.ts:upload",
          { id: "SYM-A", relationships: [{ type: "implements", to: "REQ-A" }] },
        ],
        [
          "documentation/fallback.yaml:fallback",
          {
            id: "SYM-B",
            relationships: [{ type: "covered_by", to: "TEST-B" }],
          },
        ],
      ]),
    );
  });
});
