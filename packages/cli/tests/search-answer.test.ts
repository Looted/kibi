import { describe, expect, test } from "bun:test";
import type { IntentSearchMatch } from "../src/intent-search.js";
import type { PrologQueryResult } from "../src/public/operations/runtime-types.js";
import {
  SEARCH_ANSWER_LIMITS,
  buildSearchAnswer,
  fitSearchAnswer,
} from "../src/search-answer.js";

type Row = Record<string, string>;

function fakeKb(
  entities: Record<string, Row>,
  edges: ReadonlyArray<readonly [string, string, string]>,
) {
  return {
    query: async (goal: string): Promise<PrologQueryResult> => {
      if (goal.startsWith("findall([Rel,From,To]")) {
        const ids = [...goal.matchAll(/'([^']+)'/g)].map((match) => match[1]);
        const rows = edges
          .filter(([, from, to]) => ids.includes(from) || ids.includes(to))
          .map(([rel, from, to]) => `[${rel},'${from}','${to}']`);
        return { success: true, bindings: { Edges: `[${rows.join(",")}]` } };
      }
      const id = goal.match(/kb_entity\('([^']+)'/)?.[1];
      const entity = id ? entities[id] : undefined;
      if (!entity) return { success: true, bindings: { Results: "[]" } };
      const props = Object.entries(entity)
        .filter(([key]) => key !== "type")
        .map(([key, value]) => `${key}="${value}"`)
        .join(",");
      return {
        success: true,
        bindings: { Results: `[['${id}',${entity.type},[${props}]]]` },
      };
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
  },
  "FACT-NOTE": {
    id: "FACT-NOTE",
    type: "fact",
    title: "Support saw zero-total carts fail",
    status: "active",
    fact_kind: "observation",
  },
};

const EDGES = [
  ["supersedes", "REQ-NEW", "REQ-OLD"],
  ["requires_rule", "REQ-NEW", "FACT-TOTAL"],
  ["specified_by", "REQ-NEW", "SCEN-FREE"],
  ["verified_by", "REQ-NEW", "TEST-FREE"],
  ["relates_to", "REQ-NEW", "ADR-PROMO"],
] as const;

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

  test("when ids alone exceed the ceiling, side lists go before the requirement's links", () => {
    const long = (prefix: string, index: number) =>
      `${prefix}-${index}-${"z".repeat(3_000)}`;
    const entity = (prefix: string, index: number) => ({
      id: long(prefix, index),
      title: "t",
    });
    const answer = fitSearchAnswer(
      {
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
          },
        ],
        rationale: [entity("ADR", 0)],
        notGoverning: [entity("REQ", 9)],
        observations: [entity("FACT-NOTE", 0)],
        truncated: false,
        note: "n",
      },
      maxBytes,
    );
    expect(size(answer)).toBeLessThanOrEqual(maxBytes);
    expect(answer.truncated).toBe(true);
    expect(answer.governing[0]?.id).toBe(long("REQ", 0));
    expect(answer.observations).toEqual([]);
    expect(answer.notGoverning).toEqual([]);
    expect(answer.rationale).toEqual([]);
    expect(answer.governing[0]?.facts.length).toBeGreaterThan(0);
  });

  test("an answer already under the ceiling is returned unchanged", async () => {
    const answer = await buildSearchAnswer(fakeKb(ENTITIES, EDGES), [
      match(ENTITIES["REQ-NEW"] as Row, 0.9),
    ]);
    expect(fitSearchAnswer(answer, maxBytes)).toBe(answer);
    expect(answer.truncated).toBe(false);
  });
});
