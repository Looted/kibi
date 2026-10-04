import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { IntentSearchMatch } from "../src/intent-search.js";
import type { PrologQueryResult } from "../src/public/operations/runtime-types.js";
import {
  SEARCH_ANSWER_LIMITS,
  type SearchAnswer,
  adrExcerpt,
  buildSearchAnswer,
  fitSearchAnswer,
  projectVerdict,
} from "../src/search-answer.js";

type Row = Record<string, string>;

type FakeKbOptions = Readonly<{
  /** Raw verdict rows by requirement id; others get an empty verdict. */
  verdicts?: Record<string, Record<string, unknown>>;
  scope?: Record<string, unknown>;
  /** Fail the verdict lookup with this engine error. */
  verdictError?: string;
}>;

function idsIn(goal: string, pattern: RegExp): string[] | undefined {
  const list = pattern.exec(goal)?.[1];
  if (list === undefined) return undefined;
  return [...list.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map(
    (match) => match[1] as string,
  );
}

/**
 * An engine port over a fixture graph that answers the batched goals the
 * answer layer sends: an edge lookup, projected entity rows and the verdicts
 * of the governing requirements, alone or conjoined in one query.
 */
function fakeKb(
  entities: Record<string, Row>,
  edges: ReadonlyArray<readonly [string, string, string]>,
  options: FakeKbOptions = {},
) {
  const goals: string[] = [];
  return {
    goals,
    query: async (goal: string): Promise<PrologQueryResult> => {
      goals.push(goal);
      const bindings: Record<string, string> = {};
      const edgeIds = idsIn(goal, /member\(From, \[([^\]]*)\]\)/);
      if (edgeIds !== undefined) {
        const rows = edges
          .filter(
            ([, from, to]) => edgeIds.includes(from) || edgeIds.includes(to),
          )
          .map(([rel, from, to]) => `[${rel},'${from}','${to}']`);
        bindings.Edges = `[${rows.join(",")}]`;
      }
      const rowIds = idsIn(goal, /member\(Id, \[([^\]]*)\]\)/);
      if (rowIds !== undefined) {
        const rows = rowIds.flatMap((id) => {
          const entity = entities[id];
          if (!entity) return [];
          const props = Object.entries(entity)
            .filter(([key]) => key !== "type")
            .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
            .join(",");
          return [`['${id}',${entity.type},[${props}]]`];
        });
        bindings.Results = `[${rows.join(",")}]`;
      }
      const verdictIds = idsIn(
        goal,
        /search_answer_verdicts_json\(\[([^\]]*)\]/,
      );
      if (verdictIds !== undefined) {
        if (options.verdictError !== undefined)
          return { success: false, bindings: {}, error: options.verdictError };
        const payload = {
          requirements: verdictIds.map(
            (id) =>
              options.verdicts?.[id] ?? {
                id,
                contradictions: [],
                scenarios: [],
                forbids: [],
                inventory: {
                  status: "passed",
                  propositionCount: 1,
                  unresolved: [],
                },
              },
          ),
          scope: options.scope ?? {
            snapshotId: "generation-1:7",
            syncedAt: "2026-10-01T12:00:00Z",
          },
        };
        // The engine prints the JSON string as a quoted Prolog string.
        bindings.JsonString = JSON.stringify(JSON.stringify(payload));
      }
      return { success: true, bindings };
    },
  };
}

function match(entity: Row, score: number): IntentSearchMatch {
  return {
    entity,
    score,
    reasons: ["intent token match"],
    evidence: {
      normalizedScore: score,
      matchedFacets: [],
      sourceMatches: [],
      graphPaths: [],
      abstentionEligible: false,
    },
  };
}

