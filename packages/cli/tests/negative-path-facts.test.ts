// executable_for TEST-kibi-negative-path-facts-marked
import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { renderDiscoveryTable } from "../src/commands/discovery-table.js";
import {
  type IntentSearchMatch,
  rankIntentEntities,
} from "../src/intent-search.js";
import {
  NEGATIVE_PATH_PREFIX,
  negativePathFactsGoal,
  negativePathTitle,
  queryNegativePathFacts,
} from "../src/negative-path-facts.js";
import type { PrologQueryResult } from "../src/public/operations/runtime-types.js";
import { buildSearchAnswer } from "../src/search-answer.js";

const workspaceRoot = mkdtempSync(path.join(tmpdir(), "kibi-negative-path-"));
afterAll(() => rmSync(workspaceRoot, { recursive: true, force: true }));

const REQ = {
  id: "REQ-plan-read-only",
  type: "req",
  title: "Migration plans are read only",
  status: "open",
};
/** The forbidden situation, worded as plainly as a true statement. */
const NEG = {
  id: "FACT-NEG-plan-writes",
  type: "fact",
  title: "Building a migration plan changes a tracked file",
  status: "active",
};
const OTHER = {
  id: "REQ-plan-format",
  type: "req",
  title: "A migration plan prints as JSON",
  status: "open",
};

function rowsBinding(rows: readonly [string, readonly string[]][]): string {
  return `[${rows.map(([id, guards]) => `['${id}',[${guards.map((guard) => `'${guard}'`).join(",")}]]`).join(",")}]`;
}

describe("negative-path facts are recognised by the engine's answer", () => {
  test("the goal names every id once, quoted", () => {
    expect(negativePathFactsGoal(["FACT-a", "FACT-o'b"])).toBe(
      "kb_negative_path_facts(['FACT-a','FACT-o''b'], Rows)",
    );
  });

  test("rows map each fact to the requirements it guards; nothing to ask asks nothing", async () => {
    const goals: string[] = [];
    const prolog = {
      async query(goal: string): Promise<PrologQueryResult> {
        goals.push(goal);
        return {
          success: true,
          bindings: {
            Rows: rowsBinding([
              [NEG.id, [REQ.id, OTHER.id]],
              ["FACT-NEG-unguarded", []],
            ]),
          },
        };
      },
    };
    const facts = await queryNegativePathFacts(prolog, [
      NEG.id,
      NEG.id,
      "",
      "FACT-NEG-unguarded",
    ]);
    expect([...facts]).toEqual([
      [NEG.id, [REQ.id, OTHER.id]],
      ["FACT-NEG-unguarded", []],
    ]);
    expect(goals).toEqual([
      `kb_negative_path_facts(['${NEG.id}','FACT-NEG-unguarded'], Rows)`,
    ]);
    expect((await queryNegativePathFacts(prolog, [""])).size).toBe(0);
    expect(goals).toHaveLength(1);
  });

  test("an engine that cannot answer leaves every fact unmarked", async () => {
    const failing = {
      async query(): Promise<PrologQueryResult> {
        return { success: false, bindings: {} };
      },
    };
    const throwing = {
      async query(): Promise<PrologQueryResult> {
        throw new Error("Unknown procedure: kb_negative_path_facts/2");
      },
    };
    expect((await queryNegativePathFacts(failing, [NEG.id])).size).toBe(0);
    expect((await queryNegativePathFacts(throwing, [NEG.id])).size).toBe(0);
  });

  test("the title prefix is added once", () => {
    expect(negativePathTitle(NEG.title)).toBe(
      "Forbidden: Building a migration plan changes a tracked file",
    );
    expect(negativePathTitle(negativePathTitle(NEG.title))).toBe(
      `${NEGATIVE_PATH_PREFIX}${NEG.title}`,
    );
  });
});

