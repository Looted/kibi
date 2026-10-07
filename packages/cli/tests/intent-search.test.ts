import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  executeIntentSearch,
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
  test("ranks on the question's domain terms, not its scaffolding", async () => {
    const result = await rankIntentEntities(
      [
        entity("REQ-DETACHED", "Detached HEAD branch attachment"),
        entity("REQ-SHOULD-A", "What the CLI should print"),
        entity("REQ-SHOULD-B", "How agents should search"),
        entity("REQ-SHOULD-C", "Which hooks should run"),
      ],
      { query: "how should we handle a detached HEAD?" },
      workspaceRoot,
      [],
    );
    expect(result.matches.map((match) => match.entity.id)).toEqual([
      "REQ-DETACHED",
    ]);
  });

  test("ignores the frame of a 'what governs' question", async () => {
    const result = await rankIntentEntities(
      [
        entity("REQ-UPLOAD-RESUME", "Incomplete video uploads can be resumed"),
        entity("REQ-PLAYBACK", "Playback rules govern the video player", {
          semantic_text: "Playback resumes once an upload finishes.",
        }),
      ],
      { query: "what governs resuming a video upload?" },
      workspaceRoot,
      [],
    );
    expect(result.matches[0]?.entity.id).toBe("REQ-UPLOAD-RESUME");
  });

  test("meets a question's verb with the entity's noun", async () => {
    const result = await rankIntentEntities(
      [
        entity("REQ-CONFLICTS", "Contradiction witnesses for requirements"),
        entity("REQ-OTHER", "Release notes formatting"),
      ],
      { query: "what happens when requirements contradict" },
      workspaceRoot,
      [],
    );
    expect(result.matches[0]?.entity.id).toBe("REQ-CONFLICTS");
  });

  test("ranks superseded entities below current ones and says why", async () => {
    const result = await rankIntentEntities(
      [
        entity("REQ-OLD", "Checkout total policy", { status: "active" }),
        entity("REQ-DEPRECATED", "Checkout total policy", {
          status: "deprecated",
        }),
        entity("REQ-NEW", "Checkout total policy", { status: "open" }),
      ],
      { query: "checkout total policy" },
      workspaceRoot,
      [{ relationship: "supersedes", from: "REQ-NEW", to: "REQ-OLD" }],
    );
    expect(result.matches[0]?.entity.id).toBe("REQ-NEW");
    const old = result.matches.find((match) => match.entity.id === "REQ-OLD");
    const deprecated = result.matches.find(
      (match) => match.entity.id === "REQ-DEPRECATED",
    );
    expect(old?.reasons).toContain("demoted: superseded");
    expect(deprecated?.reasons).toContain("demoted: deprecated");
    expect(result.analysis.ambiguous).toBe(false);
  });

  test("flags near-tied leading matches as ambiguous", async () => {
    const result = await rankIntentEntities(
      [
        entity("REQ-A", "Invoice retention period"),
        entity("REQ-B", "Invoice retention period"),
      ],
      { query: "invoice retention" },
      workspaceRoot,
      [],
    );
    expect(result.analysis.ambiguous).toBe(true);
  });

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

  test("loads source-located candidates as projected rows through bounded source pages", async () => {
    const goals: string[] = [];
    let fullEntityQueries = 0;

    const result = await executeIntentSearch(
      {
        query: "unrelated editor wording",
        type: "symbol",
        sourceLocations: [
          { path: "src/tax.ts", line: 7, symbol: "Tax calculation" },
        ],
      },
      {
        query: async (goal: string) => {
          goals.push(goal);
          if (goal.includes("kb_list_search_candidates")) {
            return {
              success: true,
              bindings: {
                Rows: "[['SYM-TAX',symbol,[id='SYM-TAX',title='Tax calculation',sourceFile='src/tax.ts',sourceLine=4,sourceEndLine=10]]]",
                Count: "1",
              },
            };
          }
          return { success: true, bindings: { Edges: "[]" } };
        },
        queryEntities: async () => {
          fullEntityQueries += 1;
          return { entities: [], count: 0 };
        },
        searchEntities: async () => ({ entities: [], count: 0 }),
      } as never,
      workspaceRoot,
    );

    expect(fullEntityQueries).toBe(0);
    expect(
      goals.filter((goal) => goal.includes("kb_list_search_candidates")),
    ).toEqual([
      "kb_list_search_candidates('symbol', 'src/tax.ts', 500, 0, Rows, Count)",
    ]);
    expect(goals.some((goal) => goal.includes("kb_relationship"))).toBe(true);
    expect(result.matches[0]?.entity.id).toBe("SYM-TAX");
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

describe("intent-v1 search snippets", () => {
  function workspaceWith(files: Record<string, string>): string {
    const root = mkdtempSync(path.join(tmpdir(), "kibi-intent-snippet-"));
    for (const [relative, content] of Object.entries(files)) {
      const absolute = path.join(root, relative);
      mkdirSync(path.dirname(absolute), { recursive: true });
      writeFileSync(absolute, content);
    }
    return root;
  }

  test("shows the first context prose instead of repeating the statement", async () => {
    const root = workspaceWith({
      ".kb/requirements/REQ-EXPORT-SIGN.md":
        "---\nid: REQ-EXPORT-SIGN\ntitle: Exports are signed\n---\nExports must be signed.\n\n## Context\n\nSecurity asked for signatures after an audit found unsigned exports.\n",
      ".kb/requirements/REQ-EXPORT-FLAT.md":
        "---\nid: REQ-EXPORT-FLAT\ntitle: Exports are archived\n---\nExports must be archived.\n",
    });
    try {
      const result = await rankIntentEntities(
        [
          entity("REQ-EXPORT-SIGN", "Exports are signed"),
          entity("REQ-EXPORT-FLAT", "Exports are archived"),
        ],
        { query: "exports" },
        root,
        [],
      );
      const snippets = Object.fromEntries(
        result.matches.map((match) => [match.entity.id, match.snippet]),
      );
      expect(snippets["REQ-EXPORT-SIGN"]).toBe(
        "Security asked for signatures after an audit found unsigned exports.",
      );
      // No context prose: the first body line, as before.
      expect(snippets["REQ-EXPORT-FLAT"]).toBe("Exports must be archived.");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
