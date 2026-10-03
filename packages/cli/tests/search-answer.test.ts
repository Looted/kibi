import { describe, expect, test } from "bun:test";
import type { IntentSearchMatch } from "../src/intent-search.js";
import type { PrologQueryResult } from "../src/public/operations/runtime-types.js";
import { buildSearchAnswer } from "../src/search-answer.js";

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
    expect(current?.tests.map((entry) => entry.id)).toEqual(["TEST-FREE"]);
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