const ENTITIES: Record<string, Row> = {
  "REQ-OLD": {
    id: "REQ-OLD",
    type: "req",
    title: "Checkout requires a positive total",
    status: "open",
  },
  "REQ-NEW": {
    id: "REQ-NEW",
    type: "req",
    title: "Checkout allows free orders with a valid promotion",
    status: "open",
  },
  "FACT-TOTAL": {
    id: "FACT-TOTAL",
    type: "fact",
    title: "Final payable total may be zero with a promotion",
    status: "active",
    fact_kind: "rule",
  },
  "SCEN-FREE": {
    id: "SCEN-FREE",
    type: "scenario",
    title: "A fully discounted cart checks out",
    status: "active",
  },
  "TEST-FREE": {
    id: "TEST-FREE",
    type: "test",
    title: "Free checkout end to end",
    status: "passing",
  },
  "ADR-PROMO": {
    id: "ADR-PROMO",
    type: "adr",
    title: "Promotions may zero the payable total",
    status: "accepted",
    source: ".kb/adr/ADR-PROMO.md",
  },
  "FACT-NOTE": {
    id: "FACT-NOTE",
    type: "fact",
    title: "Support saw zero-total carts fail",
    status: "active",
    fact_kind: "observation",
  },
  "REQ-STAFF": {
    id: "REQ-STAFF",
    type: "req",
    title: "Staff orders may skip the promotion check",
    status: "open",
    approved_by: "finance-lead",
  },
};

const EDGES = [
  ["supersedes", "REQ-NEW", "REQ-OLD"],
  ["requires_rule", "REQ-NEW", "FACT-TOTAL"],
  ["specified_by", "REQ-NEW", "SCEN-FREE"],
  ["verified_by", "REQ-NEW", "TEST-FREE"],
  ["relates_to", "REQ-NEW", "ADR-PROMO"],
] as const;

const workspaces: string[] = [];
afterAll(() => {
  for (const dir of workspaces) rmSync(dir, { recursive: true, force: true });
});

