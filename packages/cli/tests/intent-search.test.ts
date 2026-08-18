import { describe, expect, test } from "bun:test";
import {
  rankIntentEntities,
  validateIntentSearchInput,
} from "../src/intent-search.js";

const workspaceRoot = "/tmp/kibi-intent-search";

function entity(
  id: string,
  title: string,
  properties: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id,
    type: "req",
    title,
    status: "active",
    source: `.kb/requirements/${id}.md`,
    ...properties,
  };
}

describe("intent-v1 search ranking", () => {
  test("recovers functionality through host-agent semantic facets", async () => {
    const result = await rankIntentEntities(
      [
        entity("REQ-EXPORT", "Export report as CSV", {
          tags: ["download", "reporting"],
        }),
        entity("REQ-LOGIN", "Authenticate an account"),
      ],
      {
        query: "download report",
        semanticFacets: {
          actions: ["export"],
          objects: ["CSV file"],
        },
      },
      workspaceRoot,
      [],
    );

    expect(result.analysis.rankingMode).toBe("intent-v1");
    expect(result.matches[0]?.entity.id).toBe("REQ-EXPORT");
    expect(result.matches[0]?.reasons).toContain("semantic facet match");
    expect(result.matches[0]?.evidence.matchedFacets).toContain(
      "actions:export",
    );
  });

  test("matches an exact source location and symbol even without lexical overlap", async () => {
    const result = await rankIntentEntities(
      [
        entity("REQ-BILLING", "Billing authorization", {
          sourceFile: "src/billing/authorization.ts",
          sourceLine: 18,
          sourceEndLine: 31,
        }),
        entity("REQ-OTHER", "Unrelated behavior", {
          sourceFile: "src/billing/authorization.ts",
          sourceLine: 80,
          sourceEndLine: 90,
        }),
      ],
      {
        query: "unfamiliar operator wording",
        sourceLocations: [
          {
            path: "src/billing/authorization.ts",
            line: 22,
            symbol: "Billing authorization",
          },
        ],
      },
      workspaceRoot,
      [],
    );

    expect(result.matches[0]?.entity.id).toBe("REQ-BILLING");
    expect(result.matches[0]?.evidence.sourceMatches[0]).toMatchObject({
      path: "src/billing/authorization.ts",
      symbolId: "REQ-BILLING",
    });
    expect(result.matches[0]?.reasons).toContain("source location match");
  });

  test("includes bounded traceability graph evidence and deterministic tie-breaking", async () => {
    const result = await rankIntentEntities(
      [
        entity("REQ-ONE", "Shared behavior"),
        entity("REQ-TWO", "Shared behavior"),
      ],
      { query: "shared behavior" },
      workspaceRoot,
      [
        {
          relationship: "implements",
          from: "SYM-ONE",
          to: "REQ-ONE",
        },
      ],
    );

    expect(result.matches[0]?.entity.id).toBe("REQ-ONE");
    expect(result.matches[0]?.evidence.graphPaths).toEqual([
      {
        from: "SYM-ONE",
        relationships: ["implements"],
        to: "REQ-ONE",
      },
    ]);
    expect(result.matches[0]?.reasons).toContain("traceability graph match");
    expect(result.matches[1]?.entity.id).toBe("REQ-TWO");
  });

  test("abstains rather than returning a low-confidence result", async () => {
    const result = await rankIntentEntities(
      [entity("REQ-UNRELATED", "Unrelated behavior")],
      { query: "database migration", minScore: 0.4 },
      workspaceRoot,
      [],
    );

    expect(result.matches).toEqual([]);
    expect(result.analysis.abstained).toBe(true);
    expect(result.analysis.acceptedCount).toBe(0);
  });
});

describe("intent-v1 input validation", () => {
  test("rejects absolute and escaping source paths", () => {
    expect(() =>
      validateIntentSearchInput({
        query: "billing",
        sourceLocations: [{ path: "/etc/passwd" }],
      }),
    ).toThrow("workspace-relative");
    expect(() =>
      validateIntentSearchInput({
        query: "billing",
        sourceLocations: [{ path: "src/../secrets.ts" }],
      }),
    ).toThrow("workspace-relative");
  });

  test("rejects invalid thresholds and line coordinates", () => {
    expect(() =>
      validateIntentSearchInput({ query: "billing", minScore: 1.1 }),
    ).toThrow("between 0 and 1");
    expect(() =>
      validateIntentSearchInput({
        query: "billing",
        sourceLocations: [{ path: "src/billing.ts", line: 0 }],
      }),
    ).toThrow("positive integer");
  });
});
