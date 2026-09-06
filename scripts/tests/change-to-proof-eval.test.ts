// implements REQ-kibi-change-to-proof-evaluation
import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  evaluateCompile,
  evaluateSearch,
  main,
  readJsonl,
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
              ? [{ id: "REQ-2", sourceMatches: [{ path: "src/upload.ts" }] }]
              : [],
        abstained: gold.id === "unknown",
      }),
    );
    expect(result).toMatchObject({
      caseCount: 3,
      recallAt5: 2 / 3,
      sourceRecallAt5: 1,
      mrr: 2 / 3,
      abstentionPrecision: 1,
      abstentionCount: 1,
    });
  });

  test("measures proposition accounting independently from status accuracy", async () => {
    const result = await evaluateCompile(
      [
        {
          id: "ready",
          intent: "must",
          assertivePropositions: 1,
          expectedStatus: "ready",
        },
        {
          id: "ambiguous",
          intent: "maybe",
          assertivePropositions: 2,
          expectedStatus: "needs_resolution",
        },
      ],
      async (gold) => ({
        propositionCount: gold.id === "ready" ? 1 : 1,
        status: gold.expectedStatus,
      }),
    );
    expect(result).toEqual({
      caseCount: 2,
      propositionAccounting: 0.5,
      statusAccuracy: 1,
    });
  });

  test("rejects malformed JSONL with a line location", async () => {
    await expect(readJsonl("/tmp/does-not-exist.jsonl")).rejects.toThrow();
    const bad = "/tmp/kibi-change-to-proof-bad.jsonl";
    await Bun.write(bad, "{ok:true}\n");
    await expect(readJsonl(bad)).rejects.toThrow(/Invalid JSONL/);
  });

  test("empty gold sets and unused abstention branches stay defined", async () => {
    expect(await evaluateSearch([], async () => ({ results: [], abstained: false }))).toEqual({
      caseCount: 0,
      recallAt5: 0,
      sourceRecallAt5: 0,
      mrr: 0,
      abstentionPrecision: 0,
      abstentionCount: 0,
    });
    expect(
      await evaluateSearch(
        [{ id: "none", query: "x", expectedIds: ["REQ-1"] }],
        async () => ({ results: [], abstained: true }),
      ),
    ).toMatchObject({
      abstentionPrecision: 0,
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