function workspaceWith(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-search-answer-"));
  workspaces.push(root);
  for (const [file, content] of Object.entries(files)) {
    const target = path.join(root, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  return root;
}

describe("search answer layer", () => {
  test("answers with the current requirement, what it requires and what verifies it", async () => {
    const answer = await buildSearchAnswer(fakeKb(ENTITIES, EDGES), [
      match(ENTITIES["REQ-OLD"] as Row, 0.6),
      match(ENTITIES["FACT-NOTE"] as Row, 0.4),
    ]);
    expect(answer.governing.map((req) => req.id)).toEqual(["REQ-NEW"]);
    const [current] = answer.governing;
    expect(current?.via).toBe("supersedes REQ-OLD");
    expect(current?.facts.map((fact) => fact.id)).toEqual(["FACT-TOTAL"]);
    expect(current?.scenarios.map((scenario) => scenario.id)).toEqual([
      "SCEN-FREE",
    ]);
    expect(current?.tests.map(({ id, via }) => ({ id, via }))).toEqual([
      { id: "TEST-FREE", via: "direct" },
    ]);
    expect(current?.adrs.map((adr) => adr.id)).toEqual(["ADR-PROMO"]);
    expect(answer.rationale.map((adr) => adr.id)).toEqual(["ADR-PROMO"]);
    expect(answer.notGoverning).toEqual([
      expect.objectContaining({ id: "REQ-OLD", supersededBy: "REQ-NEW" }),
    ]);
    expect(answer.observations.map((note) => note.id)).toEqual(["FACT-NOTE"]);
  });

  test("reaches the owning requirement from a matched scenario", async () => {
    const answer = await buildSearchAnswer(fakeKb(ENTITIES, EDGES), [
      match(ENTITIES["SCEN-FREE"] as Row, 0.5),
    ]);
    expect(answer.governing).toEqual([
      expect.objectContaining({ id: "REQ-NEW", via: "scenario SCEN-FREE" }),
    ]);
  });

  test("says that finding nothing is not evidence that nothing governs", async () => {
    const answer = await buildSearchAnswer(fakeKb(ENTITIES, EDGES), [
      match(ENTITIES["FACT-NOTE"] as Row, 0.4),
    ]);
    expect(answer.governing).toEqual([]);
    expect(answer.note).toContain("not evidence");
  });

  test("answering costs a few engine round trips however many entities are linked", async () => {
    const entities: Record<string, Row> = {
      "REQ-WIDE": {
        id: "REQ-WIDE",
        type: "req",
        title: "Wide requirement",
        status: "open",
      },
    };
    const edges: [string, string, string][] = [];
    for (let index = 0; index < 4; index += 1) {
      const fact = `FACT-W${index}`;
      const scenario = `SCEN-W${index}`;
      const test = `TEST-W${index}`;
      entities[fact] = {
        id: fact,
        type: "fact",
        title: fact,
        status: "active",
        fact_kind: "rule",
      };
      entities[scenario] = {
        id: scenario,
        type: "scenario",
        title: scenario,
        status: "active",
      };
      entities[test] = {
        id: test,
        type: "test",
        title: test,
        status: "active",
      };
      edges.push(
        ["requires_rule", "REQ-WIDE", fact],
        ["specified_by", "REQ-WIDE", scenario],
        ["verified_by", scenario, test],
      );
    }
    const kb = fakeKb(entities, edges);
    const answer = await buildSearchAnswer(kb, [
      match(entities["REQ-WIDE"] as Row, 0.8),
    ]);
    expect(answer.governing[0]?.facts).toHaveLength(4);
    expect(answer.governing[0]?.scenarios).toHaveLength(4);
    expect(answer.governing[0]?.tests).toHaveLength(4);
    // Seeds, requirement rows, linked entities, then verdicts with test rows.
    expect(kb.goals.length).toBeLessThanOrEqual(4);
  });
});

describe("search answer verdicts, exceptions and scope", () => {
  test("a requirement no check names has verdict none and the snapshot scope", async () => {
    const answer = await buildSearchAnswer(
      fakeKb(ENTITIES, EDGES),
      [match(ENTITIES["REQ-NEW"] as Row, 0.9)],
      { branch: "feature/promo" },
    );
    expect(answer.governing[0]?.verdict).toEqual({
      status: "none",
      witnesses: [],
    });
    expect(answer.governing[0]?.unknowns).toEqual([]);
    expect(answer.governing[0]?.exceptions).toEqual([]);
    expect(answer.scope).toEqual({
      branch: "feature/promo",
      snapshotId: "generation-1:7",
      syncedAt: "2026-10-01T12:00:00Z",
    });
  });

  test("contradiction and infeasibility witnesses set the verdict, unknowns are listed", async () => {
    const kb = fakeKb(ENTITIES, EDGES, {
      verdicts: {
        "REQ-NEW": {
          id: "REQ-NEW",
          contradictions: [
            {
              kind: "strict_property",
              status: "contradiction",
              with: "REQ-OLD",
              facts: ["FACT-TOTAL", "FACT-POSITIVE"],
              reason: "payable total: zero allowed vs strictly positive",
            },
            {
              kind: "rule",
              status: "unresolved",
              with: "REQ-STAFF",
              facts: ["FACT-TOTAL", "FACT-STAFF"],
              reason:
                "Rule conflict (unresolved) between REQ-NEW and REQ-STAFF",
            },
          ],
          scenarios: [
            {
              scenario: "SCEN-FREE",
              outcome: "infeasible",
              requirement: "REQ-OLD",
              requirements: ["REQ-OLD"],
              assumed: ["FACT-ZERO"],
              fact: ["FACT-POSITIVE"],
              reason: "total 0 violates total > 0",
            },
            {
              scenario: "SCEN-GIFT",
              outcome: "unknown",
              reason: "no_assumptions",
              facts: [],
            },
          ],
          forbids: [],
          inventory: {
            status: "unresolved",
            propositionCount: 2,
            unresolved: [
              { claim: "promotions are valid", status: "ontology_gap" },
            ],
          },
        },
      },
    });
    const answer = await buildSearchAnswer(kb, [
      match(ENTITIES["REQ-NEW"] as Row, 0.9),
    ]);
    const [req] = answer.governing;
    expect(req?.verdict.status).toBe("contradiction");
    expect(req?.verdict.witnesses).toEqual([
      {
        check: "domain-contradictions",
        status: "contradiction",
        with: "REQ-OLD",
        facts: ["FACT-TOTAL", "FACT-POSITIVE"],
        detail: "payable total: zero allowed vs strictly positive",
      },
      {
        check: "scenario-feasibility",
        status: "infeasible",
        with: "REQ-OLD",
        scenario: "SCEN-FREE",
        facts: ["FACT-ZERO", "FACT-POSITIVE"],
        detail: "total 0 violates total > 0",
      },
    ]);
    expect(req?.unknowns.map((unknown) => unknown.kind)).toEqual([
      "contradiction_unresolved",
      "feasibility_unknown",
      "unresolved_proposition",
    ]);
    expect(req?.unknowns[0]?.entities).toEqual([
      "REQ-STAFF",
      "FACT-TOTAL",
      "FACT-STAFF",
    ]);
    expect(req?.unknowns[1]?.detail).toContain("SCEN-GIFT");
    expect(req?.unknowns[2]?.detail).toBe("ontology_gap: promotions are valid");
  });

  test("only unknowns give verdict unknown; a missing clause ledger is one", () => {
    const projected = projectVerdict({
      id: "REQ-X",
      contradictions: [],
      scenarios: [],
      forbids: [],
      inventory: { status: "missing", propositionCount: 0, unresolved: [] },
    });
    expect(projected.verdict).toEqual({ status: "unknown", witnesses: [] });
    expect(projected.unknowns.map((unknown) => unknown.kind)).toEqual([
      "analysis_incomplete",
    ]);
  });

  test("a scenario the requirement forbids elsewhere makes it infeasible", () => {
    const projected = projectVerdict({
      id: "REQ-X",
      contradictions: [],
      scenarios: [],
      forbids: [
        {
          scenario: "SCEN-OTHER",
          assumed: ["FACT-A"],
          fact: ["FACT-B"],
          reason: "limit 5 excludes 10",
        },
      ],
      inventory: { status: "passed", propositionCount: 1, unresolved: [] },
    });
    expect(projected.verdict).toEqual({
      status: "infeasible",
      witnesses: [
        {
          check: "scenario-feasibility",
          status: "infeasible",
          scenario: "SCEN-OTHER",
          facts: ["FACT-A", "FACT-B"],
          detail: "limit 5 excludes 10",
        },
      ],
    });
  });

  test("witnesses and unknowns beyond the per-requirement limit mark the answer truncated", () => {
    const many = Array.from({ length: 6 }, (_, index) => ({
      status: "contradiction",
      with: `REQ-${index}`,
      facts: [],
      reason: `conflict ${index}`,
    }));
    const projected = projectVerdict(
      { id: "REQ-X", contradictions: many, scenarios: [], forbids: [] },
      4,
    );
    expect(projected.verdict.status).toBe("contradiction");
    expect(projected.verdict.witnesses).toHaveLength(4);
    expect(projected.truncated).toBe(true);
  });

  test("a verdict the engine cannot compute leaves the answer standing as unknown", async () => {
    const answer = await buildSearchAnswer(
      fakeKb(ENTITIES, EDGES, { verdictError: "timeout after 30000ms" }),
      [match(ENTITIES["REQ-NEW"] as Row, 0.9)],
    );
    const [req] = answer.governing;
    expect(req?.id).toBe("REQ-NEW");
    expect(req?.tests.map((test) => test.id)).toEqual(["TEST-FREE"]);
    expect(req?.verdict).toEqual({ status: "unknown", witnesses: [] });
    expect(req?.unknowns.map((unknown) => unknown.kind)).toEqual([
      "verdict_unavailable",
    ]);
    expect(answer.scope).toEqual({
      branch: null,
      snapshotId: "unknown",
      syncedAt: null,
    });
  });

  test("a requirement whose checks raised an error reports it as unavailable", async () => {
    const answer = await buildSearchAnswer(
      fakeKb(ENTITIES, EDGES, {
        verdicts: {
          "REQ-NEW": { id: "REQ-NEW", error: "type_error(dict, foo)" },
        },
      }),
      [match(ENTITIES["REQ-NEW"] as Row, 0.9)],
    );
    expect(answer.governing[0]?.verdict.status).toBe("unknown");
    expect(answer.governing[0]?.unknowns[0]).toEqual({
      kind: "verdict_unavailable",
      detail:
        "The checks could not be evaluated for this requirement: type_error(dict, foo)",
      entities: [],
    });
  });

  test("requirements that exempt the governing one are listed with their approver", async () => {
    const answer = await buildSearchAnswer(
      fakeKb(ENTITIES, [...EDGES, ["exempts", "REQ-STAFF", "REQ-NEW"]]),
      [match(ENTITIES["REQ-NEW"] as Row, 0.9)],
    );
    expect(answer.governing[0]?.exceptions).toEqual([
      {
        id: "REQ-STAFF",
        title: "Staff orders may skip the promotion check",
        status: "open",
        approvedBy: "finance-lead",
      },
    ]);
  });

  test("a matched exception keeps its approver although search rows omit it", async () => {
    const { approved_by: _omitted, ...searchRow } = ENTITIES[
      "REQ-STAFF"
    ] as Row;
    const answer = await buildSearchAnswer(
      fakeKb(ENTITIES, [...EDGES, ["exempts", "REQ-STAFF", "REQ-NEW"]]),
      [match(ENTITIES["REQ-NEW"] as Row, 0.9), match(searchRow, 0.8)],
    );
    const current = answer.governing.find((req) => req.id === "REQ-NEW");
    expect(current?.exceptions).toEqual([
      expect.objectContaining({ id: "REQ-STAFF", approvedBy: "finance-lead" }),
    ]);
  });
});

describe("search answer rationale excerpts", () => {
  test("an ADR's rationale carries its source and the opening of its decision", async () => {
    const root = workspaceWith({
      ".kb/adr/ADR-PROMO.md": [
        "---",
        "id: ADR-PROMO",
        "---",
        "# Promotions may zero the payable total",
        "",
        "## Context",
        "",
        "Support saw zero-total carts fail.",
        "",
        "## Decision",
        "",
        "Allow a **valid** promotion to bring the payable total to zero. Keep `min_total` at 0 for Node.js clients.",
        "",
        "## Consequences",
        "",
        "Free orders skip payment capture.",
      ].join("\n"),
    });
    const answer = await buildSearchAnswer(
      fakeKb(ENTITIES, EDGES),
      [match(ENTITIES["REQ-NEW"] as Row, 0.9)],
      { workspaceRoot: root },
    );
    expect(answer.rationale).toEqual([
      {
        id: "ADR-PROMO",
        title: "Promotions may zero the payable total",
        status: "accepted",
        source: ".kb/adr/ADR-PROMO.md",
        excerpt:
          "Allow a valid promotion to bring the payable total to zero. Keep min_total at 0 for Node.js clients.",
      },
    ]);
    // The requirement names its ADRs; the excerpt is not repeated there.
    expect(answer.governing[0]?.adrs).toEqual([
      {
        id: "ADR-PROMO",
        title: "Promotions may zero the payable total",
        status: "accepted",
      },
    ]);
  });

  test("an ADR whose source cannot be read keeps its source path without an excerpt", async () => {
    const answer = await buildSearchAnswer(
      fakeKb(ENTITIES, EDGES),
      [match(ENTITIES["REQ-NEW"] as Row, 0.9)],
      { workspaceRoot: workspaceWith({}) },
    );
    expect(answer.rationale).toEqual([
      expect.objectContaining({
        id: "ADR-PROMO",
        source: ".kb/adr/ADR-PROMO.md",
      }),
    ]);
    expect(answer.rationale[0]?.excerpt).toBeUndefined();
  });
});

describe("ADR excerpts", () => {
  test("prefer the decision, then the rationale, then the first prose", () => {
    expect(adrExcerpt("## Context\n\nWhy.\n\n## Decision\n\nDo this.\n")).toBe(
      "Do this.",
    );
    expect(adrExcerpt("## Context\n\nWhy.\n\n## Rationale\n\nBecause.\n")).toBe(
      "Because.",
    );
    expect(adrExcerpt("Intro paragraph.\n\n## Notes\n\nMore.\n")).toBe(
      "Intro paragraph.",
    );
    expect(adrExcerpt("")).toBeUndefined();
  });

  test("keep whole sentences, dotted names and snake_case, without code, tables or links", () => {
    const body = [
      "## Decision",
      "",
      "- Store shards in .kb/relationships/ keyed by created_at.",
      "- See [ADR-017](./ADR-017.md) for Node.js 18+ support.",
      "",
      "| a | b |",
      "```ts",
      "const ignored = true.",
      "```",
    ].join("\n");
    expect(adrExcerpt(body)).toBe(
      "Store shards in .kb/relationships/ keyed by created_at. See ADR-017 for Node.js 18+ support.",
    );
  });

  test("stop at the last sentence that fits and clip a single long sentence", () => {
    const body = `## Decision\n\nFirst short sentence. ${"word ".repeat(100)}end.`;
    expect(adrExcerpt(body, 60)).toBe("First short sentence.");
    const long = adrExcerpt(`## Decision\n\n${"x".repeat(500)}`, 60);
    expect(Array.from(long ?? "")).toHaveLength(60);
    expect(long?.endsWith("…")).toBe(true);
  });
});

const CHAIN: Record<string, Row> = {
  "REQ-A": { id: "REQ-A", type: "req", title: "Orders ship", status: "open" },
  "SCEN-A": {
    id: "SCEN-A",
    type: "scenario",
    title: "A paid order ships",
    status: "active",
  },
  "TEST-A": {
    id: "TEST-A",
    type: "test",
    title: "Shipping end to end",
    status: "passing",
  },
  "TEST-V": {
    id: "TEST-V",
    type: "test",
    title: "Shipping validation",
    status: "passing",
  },
  "TEST-D": {
    id: "TEST-D",
    type: "test",
    title: "Shipping unit",
    status: "passing",
  },
};

describe("search answer verification paths", () => {
  test("collects tests through the requirement's scenarios and says how each was reached", async () => {
    const answer = await buildSearchAnswer(
      fakeKb(CHAIN, [
        ["specified_by", "REQ-A", "SCEN-A"],
        ["verified_by", "SCEN-A", "TEST-A"],
        ["validates", "TEST-V", "SCEN-A"],
        ["verified_by", "REQ-A", "TEST-D"],
        // Reached directly and through the scenario: reported once, as direct.
        ["verified_by", "SCEN-A", "TEST-D"],
      ]),
      [match(CHAIN["REQ-A"] as Row, 0.7)],
    );
    expect(answer.governing.map((req) => req.id)).toEqual(["REQ-A"]);
    expect(
      answer.governing[0]?.tests.map(({ id, via }) => ({ id, via })),
    ).toEqual([
      { id: "TEST-D", via: "direct" },
      { id: "TEST-A", via: "SCEN-A" },
      { id: "TEST-V", via: "SCEN-A" },
    ]);
    expect(answer.truncated).toBe(false);
  });

  test("the canonical chain alone gives the requirement its scenario-backed test", async () => {
    const answer = await buildSearchAnswer(
      fakeKb(CHAIN, [
        ["specified_by", "REQ-A", "SCEN-A"],
        ["verified_by", "SCEN-A", "TEST-A"],
      ]),
      [match(CHAIN["REQ-A"] as Row, 0.7)],
    );
    expect(answer.governing[0]?.tests).toEqual([
      {
        id: "TEST-A",
        title: "Shipping end to end",
        status: "passing",
        via: "SCEN-A",
      },
    ]);
  });

  test("a matched test that verifies a scenario is lifted to the scenario's requirement", async () => {
    const edges = [
      ["specified_by", "REQ-A", "SCEN-A"],
      ["verified_by", "SCEN-A", "TEST-A"],
      ["validates", "TEST-V", "SCEN-A"],
    ] as const;
    for (const testId of ["TEST-A", "TEST-V"]) {
      const answer = await buildSearchAnswer(fakeKb(CHAIN, edges), [
        match(CHAIN[testId] as Row, 0.5),
      ]);
      expect(answer.governing).toEqual([
        expect.objectContaining({
          id: "REQ-A",
          via: `test ${testId} via SCEN-A`,
        }),
      ]);
    }
  });

  test("a matched test that verifies a requirement directly still reaches it", async () => {
    const answer = await buildSearchAnswer(
      fakeKb(CHAIN, [["verified_by", "REQ-A", "TEST-D"]]),
      [match(CHAIN["TEST-D"] as Row, 0.5)],
    );
    expect(answer.governing).toEqual([
      expect.objectContaining({ id: "REQ-A", via: "test TEST-D" }),
    ]);
  });
});

describe("search answer byte ceiling", () => {
  const maxBytes = SEARCH_ANSWER_LIMITS.maxBytes;
  const size = (value: unknown) =>
    Buffer.byteLength(JSON.stringify(value), "utf8");
  const emptyVerdict = { status: "none", witnesses: [] } as const;
  const scope = { branch: null, snapshotId: "s", syncedAt: null };

  test("a single requirement with an oversized title is clipped to fit", async () => {
    const huge: Record<string, Row> = {
      "REQ-BIG": {
        id: "REQ-BIG",
        type: "req",
        title: "é".repeat(20_000),
        status: "open",
      },
    };
    const answer = await buildSearchAnswer(fakeKb(huge, []), [
      match(huge["REQ-BIG"] as Row, 0.9),
    ]);
    expect(size(answer)).toBeLessThanOrEqual(maxBytes);
    expect(answer.truncated).toBe(true);
    expect(answer.governing.map((req) => req.id)).toEqual(["REQ-BIG"]);
    expect(answer.governing[0]?.title.endsWith("…")).toBe(true);
  });

  test("many long-titled facts and large observations stay under the ceiling", async () => {
    const entities: Record<string, Row> = {
      "REQ-F": { id: "REQ-F", type: "req", title: "Facts", status: "open" },
    };
    const edges: [string, string, string][] = [];
    for (let index = 0; index < 12; index += 1) {
      const id = `FACT-${index}`;
      entities[id] = {
        id,
        type: "fact",
        title: `fact ${index} ${"x".repeat(9_000)}`,
        status: "active",
        fact_kind: "rule",
      };
      edges.push(["requires_rule", "REQ-F", id]);
    }
    const notes = Array.from({ length: 6 }, (_, index) =>
      match(
        {
          id: `FACT-NOTE-${index}`,
          type: "fact",
          title: "n".repeat(30_000),
          status: "active",
          fact_kind: "observation",
        },
        0.3,
      ),
    );
    const answer = await buildSearchAnswer(fakeKb(entities, edges), [
      match(entities["REQ-F"] as Row, 0.9),
      ...notes,
    ]);
    expect(size(answer)).toBeLessThanOrEqual(maxBytes);
    expect(answer.truncated).toBe(true);
    expect(answer.governing[0]?.id).toBe("REQ-F");
    expect(answer.governing[0]?.facts.length).toBeGreaterThan(0);
    expect(answer.observations.length).toBeGreaterThan(0);
  });

  test("large ADR excerpts are clipped and then dropped before any governing requirement", async () => {
    const entities: Record<string, Row> = {};
    const edges: [string, string, string][] = [];
    const files: Record<string, string> = {};
    const matches: IntentSearchMatch[] = [];
    for (let index = 0; index < 5; index += 1) {
      const req = `REQ-${index}-${"r".repeat(2_600)}`;
      const adr = `ADR-${index}`;
      entities[req] = { id: req, type: "req", title: "t", status: "open" };
      entities[adr] = {
        id: adr,
        type: "adr",
        title: "a",
        status: "accepted",
        source: `.kb/adr/${adr}.md`,
      };
      files[`.kb/adr/${adr}.md`] =
        `## Decision\n\n${"é".repeat(50_000)}. Second sentence.\n`;
      edges.push(["relates_to", req, adr]);
      matches.push(match(entities[req] as Row, 0.9 - index / 100));
    }
    const answer = await buildSearchAnswer(fakeKb(entities, edges), matches, {
      workspaceRoot: workspaceWith(files),
    });
    expect(size(answer)).toBeLessThanOrEqual(maxBytes);
    expect(answer.truncated).toBe(true);
    // Every governing requirement survives; the excerpts gave way.
    expect(answer.governing).toHaveLength(5);
    expect(answer.rationale.map((adr) => adr.id)).toEqual([
      "ADR-0",
      "ADR-1",
      "ADR-2",
    ]);
    for (const adr of answer.rationale) {
      expect(adr.source).toBe(`.kb/adr/${adr.id}.md`);
      if (adr.excerpt !== undefined)
        expect(Array.from(adr.excerpt).length).toBeLessThanOrEqual(
          SEARCH_ANSWER_LIMITS.excerptChars,
        );
    }
    expect(answer.rationale.at(-1)?.excerpt).toBeUndefined();
  });

  test("a verdict keeps its status when its witnesses must be dropped", () => {
    const witness = (index: number) => ({
      check: "domain-contradictions" as const,
      status: "contradiction" as const,
      with: `REQ-${index}`,
      facts: [`FACT-${index}-${"f".repeat(6_000)}`],
      detail: "d".repeat(5_000),
    });
    const answer = fitSearchAnswer(
      {
        version: "kibi.search-answer.v1",
        governing: [
          {
            id: "REQ-C",
            title: "Contradicted",
            score: 1,
            via: "matched",
            facts: [],
            scenarios: [],
            tests: [],
            adrs: [],
            verdict: {
              status: "contradiction",
              witnesses: [0, 1, 2, 3].map(witness),
            },
            exceptions: [],
            unknowns: [],
          },
        ],
        rationale: [],
        notGoverning: [],
        observations: [],
        scope,
        truncated: false,
        note: "n",
      },
      maxBytes,
    );
    expect(size(answer)).toBeLessThanOrEqual(maxBytes);
    expect(answer.truncated).toBe(true);
    expect(answer.governing[0]?.verdict.status).toBe("contradiction");
    const witnesses = answer.governing[0]?.verdict.witnesses ?? [];
    expect(witnesses.length).toBeGreaterThan(0);
    expect(witnesses.length).toBeLessThan(4);
    for (const kept of witnesses)
      expect(Array.from(kept.detail).length).toBeLessThanOrEqual(
        SEARCH_ANSWER_LIMITS.detailChars,
      );
  });

  test("when ids alone exceed the ceiling, side lists go before the requirement's links", () => {
    const long = (prefix: string, index: number) =>
      `${prefix}-${index}-${"z".repeat(3_000)}`;
    const entity = (prefix: string, index: number) => ({
      id: long(prefix, index),
      title: "t",
    });
    const input: SearchAnswer = {
      version: "kibi.search-answer.v1",
      governing: [
        {
          ...entity("REQ", 0),
          score: 1,
          via: `supersedes ${long("REQ", 9)}`,
          facts: [0, 1, 2, 3].map((index) => entity("FACT", index)),
          scenarios: [0, 1].map((index) => entity("SCEN", index)),
          tests: [0, 1].map((index) => ({
            ...entity("TEST", index),
            via: "direct",
          })),
          adrs: [entity("ADR", 0)],
          verdict: emptyVerdict,
          exceptions: [entity("REQ", 8)],
          unknowns: [
            {
              kind: "analysis_incomplete",
              detail: "x",
              entities: [long("FACT", 7)],
            },
          ],
        },
      ],
      rationale: [entity("ADR", 0)],
      notGoverning: [entity("REQ", 9)],
      observations: [entity("FACT-NOTE", 0)],
      scope,
      truncated: false,
      note: "n",
    };
    const answer = fitSearchAnswer(input, maxBytes);
    expect(size(answer)).toBeLessThanOrEqual(maxBytes);
    expect(answer.truncated).toBe(true);
    expect(answer.governing[0]?.id).toBe(long("REQ", 0));
    expect(answer.observations).toEqual([]);
    expect(answer.notGoverning).toEqual([]);
    expect(answer.rationale).toEqual([]);
    expect(answer.governing[0]?.unknowns).toEqual([]);
    expect(answer.governing[0]?.exceptions).toEqual([]);
    expect(answer.governing[0]?.facts.length).toBeGreaterThan(0);
    expect(answer.scope).toEqual(scope);
  });

  test("an answer already under the ceiling is returned unchanged", async () => {
    const answer = await buildSearchAnswer(fakeKb(ENTITIES, EDGES), [
      match(ENTITIES["REQ-NEW"] as Row, 0.9),
    ]);
    expect(fitSearchAnswer(answer, maxBytes)).toBe(answer);
    expect(answer.truncated).toBe(false);
  });
});
