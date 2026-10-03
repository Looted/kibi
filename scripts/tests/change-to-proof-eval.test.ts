// implements REQ-kibi-change-to-proof-evaluation
import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  assertLiveHeldOutEvaluation,
  evaluateCompile,
  evaluateGoldCorpus,
  evaluateSearch,
  main,
  parseCliSearchOutput,
  percentile,
  readJsonl,
  repoSearchThresholdFailures,
  runLiveHeldOutEvaluation,
  runRepoSearchEvaluation,
  scoreRepoSearch,
} from "../change-to-proof-eval.js";
import type {
  CompileGoldCase,
  RepoSearchGoldCase,
  RepoSearchObservation,
  SearchGoldCase,
} from "../change-to-proof-eval.js";

function changeToProofEvaluationSuite(): string {
  return "change-to-proof evaluator";
}

describe(changeToProofEvaluationSuite(), () => {
  test("reports deterministic retrieval metrics and abstention precision", async () => {
    const result = await evaluateSearch(
      [
        { id: "direct", query: "download", expectedIds: ["REQ-1"] },
        {
          id: "source",
          query: "upload",
          expectedIds: ["REQ-2"],
          sourceLocation: { path: "src/upload.ts", line: 2 },
        },
        {
          id: "unknown",
          query: "unknown",
          expectedIds: [],
          expectAbstention: true,
        },
      ],
      async (gold) => ({
        results:
          gold.id === "direct"
            ? [{ id: "REQ-1" }]
            : gold.id === "source"
              ? [
                  {
                    id: "REQ-2",
                    sourceMatches: [{ path: "src/upload.ts", line: 2 }],
                  },
                ]
              : [],
        abstained: gold.id === "unknown",
      }),
    );
    expect(result).toMatchObject({
      caseCount: 3,
      positiveCaseCount: 2,
      recallAt5: 1,
      sourceCaseCount: 1,
      sourceRecallAt5: 1,
      sourceNegativeCaseCount: 0,
      sourceNegativeAbstentionRecall: 0,
      mrr: 1,
      abstentionPrecision: 1,
      abstentionRecall: 1,
      abstentionCount: 1,
    });
  });

  test("measures proposition accounting and semantic identity independently", async () => {
    const result = await evaluateCompile(
      [
        {
          id: "ready",
          intent: "must",
          assertivePropositions: 1,
          expectedPropositionKeys: ["CLAIM-READY"],
          expectedStatus: "ready",
        },
        {
          id: "ambiguous",
          intent: "maybe",
          assertivePropositions: 1,
          expectedPropositionKeys: ["CLAIM-AMBIGUOUS"],
          expectedStatus: "needs_resolution",
        },
      ],
      async (gold) => ({
        propositionCount: 1,
        propositionKeys:
          gold.id === "ready" ? ["CLAIM-WRONG"] : ["CLAIM-AMBIGUOUS"],
        status: gold.expectedStatus,
      }),
    );
    expect(result).toEqual({
      caseCount: 2,
      propositionAccounting: 1,
      propositionIdentityAccuracy: 0.5,
      statusAccuracy: 1,
    });
  });

  test("does not credit source recall to an unrelated candidate", async () => {
    const result = await evaluateSearch(
      [
        {
          id: "source",
          query: "upload",
          expectedIds: ["REQ-EXPECTED"],
          sourceLocation: {
            path: "src/upload.ts",
            symbol: "uploadReport",
          },
        },
      ],
      async () => ({
        results: [
          {
            id: "REQ-UNRELATED",
            sourceMatches: [{ path: "src/upload.ts", symbol: "uploadReport" }],
          },
        ],
        abstained: false,
      }),
    );
    expect(result).toMatchObject({
      recallAt5: 0,
      sourceRecallAt5: 0,
      mrr: 0,
    });
  });

  test("scores injected integration adapters across a held-out corpus", async () => {
    const result = await evaluateGoldCorpus(
      [
        {
          id: "held-search",
          query: "download",
          expectedIds: ["REQ-1"],
        },
      ],
      [
        {
          id: "held-compile",
          intent: "must retain",
          assertivePropositions: 1,
          expectedStatus: "ready",
        },
      ],
      {
        search: async () => ({
          results: [{ id: "REQ-1" }],
          abstained: false,
        }),
        compile: async () => ({ propositionCount: 1, status: "ready" }),
      },
    );
    expect(result).toEqual({
      search: {
        caseCount: 1,
        positiveCaseCount: 1,
        recallAt5: 1,
        sourceCaseCount: 0,
        sourceRecallAt5: 0,
        sourceNegativeCaseCount: 0,
        sourceNegativeAbstentionRecall: 0,
        mrr: 1,
        abstentionPrecision: 1,
        abstentionRecall: 1,
        abstentionCount: 0,
      },
      compile: {
        caseCount: 1,
        propositionAccounting: 1,
        propositionIdentityAccuracy: 0,
        statusAccuracy: 1,
      },
    });
  });

  test("runs the public held-out corpus through live APIs in isolation", async () => {
    const corpusRoot = path.resolve(
      import.meta.dir,
      "../../documentation/evaluations/change-to-proof",
    );
    const [searchCases, compileCases] = await Promise.all([
      readJsonl<SearchGoldCase>(path.join(corpusRoot, "search-gold.jsonl")),
      readJsonl<CompileGoldCase>(path.join(corpusRoot, "compile-gold.jsonl")),
    ]);
    const result = await runLiveHeldOutEvaluation(searchCases, compileCases);
    assertLiveHeldOutEvaluation(result, searchCases, compileCases);
    expect(result).toMatchObject({
      search: {
        caseCount: 4,
        positiveCaseCount: 2,
        recallAt5: 1,
        sourceCaseCount: 1,
        sourceRecallAt5: 1,
        sourceNegativeCaseCount: 1,
        sourceNegativeAbstentionRecall: 1,
        abstentionRecall: 1,
        abstentionPrecision: 1,
      },
      compile: {
        caseCount: 4,
        propositionAccounting: 1,
        propositionIdentityAccuracy: 1,
        statusAccuracy: 1,
      },
    });
  });

  test("rejects malformed JSONL with a line location", async () => {
    await expect(readJsonl("/tmp/does-not-exist.jsonl")).rejects.toThrow();
    const bad = "/tmp/kibi-change-to-proof-bad.jsonl";
    await Bun.write(bad, "{ok:true}\n");
    await expect(readJsonl(bad)).rejects.toThrow(/Invalid JSONL/);
  });

  test("empty gold sets and unused abstention branches stay defined", async () => {
    expect(
      await evaluateSearch([], async () => ({ results: [], abstained: false })),
    ).toEqual({
      caseCount: 0,
      positiveCaseCount: 0,
      recallAt5: 0,
      sourceCaseCount: 0,
      sourceRecallAt5: 0,
      sourceNegativeCaseCount: 0,
      sourceNegativeAbstentionRecall: 0,
      mrr: 0,
      abstentionPrecision: 0,
      abstentionRecall: 0,
      abstentionCount: 0,
    });
    expect(
      await evaluateSearch(
        [{ id: "none", query: "x", expectedIds: ["REQ-1"] }],
        async () => ({ results: [], abstained: true }),
      ),
    ).toMatchObject({
      abstentionPrecision: 0,
      abstentionRecall: 1,
      sourceRecallAt5: 0,
    });
    expect(
      await evaluateCompile([], async () => ({
        propositionCount: 0,
        status: "ready",
      })),
    ).toEqual({
      caseCount: 0,
      propositionAccounting: 0,
      propositionIdentityAccuracy: 0,
      statusAccuracy: 0,
    });
    expect(
      await evaluateSearch(
        [{ id: "ok", query: "q", expectedIds: ["REQ-1"] }],
        async () => ({ results: [{ id: "REQ-1" }], abstained: false }),
      ),
    ).toMatchObject({ abstentionPrecision: 1, abstentionCount: 0 });
  });

  test("main requires both gold files and prints case counts", async () => {
    const previous = process.argv.slice();
    const logs: string[] = [];
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string | Uint8Array) => {
      logs.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    try {
      process.argv = ["bun", "change-to-proof-eval.ts"];
      await expect(main()).rejects.toThrow(/Usage:/);
      const dir = mkdtempSync(path.join(os.tmpdir(), "kibi-ctp-"));
      writeFileSync(path.join(dir, "search.jsonl"), "");
      writeFileSync(path.join(dir, "compile.jsonl"), "");
      process.argv = [
        "bun",
        "change-to-proof-eval.ts",
        path.join(dir, "search.jsonl"),
        path.join(dir, "compile.jsonl"),
      ];
      await main();
      expect(logs.join("")).toContain('"searchCases":0');
      rmSync(dir, { recursive: true, force: true });
    } finally {
      process.argv = previous;
      process.stdout.write = originalWrite;
    }
  });
});