describe("search ranks a negative-path fact below what it guards", () => {
  const query = "building a migration plan changes a tracked file";

  test("unmarked, the forbidden situation leads the results", async () => {
    const result = await rankIntentEntities(
      [REQ, NEG],
      { query, minScore: 0 },
      workspaceRoot,
      [],
    );
    expect(result.matches[0]?.entity.id).toBe(NEG.id);
    expect(result.matches[0]?.negativePath).toBeUndefined();
  });

  test("marked, it follows its requirement and is no rival to it", async () => {
    const result = await rankIntentEntities(
      [REQ, NEG],
      { query, minScore: 0 },
      workspaceRoot,
      [],
      new Map(),
      new Map([[NEG.id, [REQ.id]]]),
    );
    const [first, second] = result.matches;
    expect(first?.entity.id).toBe(REQ.id);
    expect(second?.entity.id).toBe(NEG.id);
    expect(second?.negativePath).toEqual({
      polarity: "forbidden",
      guards: [REQ.id],
    });
    // Its own score is kept as evidence, though it ranks lower.
    expect(second?.score).toBeGreaterThan(first?.score ?? 1);
    expect(result.analysis.topScore).toBe(first?.score ?? null);
    expect(result.analysis.topRivalMargin).toBeNull();
    expect(result.analysis.ambiguous).toBe(false);
  });

  const QUICK = {
    id: "REQ-plan-quick",
    type: "req",
    title: "Building a migration plan is quick",
    status: "open",
  };
  const rankOrder = async (
    entities: readonly Record<string, unknown>[],
    guards: ReadonlyMap<string, readonly string[]>,
  ) =>
    (
      await rankIntentEntities(
        entities,
        { query, minScore: 0 },
        workspaceRoot,
        [],
        new Map(),
        guards,
      )
    ).matches.map((match) => match.entity.id);

  test("at its requirement's rank it follows it, whatever the input order", async () => {
    const guards = new Map([[NEG.id, [QUICK.id]]]);
    expect(await rankOrder([NEG, QUICK], guards)).toEqual([QUICK.id, NEG.id]);
    expect(await rankOrder([QUICK, NEG], guards)).toEqual([QUICK.id, NEG.id]);
  });

  test("two at the same rank keep the order of their own scores", async () => {
    // Both score above the requirement they guard; the closer one leads.
    const close = {
      id: "FACT-NEG-z-close",
      type: "fact",
      title: "A migration plan changes a tracked file",
      status: "active",
    };
    const loose = {
      id: "FACT-NEG-a-loose",
      type: "fact",
      title: "Building a migration plan changes a file",
      status: "active",
    };
    const guards = new Map([
      [close.id, [QUICK.id]],
      [loose.id, [QUICK.id]],
    ]);
    const expected = [QUICK.id, close.id, loose.id];
    expect(await rankOrder([loose, close, QUICK], guards)).toEqual(expected);
    expect(await rankOrder([close, loose, QUICK], guards)).toEqual(expected);
  });

  test("it ranks at the best match among its guards", async () => {
    // QUICK matches the query better than REQ and OTHER.
    const order = await rankOrder(
      [REQ, OTHER, NEG, QUICK],
      new Map([[NEG.id, [REQ.id, QUICK.id]]]),
    );
    expect(order.slice(0, 2)).toEqual([QUICK.id, NEG.id]);
    expect(order.slice(2).sort()).toEqual([OTHER.id, REQ.id]);
  });

  test("whose guard did not match keeps its place, marked", async () => {
    const result = await rankIntentEntities(
      [OTHER, NEG],
      { query, minScore: 0 },
      workspaceRoot,
      [],
      new Map(),
      new Map([[NEG.id, [REQ.id]]]),
    );
    expect(result.matches[0]?.entity.id).toBe(NEG.id);
    expect(result.matches[0]?.negativePath?.guards).toEqual([REQ.id]);
  });

  test("the CLI table titles it as forbidden", () => {
    const table = renderDiscoveryTable({
      count: 2,
      results: [
        { entity: REQ, score: 0.5, reasons: [] },
        {
          entity: NEG,
          score: 0.6,
          reasons: [],
          negativePath: { polarity: "forbidden", guards: [REQ.id] },
        },
      ],
    });
    expect(table).toContain("Forbidden:");
    expect(table?.match(/Forbidden:/g)).toHaveLength(1);
  });
});

describe("the answer layer marks an ungoverned negative-path fact", () => {
  test("its title and entry say it must not happen", async () => {
    const scenario = {
      id: "SCEN-NEG-plan-writes",
      type: "scenario",
      title: "A plan that writes is refused",
      status: "active",
    };
    const rows: Record<string, Record<string, unknown>> = {
      [NEG.id]: { ...NEG, fact_kind: "property_value" },
      [scenario.id]: scenario,
    };
    const prolog = {
      query: async (goal: string): Promise<PrologQueryResult> => {
        const bindings: Record<string, string> = {};
        if (goal.includes("kb_relationship_edges("))
          bindings.Edges = `[[assumes,'${scenario.id}','${NEG.id}']]`;
        const rowIds = /member\(Id, \[([^\]]*)\]\)/.exec(goal)?.[1];
        if (rowIds !== undefined) {
          const results = [...rowIds.matchAll(/'([^']+)'/g)].flatMap(
            ([, id]) => {
              const row = rows[id ?? ""];
              if (!row) return [];
              const props = Object.entries(row)
                .filter(([key]) => key !== "type")
                .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
                .join(",");
              return [`['${id}',${String(row.type)},[${props}]]`];
            },
          );
          bindings.Results = `[${results.join(",")}]`;
        }
        if (goal.includes("search_answer_verdicts_json"))
          bindings.JsonString = JSON.stringify(
            JSON.stringify({ requirements: [], scope: {} }),
          );
        return { success: true, bindings };
      },
    };
    const match: IntentSearchMatch = {
      entity: NEG,
      score: 0.6,
      reasons: ["intent token match"],
      negativePath: { polarity: "forbidden", guards: [] },
      evidence: {
        normalizedScore: 0.6,
        matchedFacets: [],
        sourceMatches: [],
        graphPaths: [],
        abstentionEligible: false,
      },
    };
    const answer = await buildSearchAnswer(prolog, [match]);
    expect(answer.ungoverned).toHaveLength(1);
    expect(answer.ungoverned[0]?.title).toBe(`Forbidden: ${NEG.title}`);
    expect(answer.ungoverned[0]?.negativePath).toEqual({
      polarity: "forbidden",
      guards: [],
    });
    const plain = await buildSearchAnswer(prolog, [
      { ...match, negativePath: undefined },
    ]);
    expect(plain.ungoverned[0]?.title).toBe(NEG.title);
    expect(plain.ungoverned[0]?.negativePath).toBeUndefined();
  });
});
