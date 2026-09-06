// implements REQ-014
import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  executeIntentSearch,
  rankIntentEntities,
  validateIntentSearchInput,
} from "../src/intent-search.js";

function entity(
  id: string,
  title: string,
  extras: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id,
    type: extras.type ?? "req",
    title,
    status: "active",
    source: extras.source ?? `.kb/requirements/${id}.md`,
    ...extras,
  };
}

describe("intent-search leftover ranking and execution", () => {
  test("validateIntentSearchInput rejects empty query, scores, and locations", () => {
    expect(() => validateIntentSearchInput({ query: "   " })).toThrow(
      /non-empty string/,
    );
    expect(() =>
      validateIntentSearchInput({ query: "ok", minScore: 2 }),
    ).toThrow(/minScore/);
    expect(() =>
      validateIntentSearchInput({
        query: "ok",
        sourceLocations: [{ path: "/abs/file.ts" }],
      }),
    ).toThrow(/workspace-relative/);
    expect(() =>
      validateIntentSearchInput({
        query: "ok",
        sourceLocations: [{ path: "src/../secret.ts" }],
      }),
    ).toThrow(/workspace-relative/);
    expect(() =>
      validateIntentSearchInput({
        query: "ok",
        sourceLocations: [{ path: "src/a.ts", line: 0 }],
      }),
    ).toThrow(/positive integer/);
    expect(() =>
      validateIntentSearchInput({
        query: "ok",
        sourceLocations: [{ path: "src/a.ts", column: 0 }],
      }),
    ).toThrow(/positive integer/);
    validateIntentSearchInput({
      query: "ok",
      minScore: 0.2,
      sourceLocations: [{ path: "src/a.ts", line: 3, column: 1 }],
    });
  });

  test("rankIntentEntities uses source, graph, body, and facet signals", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "kibi-intent-cov-"));
    try {
      const reqPath = path.join(root, ".kb", "requirements");
      mkdirSync(reqPath, { recursive: true });
      writeFileSync(
        path.join(reqPath, "REQ-BODY.md"),
        "# Export\n\nDownload the CSV report for operators.\n",
      );
      const result = await rankIntentEntities(
        [
          entity("REQ-BODY", "Export report", {
            sourceFile: "./src\\billing\\export.ts",
            source_line: "10",
            source_end_line: "20",
            tags: ["reporting", 1],
            semantic_text: "export csv",
          }),
          entity("REQ-NEAR", "Nearby helper", {
            sourceFile: "src/billing/export.ts",
            sourceLine: 4,
          }),
          entity("REQ-OTHER", "Unrelated login"),
          entity("REQ-NO-ID", "No identifier", { id: undefined, type: undefined }),
        ],
        {
          query: "export report",
          minScore: 0.01,
          semanticFacets: {
            actions: ["export", ""],
            objects: ["CSV file"],
            actors: ["operator"],
          },
          sourceLocations: [
            {
              path: "src/billing/export.ts",
              line: 12,
              symbol: "Export report",
            },
            { path: "src/billing/export.ts", line: 4, symbol: "helper" },
            { path: "missing.ts" },
          ],
        },
        root,
        [
          {
            from: "REQ-BODY",
            relationship: "implements",
            to: "SYM-EXPORT",
          },
          {
            from: "SYM-EXPORT",
            relationship: "covered_by",
            to: "TEST-EXPORT",
          },
        ] as never,
      );
      expect(result.analysis.acceptedCount).toBeGreaterThan(0);
      expect(result.analysis.topTwoMargin === null || result.analysis.topTwoMargin >= 0).toBe(
        true,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("executeIntentSearch uses searchEntities, graph, and related ids", async () => {
    const entities = [
      entity("REQ-A", "Export report as CSV", { tags: ["download"] }),
      entity("REQ-B", "Authenticate an account"),
      entity("SYM-A", "exportCsv", { type: "symbol" }),
    ];
    const prolog = {
      query: async (goal: string) => {
        if (goal.includes("kb_relationship")) {
          return {
            success: true,
            bindings: {
              Edges: "[[implements,REQ-A,SYM-A],[covered_by,SYM-A,TEST-A]]",
            },
          };
        }
        return { success: true, bindings: { Results: "[]" } };
      },
      searchEntities: async ({ query }: { query: string }) => ({
        entities: entities.filter((item) =>
          String(item.title).toLowerCase().includes(query.toLowerCase().slice(0, 3)),
        ),
        count: 1,
      }),
    };
    const found = await executeIntentSearch(
      {
        query: "export csv",
        type: "req",
        semanticFacets: { actions: ["export"] },
        minScore: 0.01,
      },
      prolog as never,
      "/tmp",
    );
    expect(found.analysis.rankingMode).toBe("intent-v1");

    const fallback = await executeIntentSearch(
      {
        query: "export",
        sourceLocations: [{ path: "src/a.ts" }],
        minScore: 0.99,
      },
      {
        query: async () => ({ success: true, bindings: { Results: "[]" } }),
        searchEntities: async () => ({ entities: [], count: 0 }),
      } as never,
      "/tmp",
    );
    expect(fallback.analysis.abstained).toBe(true);

    const noSearch = await executeIntentSearch(
      { query: "account", minScore: 0.01 },
      {
        query: async () => ({
          success: true,
          bindings: { Results: "[]", Edges: "[]" },
        }),
      } as never,
      "/tmp",
    );
    expect(noSearch.analysis.candidateCount).toBe(0);
  });
});
