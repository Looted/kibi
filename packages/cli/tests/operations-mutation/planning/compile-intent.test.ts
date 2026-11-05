import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import * as contradictions from "../../../src/operations/mutation/contradictions.js";
import * as whatIf from "../../../src/operations/mutation/what-if.js";
import {
  COMPILE_PLAN_VERSION,
  compilePlanHash,
  executeCompileIntent,
  isBlockingWitness,
  parseWhatIfAnalysis,
  planWhatIfGoal,
} from "../../../src/operations/planning/compile-intent.js";
import { removeTempWorkspaces } from "../workspace.js";
import {
  GROUNDINGS,
  INVALID,
  SCENARIOS,
  compileScenario,
  groundScenario,
  scenarioContext,
} from "./compile-intent.corpus.js";

afterEach(removeTempWorkspaces);

const GOLDEN = JSON.parse(
  readFileSync(
    path.join(import.meta.dir, "compile-intent.golden.json"),
    "utf8",
  ),
) as Record<string, unknown>;

describe("compiled plans", () => {
  test("pin every scenario", () => {
    expect(Object.keys(GOLDEN)).toEqual([
      ...Object.keys(SCENARIOS),
      ...Object.keys(INVALID),
      ...Object.keys(GROUNDINGS),
    ]);
  });

  for (const [name, scenario] of Object.entries({ ...SCENARIOS, ...INVALID }))
    test(name, async () => {
      expect(await compileScenario(scenario)).toEqual(GOLDEN[name]);
    });

  for (const [name, scenario] of Object.entries(GROUNDINGS))
    test(name, async () => {
      expect(await groundScenario(scenario)).toEqual(GOLDEN[name]);
    });
});

describe("compile entry points", () => {
  test("hash source locations in path order", async () => {
    const result = (await compileScenario(
      SCENARIOS[
        "create a rule with an explicit id, title and documents"
      ] as never,
    )) as {
      outcome: {
        structuredContent: { expected: { sourceHashes: object } };
      };
    };
    expect(
      Object.keys(result.outcome.structuredContent.expected.sourceHashes),
    ).toEqual(["docs\\checkout.md", "src/cart.ts", "src/missing.ts"]);
  });

  test("need a Prolog runtime", async () => {
    const context = scenarioContext(
      SCENARIOS["create a strict property"] as never,
      {
        searches: [],
        loads: [],
        reviewLoads: [],
        advisorInputs: [],
        goals: [],
      },
    );
    await expect(
      executeCompileIntent({ intent: "x", mode: "update" }, {
        ...context,
        prolog: undefined,
      } as never),
    ).rejects.toThrow("Compile intent requires a Prolog runtime");
  });

  test("hash a plan without its own hash", () => {
    const body = { version: COMPILE_PLAN_VERSION, steps: [] };
    expect(COMPILE_PLAN_VERSION).toBe("kibi.compile-plan.v1");
    expect(compilePlanHash({ ...body, planHash: "old" })).toBe(
      compilePlanHash(body),
    );
    expect(compilePlanHash(body)).toMatch(/^[0-9a-f]{64}$/);
    expect(compilePlanHash(body)).not.toBe(compilePlanHash({ steps: [] }));
  });

  test("re-export the what-if readers", () => {
    expect(isBlockingWitness).toBe(whatIf.isBlockingWitness);
    expect(parseWhatIfAnalysis).toBe(whatIf.parseWhatIfAnalysis);
  });

  test("stage relationship-only steps without validating them", () => {
    const now = new Date("2026-09-05T00:00:00Z");
    const staged = spyOn(
      contradictions,
      "buildWhatIfAnalysisGoal",
    ).mockImplementation((entries) => JSON.stringify(entries));
    try {
      const goal = planWhatIfGoal(
        [
          {
            type: " req ",
            id: " REQ-a ",
            relationships: [
              { type: " specified_by ", from: " REQ-a ", to: " SCEN-a " },
              "not a record",
            ],
          },
          { type: "scenario", id: "SCEN-a", properties: [] },
          {
            type: "test",
            id: "TEST-a",
            properties: { title: "T", status: "active" },
            relationships: "none",
          },
        ],
        now,
      );
      const [, , validated] = JSON.parse(goal) as Record<string, unknown>[];
      expect(JSON.parse(goal)).toEqual([
        {
          entity: { id: "REQ-a", type: "req" },
          relationships: [
            { type: "specified_by", from: "REQ-a", to: "SCEN-a" },
          ],
          skipContradictionCheck: true,
          relationshipsOnly: true,
        },
        {
          entity: { id: "SCEN-a", type: "scenario" },
          relationships: [],
          skipContradictionCheck: true,
          relationshipsOnly: true,
        },
        {
          entity: (validated as { entity: unknown }).entity,
          relationships: [],
          skipContradictionCheck: true,
        },
      ]);
      expect(
        (validated as { entity: Record<string, unknown> }).entity,
      ).toMatchObject({
        id: "TEST-a",
        type: "test",
        title: "T",
        status: "active",
      });
    } finally {
      staged.mockRestore();
    }
  });
});
