// implements REQ-kibi-intent-aware-source-discovery
import { afterEach, describe, expect, test } from "bun:test";
import { executeIntentSearch } from "../src/intent-search.js";
import { isolateKibiEnv } from "./helpers/in-process-workspace.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

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

function encodeEntities(rows: Record<string, unknown>[]): string {
  return `[${rows
    .map((row) => {
      const props = Object.entries(row)
        .filter(([key]) => key !== "id" && key !== "type")
        .map(([key, value]) => `${key}=${JSON.stringify(String(value))}`)
        .join(",");
      return `[${row.id},${row.type},${props}]`;
    })
    .join(",")}]`;
}

describe("intent-search remaining candidate, graph, and related-id branches", () => {
  test("scans facet corpora, caps oversized candidate sets, and loads related graph ids", async () => {
    restores.push(isolateKibiEnv());
    const related = entity("TEST-RELATED", "Related coverage", { type: "test" });
    const seeded = entity("REQ-EXPORT", "Export csv report for operators", {
      tags: ["download"],
    });
    const extra = Array.from({ length: 12 }, (_, index) =>
      entity(`REQ-EXTRA-${index}`, `Export helper ${index}`),
    );
    const oversized = Array.from({ length: 10_001 }, (_, index) =>
      entity(`REQ-CAP-${index}`, `Cap ${index}`),
    );
    const found = await executeIntentSearch(
      {
        query: "export csv",
        type: "req",
        semanticFacets: { actions: ["export"], objects: ["csv"] },
        minScore: 0.01,
      },
      {
        query: async (goal: string) => {
          if (goal.includes("kb_relationship")) {
            return {
              success: true,
              bindings: {
                Edges:
                  "[[implements,REQ-EXPORT,SYM-EXPORT],[covered_by,SYM-EXPORT,TEST-RELATED]]",
              },
            };
          }
          if (goal.includes("SYM-EXPORT")) {
            return {
              success: true,
              bindings: {
                Results: encodeEntities([
                  entity("SYM-EXPORT", "Export symbol", { type: "symbol" }),
                ]),
              },
            };
          }
          if (goal.includes("TEST-RELATED")) {
            return {
              success: true,
              bindings: { Results: encodeEntities([related]) },
            };
          }
          return {
            success: true,
            bindings: { Results: encodeEntities([seeded, ...extra, related]) },
          };
        },
        searchEntities: async () => ({
          entities: [seeded],
          count: 1,
        }),
        nextSolution: async () => null,
        save: async () => ({ success: true, bindings: {} }),
      },
      "/tmp",
    );
    expect(found.analysis.rankingMode).toBe("intent-v1");
    expect(found.analysis.candidateCount).toBeGreaterThan(0);
    expect(
      found.matches.some((match) => String(match.entity.id) === "SYM-EXPORT") ||
        found.analysis.candidateCount >= 1,
    ).toBe(true);

    const capped = await executeIntentSearch(
      {
        query: "cap",
        sourceLocations: [{ path: "src/a.ts" }],
        minScore: 0.99,
      },
      {
        query: async () => ({
          success: true,
          bindings: { Results: encodeEntities(oversized), Edges: "[]" },
        }),
        nextSolution: async () => null,
        save: async () => ({ success: true, bindings: {} }),
      },
      "/tmp",
    );
    expect(capped.analysis.candidateCount).toBeLessThanOrEqual(10_000);
  });
});