const REPO_GOLD: readonly RepoSearchGoldCase[] = [
  { id: "governing", query: "q1", expectedIds: ["REQ-A"] },
  {
    id: "result",
    query: "q2",
    expectedIds: ["REQ-B", "REQ-B2"],
    supersededIds: ["REQ-B-OLD"],
  },
  { id: "deep", query: "q3", expectedIds: ["REQ-C"] },
  { id: "abstain", query: "q4", expectedIds: [], expectAbstention: true },
];

function observed(
  governingIds: readonly string[],
  resultIds: readonly string[],
  latencyMs: number,
): RepoSearchObservation {
  return { governingIds, resultIds, latencyMs };
}

const scratch: string[] = [];
afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

const FAKE_KIBI = `import { appendFileSync, readFileSync } from "node:fs";
import path from "node:path";
const dir = path.dirname(process.argv[1]);
const args = process.argv.slice(2);
const log = (line) => appendFileSync(path.join(dir, "calls.log"), line + "\\n");
if (args[0] === "engine") {
  log(args.join(" "));
  process.exit(0);
}
const { query } = JSON.parse(readFileSync(0, "utf8"));
log("search " + query);
const answers = JSON.parse(readFileSync(path.join(dir, "answers.json"), "utf8"));
const answer = answers[query];
if (answer === undefined) {
  process.stdout.write(JSON.stringify({ status: "error", error: { message: "no answer" } }));
  process.exit(1);
}
process.stdout.write(JSON.stringify({
  kibiProtocol: 1,
  operation: "kb_search",
  status: "success",
  data: {
    results: answer.results.map((id) => ({ entity: { id } })),
    answer: { version: "kibi.search-answer.v1", governing: answer.governing.map((id) => ({ id })) },
  },
}));
`;

