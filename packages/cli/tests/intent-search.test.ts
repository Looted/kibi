import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  executeIntentSearch,
  questionPaths,
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

  test("meets a question's past tense with the entity's base verb", async () => {
    const result = await rankIntentEntities(
      [
        entity("REQ-PLAN-APPLY", "Bootstrap plan review and apply safety"),
        entity("REQ-HOOK-ORDER", "Hooks run before and after every bootstrap"),
      ],
      { query: "what must a bootstrap plan guarantee before it is applied?" },
      workspaceRoot,
      [],
    );
    expect(result.matches[0]?.entity.id).toBe("REQ-PLAN-APPLY");
  });

  test("does not rank on the connecting words of a question", async () => {
    const result = await rankIntentEntities(
      [
        entity(
          "REQ-CONTRADICTIONS",
          "Contradiction checks decide rule conflicts",
        ),
        entity(
          "REQ-HOST-LISTS",
          "Each host gets the other requirement list once",
        ),
      ],
      {
        query: "what happens when two requirements contradict each other?",
      },
      workspaceRoot,
      [],
    );
    expect(result.matches[0]?.entity.id).toBe("REQ-CONTRADICTIONS");
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

  // implements REQ-search-answer-hygiene
  test("a requirement tying with its own scenario is not ambiguous; a tie with another requirement is", async () => {
    const requirement = entity("REQ-A", "Invoice retention period");
    const scenario = {
      ...entity("SCEN-A", "Invoice retention period"),
      type: "scenario",
      source: ".kb/scenarios/SCEN-A.md",
    };
    const edges = [
      { relationship: "specified_by", from: "REQ-A", to: "SCEN-A" },
    ];
    const kin = await rankIntentEntities(
      [requirement, scenario],
      { query: "invoice retention" },
      workspaceRoot,
      edges,
    );
    expect(kin.matches.map((match) => match.entity.id)).toEqual([
      "REQ-A",
      "SCEN-A",
    ]);
    expect(kin.analysis.topTwoMargin).toBeLessThan(0.05);
    expect(kin.analysis.topRivalMargin).toBeNull();
    expect(kin.analysis.ambiguous).toBe(false);

    const rival = await rankIntentEntities(
      [requirement, scenario, entity("REQ-B", "Invoice retention period")],
      { query: "invoice retention" },
      workspaceRoot,
      edges,
    );
    expect(rival.analysis.topRivalMargin).toBeLessThan(0.05);
    expect(rival.analysis.ambiguous).toBe(true);
  });

  // implements REQ-search-answer-hygiene
  test("a requirement implemented by a source-located symbol surfaces without lexical overlap", async () => {
    const symbol = {
      id: "SYM-CAN-EXPORT",
      type: "symbol",
      title: "canExport",
      status: "active",
      source: ".kb/symbols/SYM-CAN-EXPORT.md",
      sourceFile: "src/app/services/auth.service.ts",
      sourceLine: 10,
      sourceEndLine: 20,
    };
    const owner = entity("REQ-EXPORT-GUARD", "Exports are limited to auditors");
    const bystander = entity("REQ-OTHER", "Unrelated behavior");
    const edges = [
      {
        relationship: "implements",
        from: "SYM-CAN-EXPORT",
        to: "REQ-EXPORT-GUARD",
      },
    ];
    const options = {
      query: "which rule does this helper enforce",
      sourceLocations: [
        { path: "src/app/services/auth.service.ts", symbol: "canExport" },
      ],
    };
    const result = await rankIntentEntities(
      [symbol, owner, bystander],
      options,
      workspaceRoot,
      edges,
    );
    const ids = result.matches.map((match) => match.entity.id);
    expect(ids).toContain("SYM-CAN-EXPORT");
    expect(ids).toContain("REQ-EXPORT-GUARD");
    expect(ids).not.toContain("REQ-OTHER");
    const requirement = result.matches.find(
      (match) => match.entity.id === "REQ-EXPORT-GUARD",
    );
    expect(requirement?.evidence.sourceMatches).toEqual([
      {
        path: "src/app/services/auth.service.ts",
        symbolId: "SYM-CAN-EXPORT",
        distance: 3,
      },
    ]);
    expect(requirement?.reasons).toContain(
      "implemented at the source location",
    );
    expect(requirement?.reasons).not.toContain("source location match");
    // Without the implements edge (the first ranking pass) nothing is
    // inherited: only the graph says what the symbol is for.
    const firstPass = await rankIntentEntities(
      [symbol, owner, bystander],
      options,
      workspaceRoot,
      [],
    );
    expect(firstPass.matches.map((match) => match.entity.id)).toEqual([
      "SYM-CAN-EXPORT",
    ]);
  });

  test("a question naming a new helper and its file reaches the requirement its identifier's words name", async () => {
    // The file's own symbols are about something else; the helper is not in
    // the KB yet. The path repeats the source location, and the identifier
    // carries the topic ("canExport" reads "can export").
    const viewMode = {
      id: "SYM-VIEW-MODE",
      type: "symbol",
      title: "AuthService.toggleViewMode",
      status: "active",
      source: ".kb/symbols.yaml",
      sourceFile: "src/app/services/auth.service.ts",
      sourceLine: 40,
      sourceEndLine: 60,
    };
    const exportRule = entity(
      "REQ-EXPORT-REPORTS",
      "An auditor must be able to export reports.",
    );
    // A KB of some size: the question's other words ("new", "helper",
    // "user", "requirement") are common in it and say little.
    const noise = Array.from({ length: 30 }, (_, index) =>
      entity(
        `REQ-NOISE-${index}`,
        `A new ${index % 2 === 0 ? "helper" : "user"} requirement ${index} stays linked`,
      ),
    );
    const result = await rankIntentEntities(
      [viewMode, exportRule, ...noise],
      {
        query:
          "Which requirement should I link a new `canExport(user)` helper in `src/app/services/auth.service.ts` to?",
        sourceLocations: [{ path: "src/app/services/auth.service.ts" }],
      },
      workspaceRoot,
      [],
    );
    const ids = result.matches.map((match) => String(match.entity.id));
    expect(ids).toContain("REQ-EXPORT-REPORTS");
    expect(ids).toContain("SYM-VIEW-MODE");
    const firstNoise = ids.findIndex((id) => id.startsWith("REQ-NOISE-"));
    expect(ids.indexOf("REQ-EXPORT-REPORTS")).toBeLessThan(
      firstNoise === -1 ? Number.POSITIVE_INFINITY : firstNoise,
    );
  });

  test("words the question writes as code outweigh the words around them", async () => {
    // The admin rule grants export among other things; "can" and "export"
    // are a small part of what its text matches, so only the weight of the
    // code span keeps it above the threshold next to the auditor rule.
    const auditor = entity(
      "REQ-AUDITOR-EXPORT",
      "An auditor must be able to export reports.",
    );
    const admin = entity(
      "REQ-ADMIN-REQUESTS",
      "An admin must be able to read, update and delete any analysis request, and export reports.",
    );
    const noise = Array.from({ length: 30 }, (_, index) =>
      entity(
        `REQ-NOISE-${index}`,
        `A ${index % 3 === 0 ? "helper" : index % 3 === 1 ? "user" : "coach"} can link requirement ${index}`,
      ),
    );
    const query =
      "Which requirement should I link a new `canExport(user)` helper in `src/app/services/auth.service.ts` to?";
    const ranked = async (text: string) =>
      (
        await rankIntentEntities(
          [auditor, admin, ...noise],
          {
            query: text,
            sourceLocations: [{ path: "src/app/services/auth.service.ts" }],
          },
          workspaceRoot,
          [],
        )
      ).matches.map((match) => String(match.entity.id));
    const ids = await ranked(query);
    expect(ids.slice(0, 2).sort()).toEqual([
      "REQ-ADMIN-REQUESTS",
      "REQ-AUDITOR-EXPORT",
    ]);
    // The same words without backticks carry no extra weight.
    expect(await ranked(query.replaceAll("`", ""))).not.toContain(
      "REQ-ADMIN-REQUESTS",
    );
  });

  test("a file path written in the question does not dilute its topic", async () => {
    // Without sourceLocations the path's words ("app", "services", "auth",
    // "service", "ts") would match the file's tests and outrank the topic.
    const fileTest = entity(
      "TEST-AUTH-SERVICE",
      "Auth service unit tests: app services toggle the view mode",
      { type: "test" },
    );
    const exportRule = entity(
      "REQ-EXPORT-REPORTS",
      "An auditor must be able to export reports.",
    );
    const noise = Array.from({ length: 30 }, (_, index) =>
      entity(
        `REQ-NOISE-${index}`,
        `A new ${index % 2 === 0 ? "helper" : "user"} requirement ${index} stays linked`,
      ),
    );
    const result = await rankIntentEntities(
      [fileTest, exportRule, ...noise],
      {
        query:
          "Which requirement should I link a new `canExport(user)` helper in `src/app/services/auth.service.ts` to?",
      },
      workspaceRoot,
      [],
    );
    expect(result.matches[0]?.entity.id).toBe("REQ-EXPORT-REPORTS");
    expect(result.matches.map((match) => match.entity.id)).not.toContain(
      "TEST-AUTH-SERVICE",
    );
    expect(
      questionPaths(
        "Is `./src/app/a.service.ts` or docs/guide.md covered? See https://example.com/spec.md and v1.2",
      ),
    ).toEqual(["src/app/a.service.ts", "docs/guide.md"]);
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

describe("intent-v1 compound queries", () => {
  const corpus = [
    entity("REQ-ROLE-LIMIT", "A user holds at most two roles at the same time"),
    entity("REQ-EXPORT", "An auditor must be able to export reports"),
    entity("REQ-UPLOAD", "Video uploads resume after a dropped connection"),
    entity("REQ-PLAYBACK", "Playback keeps the selected speed"),
    entity("REQ-BILLING", "Invoices are issued at the end of the month"),
  ];

  test("a clause that matches is not diluted by the other clauses", async () => {
    const result = await rankIntentEntities(
      corpus,
      {
        query:
          "user roles: how many roles can a user have, support team escalation",
      },
      workspaceRoot,
      [],
    );
    expect(result.analysis.abstained).toBe(false);
    expect(result.matches[0]?.entity.id).toBe("REQ-ROLE-LIMIT");
  });

  test("the same words as one clause still abstain", async () => {
    const result = await rankIntentEntities(
      corpus,
      {
        query:
          "user roles how many roles can a user have support team escalation",
      },
      workspaceRoot,
      [],
    );
    expect(result.analysis.abstained).toBe(true);
  });

  test("a one-word clause does not stand in for the question", async () => {
    const result = await rankIntentEntities(
      corpus,
      { query: "roles, quarterly escalation budget forecast" },
      workspaceRoot,
      [],
    );
    expect(result.analysis.abstained).toBe(true);
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
