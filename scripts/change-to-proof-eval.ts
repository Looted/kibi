import { readFile } from "node:fs/promises";

// implements REQ-kibi-change-to-proof-evaluation
export type SearchGoldCase = Readonly<{
  id: string;
  query: string;
  expectedIds: readonly string[];
  sourceLocation?: Readonly<{ path: string; line?: number; symbol?: string }>;
  expectAbstention?: boolean;
}>;

// implements REQ-kibi-change-to-proof-evaluation
export type SearchEvaluation = Readonly<{
  caseCount: number;
  recallAt5: number;
  sourceRecallAt5: number;
  mrr: number;
  abstentionPrecision: number;
  abstentionCount: number;
}>;

// implements REQ-kibi-change-to-proof-evaluation
export type CompileGoldCase = Readonly<{
  id: string;
  intent: string;
  assertivePropositions: number;
  expectedStatus: "ready" | "needs_resolution" | "blocked";
}>;

// implements REQ-kibi-change-to-proof-evaluation
export type CompileEvaluation = Readonly<{
  caseCount: number;
  propositionAccounting: number;
  statusAccuracy: number;
}>;

// implements REQ-kibi-change-to-proof-evaluation
export type SearchCandidate = Readonly<{
  id: string;
  sourceMatches?: readonly unknown[];
}>;

// implements REQ-kibi-change-to-proof-evaluation
export type SearchEvaluator = (
  gold: SearchGoldCase,
) => Promise<
  Readonly<{ results: readonly SearchCandidate[]; abstained: boolean }>
>;

// implements REQ-kibi-change-to-proof-evaluation
export type CompileEvaluator = (gold: CompileGoldCase) => Promise<
  Readonly<{
    propositionCount: number;
    status: CompileGoldCase["expectedStatus"];
  }>
>;

// implements REQ-kibi-change-to-proof-evaluation
export async function readJsonl<T>(path: string): Promise<T[]> {
  const content = await readFile(path, "utf8");
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line) as T;
      } catch (error) {
        throw new Error(
          `Invalid JSONL at ${path}:${index + 1}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
}

// implements REQ-kibi-change-to-proof-evaluation
export async function evaluateSearch(
  cases: readonly SearchGoldCase[],
  evaluate: SearchEvaluator,
): Promise<SearchEvaluation> {
  if (cases.length === 0) {
    return {
      caseCount: 0,
      recallAt5: 0,
      sourceRecallAt5: 0,
      mrr: 0,
      abstentionPrecision: 0,
      abstentionCount: 0,
    };
  }
  let hits = 0;
  let sourceHits = 0;
  let reciprocalRank = 0;
  let abstentionCount = 0;
  let correctAbstentions = 0;
  for (const gold of cases) {
    const result = await evaluate(gold);
    const ids = result.results.slice(0, 5).map((candidate) => candidate.id);
    const expected = new Set(gold.expectedIds);
    const hitIndex = ids.findIndex((id) => expected.has(id));
    if (hitIndex >= 0) {
      hits += 1;
      reciprocalRank += 1 / (hitIndex + 1);
    }
    if (
      gold.sourceLocation &&
      result.results
        .slice(0, 5)
        .some((candidate) => (candidate.sourceMatches?.length ?? 0) > 0)
    ) {
      sourceHits += 1;
    }
    if (result.abstained) {
      abstentionCount += 1;
      if (gold.expectAbstention === true) correctAbstentions += 1;
    }
  }
  const expectedAbstentions = cases.filter(
    (gold) => gold.expectAbstention === true,
  ).length;
  return {
    caseCount: cases.length,
    recallAt5: hits / cases.length,
    sourceRecallAt5: cases.filter((gold) => gold.sourceLocation).length
      ? sourceHits / cases.filter((gold) => gold.sourceLocation).length
      : 0,
    mrr: reciprocalRank / cases.length,
    abstentionPrecision: abstentionCount
      ? correctAbstentions / abstentionCount
      : expectedAbstentions === 0
        ? 1
        : 0,
    abstentionCount,
  };
}

// implements REQ-kibi-change-to-proof-evaluation
export async function evaluateCompile(
  cases: readonly CompileGoldCase[],
  evaluate: CompileEvaluator,
): Promise<CompileEvaluation> {
  if (cases.length === 0) {
    return { caseCount: 0, propositionAccounting: 0, statusAccuracy: 0 };
  }
  let accounted = 0;
  let statusMatches = 0;
  for (const gold of cases) {
    const result = await evaluate(gold);
    if (result.propositionCount === gold.assertivePropositions) accounted += 1;
    if (result.status === gold.expectedStatus) statusMatches += 1;
  }
  return {
    caseCount: cases.length,
    propositionAccounting: accounted / cases.length,
    statusAccuracy: statusMatches / cases.length,
  };
}

export async function main(): Promise<void> {
  const searchPath = process.argv[2];
  const compilePath = process.argv[3];
  if (!searchPath || !compilePath) {
    throw new Error(
      "Usage: bun run scripts/change-to-proof-eval.ts <search-gold.jsonl> <compile-gold.jsonl>",
    );
  }
  const [search, compile] = await Promise.all([
    readJsonl<SearchGoldCase>(searchPath),
    readJsonl<CompileGoldCase>(compilePath),
  ]);
  process.stdout.write(
    `${JSON.stringify({ searchCases: search.length, compileCases: compile.length })}\n`,
  );
}

if (import.meta.main) void main();