/**
 * A stand-in `kibi` binary: logs each invocation next to itself and answers
 * `search --input -` with the canned governing and result ids for the query.
 */
function fakeKibi(
  answers: Record<string, { governing: string[]; results: string[] }>,
): { cliPath: string; log: () => string[] } {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kibi-repo-eval-"));
  scratch.push(dir);
  writeFileSync(path.join(dir, "answers.json"), JSON.stringify(answers));
  const cliPath = path.join(dir, "kibi.mjs");
  writeFileSync(cliPath, FAKE_KIBI);
  return {
    cliPath,
    log: () =>
      readFileSync(path.join(dir, "calls.log"), "utf8").trim().split("\n"),
  };
}

describe("repository KB search evaluation", () => {
  test("scores recall@3, superseded results, abstention and warm latency", () => {
    const evaluation = scoreRepoSearch(
      REPO_GOLD,
      new Map([
        ["governing", observed(["REQ-X", "REQ-Y", "REQ-A"], [], 1000)],
        // Hit through the ranked results; the superseded id is shown.
        ["result", observed(["REQ-Z"], ["REQ-B-OLD", "REQ-B2"], 2000)],
        // Fourth place is not a hit.
        [
          "deep",
          observed(["REQ-1", "REQ-2", "REQ-3", "REQ-C"], ["REQ-1"], 3000),
        ],
        ["abstain", observed([], ["ADR-1"], 4000)],
      ]),
      5000,
    );
    expect(evaluation).toMatchObject({
      caseCount: 4,
      positiveCaseCount: 3,
      recallAt3: 2 / 3,
      supersededResultRate: 1 / 3,
      abstentionCount: 1,
      abstentionPrecision: 1,
      abstentionRecall: 1,
      latencyMs: { warmup: 5000, p50: 2000, p95: 4000, max: 4000 },
      supersededResults: [{ id: "result", ids: ["REQ-B-OLD"] }],
      falseAbstentions: [],
    });
    expect(evaluation.misses.map((miss) => miss.id)).toEqual(["deep"]);
  });

  test("an answer naming no governing requirement is an abstention, wanted or not", () => {
    const evaluation = scoreRepoSearch(
      REPO_GOLD,
      new Map([
        ["governing", observed([], ["REQ-A"], 1)],
        ["result", observed(["REQ-B"], [], 1)],
        ["deep", observed(["REQ-C"], [], 1)],
        ["abstain", observed(["REQ-Q"], [], 1)],
      ]),
      1,
    );
    // The result-list hit still counts toward recall.
    expect(evaluation.recallAt3).toBe(1);
    expect(evaluation.abstentionPrecision).toBe(0);
    expect(evaluation.abstentionRecall).toBe(0);
    expect(evaluation.falseAbstentions).toEqual(["governing"]);
    expect(() => scoreRepoSearch(REPO_GOLD, new Map(), 0)).toThrow(
      /No observation for gold case governing/,
    );
  });

  test("thresholds name every metric that misses its bound", () => {
    const evaluation = scoreRepoSearch(
      REPO_GOLD.slice(0, 1),
      new Map([["governing", observed(["REQ-A"], [], 3500)]]),
      0,
    );
    expect(
      repoSearchThresholdFailures(evaluation, {
        minRecallAt3: 0.9,
        maxSupersededResultRate: 0,
        minAbstentionPrecision: 1,
        maxP50Ms: 4000,
        maxP95Ms: 4000,
      }),
    ).toEqual([]);
    expect(
      repoSearchThresholdFailures(evaluation, {
        minRecallAt3: 1.1,
        maxP95Ms: 3000,
      }),
    ).toEqual([
      "recall@3 1.000 is below 1.1",
      "warm latency p95 (ms) 3500 is above 3000",
    ]);
    expect(percentile([], 95)).toBe(0);
    expect(percentile([5, 1, 3, 2, 4], 50)).toBe(3);
  });

  test("reads governing and result ids from the CLI envelope and fails closed on errors", () => {
    expect(
      parseCliSearchOutput(
        JSON.stringify({
          status: "success",
          data: {
            results: [{ entity: { id: "SCEN-1" } }],
            answer: { governing: [{ id: "REQ-1" }] },
          },
        }),
      ),
    ).toEqual({ governingIds: ["REQ-1"], resultIds: ["SCEN-1"] });
    expect(
      parseCliSearchOutput(JSON.stringify({ status: "success", data: {} })),
    ).toEqual({ governingIds: [], resultIds: [] });
    expect(() =>
      parseCliSearchOutput(JSON.stringify({ status: "error" })),
    ).toThrow(/did not succeed/);
  });

  test("restarts the engine, warms up off the gold set, then asks each question once", async () => {
    const kibi = fakeKibi({
      "what does kibi search answer?": { governing: [], results: [] },
      q1: { governing: ["REQ-A"], results: [] },
      q2: { governing: [], results: ["REQ-B"] },
      q3: { governing: ["REQ-C"], results: [] },
      q4: { governing: [], results: [] },
    });
    const evaluation = await runRepoSearchEvaluation(REPO_GOLD, {
      workspaceRoot: os.tmpdir(),
      cliPath: kibi.cliPath,
    });
    expect(kibi.log()).toEqual([
      "engine stop",
      "search what does kibi search answer?",
      "search q1",
      "search q2",
      "search q3",
      "search q4",
    ]);
    expect(evaluation.recallAt3).toBe(1);
    // q2 named no governing requirement although one was expected.
    expect(evaluation.abstentionPrecision).toBe(0.5);
    expect(evaluation.falseAbstentions).toEqual(["result"]);
    expect(evaluation.latencyMs.p95).toBeGreaterThan(0);
  });

  test("a question the CLI cannot answer fails the run", async () => {
    const kibi = fakeKibi({
      "what does kibi search answer?": { governing: [], results: [] },
    });
    await expect(
      runRepoSearchEvaluation(REPO_GOLD.slice(0, 1), {
        workspaceRoot: os.tmpdir(),
        cliPath: kibi.cliPath,
      }),
    ).rejects.toThrow(/kibi search --input - exited 1/);
  });

  test("main --repo-kb prints the evaluation and fails the gate on a missed threshold", async () => {
    const kibi = fakeKibi({
      "what does kibi search answer?": { governing: [], results: [] },
      q1: { governing: ["REQ-A"], results: [] },
    });
    const dir = path.dirname(kibi.cliPath);
    writeFileSync(
      path.join(dir, "gold.jsonl"),
      `${JSON.stringify(REPO_GOLD[0])}\n`,
    );
    writeFileSync(
      path.join(dir, "thresholds.json"),
      JSON.stringify({ minRecallAt3: 1, maxP50Ms: 0 }),
    );
    const previousArgv = process.argv.slice();
    const previousExitCode = process.exitCode;
    const out: string[] = [];
    const err: string[] = [];
    const originalOut = process.stdout.write.bind(process.stdout);
    const originalErr = process.stderr.write.bind(process.stderr);
    process.stdout.write = ((chunk: string | Uint8Array) => {
      out.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    process.stderr.write = ((chunk: string | Uint8Array) => {
      err.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;
    try {
      process.argv = [
        "bun",
        "change-to-proof-eval.ts",
        "--repo-kb",
        path.join(dir, "gold.jsonl"),
        "--thresholds",
        path.join(dir, "thresholds.json"),
        "--workspace",
        dir,
        "--cli",
        kibi.cliPath,
      ];
      await main();
      const printed = JSON.parse(out.join(""));
      expect(printed.evaluation.recallAt3).toBe(1);
      expect(printed.failures).toEqual([
        expect.stringMatching(/^warm latency p50 \(ms\) \d+ is above 0$/),
      ]);
      expect(err.join("")).toContain("kb_search gold-set gate failed");
      expect(process.exitCode).toBe(1);
      process.argv = ["bun", "change-to-proof-eval.ts", "--repo-kb"];
      await expect(main()).rejects.toThrow(/Usage:.*--repo-kb/);
    } finally {
      process.argv = previousArgv;
      process.exitCode = previousExitCode;
      process.stdout.write = originalOut;
      process.stderr.write = originalErr;
    }
  });
});
