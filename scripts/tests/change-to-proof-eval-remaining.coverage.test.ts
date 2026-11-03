// implements REQ-kibi-change-to-proof-evaluation
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import path from "node:path";
import { PrologProcess } from "../../packages/cli/src/prolog.js";
import {
  type ChangeToProofEvaluation,
  type CompileGoldCase,
  type SearchGoldCase,
  assertLiveHeldOutEvaluation,
  evaluateSearch,
  liveCompileEvaluator,
  main,
  runLiveHeldOutEvaluation,
} from "../change-to-proof-eval.js";

const restores: Array<() => void> = [];
afterEach(() => {
  while (restores.length > 0) restores.pop()?.();
});

const SEARCH: readonly SearchGoldCase[] = [
  { id: "positive", query: "q", expectedIds: ["REQ-1"] },
  {
    id: "source",
    query: "q",
    expectedIds: ["REQ-2"],
    sourceLocation: { path: "src/a.ts" },
  },
  {
    id: "source-negative",
    query: "q",
    expectedIds: [],
    sourceLocation: { path: "src/b.ts" },
  },
];
const COMPILE: readonly CompileGoldCase[] = [
  {
    id: "compile",
    intent: "x",
    assertivePropositions: 1,
    expectedPropositionKeys: ["CLAIM-1"],
    expectedStatus: "ready",
  } as CompileGoldCase,
];

function passing(): ChangeToProofEvaluation {
  return {
    search: {
      positiveCaseCount: 2,
      sourceCaseCount: 1,
      sourceNegativeCaseCount: 1,
      recallAt5: 1,
      sourceRecallAt5: 1,
      abstentionPrecision: 1,
      abstentionRecall: 1,
      sourceNegativeAbstentionRecall: 1,
    },
    compile: {
      propositionAccounting: 1,
      propositionIdentityAccuracy: 1,
      statusAccuracy: 1,
    },
  } as unknown as ChangeToProofEvaluation;
}

describe("held-out evaluation gate", () => {
  test("a complete evaluation passes", () => {
    expect(() =>
      assertLiveHeldOutEvaluation(passing(), SEARCH, COMPILE),
    ).not.toThrow();
  });

  test.each([
    [
      "search",
      "sourceCaseCount",
      0,
      "Held-out search case accounting does not match the gold corpus.",
    ],
    ["search", "recallAt5", 0.5, "Held-out search recall failed"],
    ["search", "sourceRecallAt5", 0, "Held-out source recall failed"],
    [
      "search",
      "abstentionPrecision",
      0.5,
      "Held-out abstention scoring failed: precision=0.5",
    ],
    [
      "compile",
      "propositionAccounting",
      0.5,
      "Held-out proposition accounting failed: got 0.5.",
    ],
    [
      "compile",
      "propositionIdentityAccuracy",
      0,
      "Held-out proposition identity accuracy failed: got 0.",
    ],
    [
      "compile",
      "statusAccuracy",
      0,
      "Held-out compile status accuracy failed: got 0.",
    ],
  ] as const)(
    "refuses %s.%s below its bound",
    (lane, field, value, message) => {
      const evaluation = passing() as unknown as Record<
        string,
        Record<string, number>
      >;
      const scores = evaluation[lane];
      if (scores === undefined) throw new Error(`unknown lane ${lane}`);
      scores[field] = value;
      expect(() =>
        assertLiveHeldOutEvaluation(
          evaluation as unknown as ChangeToProofEvaluation,
          SEARCH,
          COMPILE,
        ),
      ).toThrow(message);
    },
  );
});

describe("live compile and source matching", () => {
  test("a live compile case must name its requirement", async () => {
    await expect(
      liveCompileEvaluator(
        {} as never,
        { ...COMPILE[0], id: "nameless" } as never,
      ),
    ).rejects.toThrow("Live compile case nameless must declare requirementId.");
  });

  test("a source match needs a path and the expected symbol", async () => {
    const result = await evaluateSearch(
      [
        {
          id: "symbol",
          query: "q",
          expectedIds: ["REQ-1"],
          sourceLocation: { path: "./src/a.ts", symbol: "upload" },
        },
      ],
      async () => ({
        results: [
          {
            id: "REQ-1",
            sourceMatches: [
              { path: 7 as unknown as string, symbol: "upload" },
              { path: "src/a.ts", symbol: "download" },
            ],
          },
        ],
        abstained: false,
      }),
    );
    expect(result).toMatchObject({ recallAt5: 1, sourceRecallAt5: 0 });
  });
});

describe("live fixture seeding failures", () => {
  function stubProlog(
    answer: (goal: string) => { success: boolean; error?: string },
  ): { terminated: () => number } {
    let terminations = 0;
    const start = spyOn(PrologProcess.prototype, "start").mockImplementation(
      async () => undefined,
    );
    const query = spyOn(PrologProcess.prototype, "query").mockImplementation(
      (async (goal: string) => answer(goal)) as never,
    );
    const terminate = spyOn(
      PrologProcess.prototype,
      "terminate",
    ).mockImplementation(async () => {
      terminations += 1;
    });
    restores.push(
      () => start.mockRestore(),
      () => query.mockRestore(),
      () => terminate.mockRestore(),
    );
    return { terminated: () => terminations };
  }

  test("a store that cannot be attached stops the engine", async () => {
    const prolog = stubProlog((goal) =>
      goal.startsWith("kb_attach")
        ? { success: false, error: "store locked" }
        : { success: true },
    );
    await expect(runLiveHeldOutEvaluation([], [])).rejects.toThrow(
      "Held-out fixture attach failed: store locked",
    );
    expect(prolog.terminated()).toBe(1);
  });

  test("a seed goal without an error message is reported generically", async () => {
    stubProlog((goal) =>
      goal.startsWith("kb_assert_entity")
        ? { success: false }
        : { success: true },
    );
    await expect(runLiveHeldOutEvaluation([], [])).rejects.toThrow(
      /Held-out fixture seed failed for kb_assert_entity\(req, .*\): unknown Prolog error/,
    );
  });
});

describe("live main", () => {
  test("--live scores the public corpus and prints the evaluation", async () => {
    const corpusRoot = path.resolve(
      import.meta.dir,
      "../../documentation/evaluations/change-to-proof",
    );
    const previous = process.argv.slice();
    const chunks: string[] = [];
    const write = spyOn(process.stdout, "write").mockImplementation(((
      chunk: string,
    ) => {
      chunks.push(String(chunk));
      return true;
    }) as never);
    try {
      process.argv = [
        "bun",
        "change-to-proof-eval.ts",
        "--live",
        path.join(corpusRoot, "search-gold.jsonl"),
        path.join(corpusRoot, "compile-gold.jsonl"),
      ];
      await main();
    } finally {
      process.argv = previous;
      write.mockRestore();
    }
    expect(JSON.parse(chunks.join(""))).toMatchObject({
      search: { recallAt5: 1 },
      compile: { statusAccuracy: 1 },
    });
  }, 120_000);
});
