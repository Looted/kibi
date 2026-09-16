import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  type IntentSearchMatch,
  rankIntentEntities,
} from "../packages/cli/src/intent-search.js";
import { executeCompileIntent } from "../packages/cli/src/operations/planning/compile-intent.js";
import { PrologProcess } from "../packages/cli/src/prolog.js";
import { nodeFilesystem } from "../packages/cli/src/public/operations/node-ports.js";
import type {
  OperationContext,
  PrologPort,
} from "../packages/cli/src/public/operations/runtime-types.js";
import { ensureBranchStoreManifest } from "../packages/cli/src/utils/branch-store-locator.js";

// implements REQ-kibi-change-to-proof-evaluation
export type SearchGoldCase = Readonly<{
  id: string;
  query: string;
  expectedIds: readonly string[];
  sourceLocation?: Readonly<{
    path: string;
    line?: number;
    column?: number;
    symbol?: string;
  }>;
  expectAbstention?: boolean;
}>;

// implements REQ-kibi-change-to-proof-evaluation
export type SearchEvaluation = Readonly<{
  caseCount: number;
  positiveCaseCount: number;
  recallAt5: number;
  sourceCaseCount: number;
  sourceRecallAt5: number;
  sourceNegativeCaseCount: number;
  sourceNegativeAbstentionRecall: number;
  mrr: number;
  abstentionPrecision: number;
  abstentionRecall: number;
  abstentionCount: number;
}>;

// implements REQ-kibi-change-to-proof-evaluation
export type CompileGoldCase = Readonly<{
  id: string;
  intent: string;
  /** Existing fixture requirement used by live update evaluation. */
  requirementId?: string;
  assertivePropositions: number;
  expectedPropositionKeys?: readonly string[];
  expectedStatus: "ready" | "needs_resolution" | "blocked";
}>;

// implements REQ-kibi-change-to-proof-evaluation
export type CompileEvaluation = Readonly<{
  caseCount: number;
  propositionAccounting: number;
  propositionIdentityAccuracy: number;
  statusAccuracy: number;
}>;

// implements REQ-kibi-change-to-proof-evaluation
export type SearchCandidate = Readonly<{
  id: string;
  sourceMatches?: readonly SearchSourceMatch[];
}>;

// Search adapters may preserve the richer source coordinates returned by a
// live implementation. The path is the minimum evidence needed by this
// evaluator; a symbol or coordinate is required when the gold case asks for
// one.
export type SearchSourceMatch = Readonly<{
  path?: unknown;
  symbol?: unknown;
  symbolId?: unknown;
  line?: unknown;
  column?: unknown;
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
    propositionKeys?: readonly string[];
    status: CompileGoldCase["expectedStatus"];
  }>
>;

// implements REQ-kibi-change-to-proof-evaluation
export type ChangeToProofEvaluation = Readonly<{
  search: SearchEvaluation;
  compile: CompileEvaluation;
}>;

type FixtureEntity = Readonly<Record<string, unknown>>;

const LIVE_SEARCH_ENTITIES: readonly FixtureEntity[] = [
  {
    id: "REQ-kibi-intent-source-discovery",
    type: "req",
    title: "executeIntentSearch",
    semantic_text: "Find requirements for export download report",
    tags: ["download", "report", "export"],
    sourceFile: "packages/cli/src/intent-search.ts",
    sourceLine: 1,
    sourceEndLine: 200,
    sourceSymbol: "executeIntentSearch",
  },
  {
    id: "REQ-kibi-unrelated-fixture",
    type: "req",
    title: "Archive completed billing records",
    tags: ["retention", "billing"],
    sourceFile: "packages/core/src/archive.pl",
    sourceLine: 1,
    sourceEndLine: 30,
  },
];

function fixtureSourceMatches(
  match: IntentSearchMatch,
): readonly SearchSourceMatch[] {
  const entity = match.entity;
  return match.evidence.sourceMatches.map((source) => ({
    ...source,
    ...(entity.sourceSymbol !== undefined
      ? { symbol: entity.sourceSymbol }
      : {}),
    ...(entity.sourceLine !== undefined ? { line: entity.sourceLine } : {}),
  }));
}

// implements REQ-kibi-change-to-proof-evaluation
export async function liveSearchEvaluator(
  fixtureRoot: string,
  gold: SearchGoldCase,
): Promise<
  Readonly<{ results: readonly SearchCandidate[]; abstained: boolean }>
> {
  const result = await rankIntentEntities(
    LIVE_SEARCH_ENTITIES.map((entity) => ({ ...entity })),
    {
      query: gold.query,
      type: "req",
      minScore: 0.18,
      ...(gold.sourceLocation
        ? { sourceLocations: [gold.sourceLocation] }
        : {}),
    },
    fixtureRoot,
    [],
  );
  return {
    results: result.matches.slice(0, 5).map((match) => ({
      id: String(match.entity.id ?? ""),
      sourceMatches: fixtureSourceMatches(match),
    })),
    abstained: result.analysis.abstained,
  };
}

type LiveFixture = Readonly<{
  root: string;
  storePath: string;
  process: PrologProcess;
  port: PrologPort;
}>;

function prologAtom(value: string): string {
  return `'${value.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;
}

function prologString(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function fixtureEntityGoal(
  type: "req" | "fact",
  properties: readonly string[],
): string {
  return `kb_assert_entity(${type}, [${properties.join(", ")}])`;
}

// implements REQ-kibi-change-to-proof-evaluation
async function assertFixtureGoals(
  process: PrologProcess,
  goals: readonly string[],
): Promise<void> {
  for (const goal of goals) {
    const result = await process.query(goal);
    if (!result.success) {
      throw new Error(
        `Held-out fixture seed failed for ${goal}: ${result.error ?? "unknown Prolog error"}`,
      );
    }
  }
}

// implements REQ-kibi-change-to-proof-evaluation
async function createLiveFixture(root: string): Promise<LiveFixture> {
  const branch = "held-out";
  const storePath = ensureBranchStoreManifest(root, branch);
  const process = new PrologProcess({ oneShot: false, timeout: 30_000 });
  await process.start();
  try {
    const attached = await process.query(`kb_attach(${prologAtom(storePath)})`);
    if (!attached.success) {
      throw new Error(
        `Held-out fixture attach failed: ${attached.error ?? "unknown Prolog error"}`,
      );
    }
    const common = [
      "status=open",
      `created_at=${prologString("2026-09-14T00:00:00Z")}`,
      `updated_at=${prologString("2026-09-14T00:00:00Z")}`,
      `source=${prologString("fixture://change-to-proof")}`,
    ];
    const requirement = (id: string, title: string) =>
      fixtureEntityGoal("req", [
        `id=${prologAtom(id)}`,
        `title=${prologString(title)}`,
        ...common,
      ]);
    const fact = (id: string, title: string, properties: readonly string[]) =>
      fixtureEntityGoal("fact", [
        `id=${prologAtom(id)}`,
        `title=${prologString(title)}`,
        "status=active",
        `created_at=${prologString("2026-09-14T00:00:00Z")}`,
        `updated_at=${prologString("2026-09-14T00:00:00Z")}`,
        `source=${prologString("fixture://change-to-proof")}`,
        ...properties,
      ]);
    await assertFixtureGoals(process, [
      requirement("REQ-HO-PROPERTY", "Retain customer data for seven years"),
      requirement("REQ-HO-AMBIGUOUS", "Retain customer data for a while"),
      requirement("REQ-HO-CONTRADICTION", "Retain customer data for one day"),
      requirement("REQ-HO-NEGATION", "Do not retain expired data"),
      requirement("REQ-HO-OPPOSING", "Retain customer data for one year"),
      fact("FACT-HO-DATA", "Customer data subject", [
        "fact_kind=subject",
        `subject_key=${prologString("customer_data")}`,
      ]),
      fact("FACT-HO-ONE-DAY", "Retention is one day", [
        "fact_kind=property_value",
        `subject_key=${prologString("customer_data")}`,
        `property_key=${prologString("retention_days")}`,
        "operator=eq",
        "value_type=int",
        "value_int=1",
      ]),
      fact("FACT-HO-ONE-YEAR", "Retention is one year", [
        "fact_kind=property_value",
        `subject_key=${prologString("customer_data")}`,
        `property_key=${prologString("retention_days")}`,
        "operator=eq",
        "value_type=int",
        "value_int=365",
      ]),
    ]);
    await assertFixtureGoals(process, [
      `kb_assert_relationship(constrains, ${prologAtom("REQ-HO-CONTRADICTION")}, ${prologAtom("FACT-HO-DATA")}, [])`,
      `kb_assert_relationship(constrains, ${prologAtom("REQ-HO-OPPOSING")}, ${prologAtom("FACT-HO-DATA")}, [])`,
      `kb_assert_relationship(requires_property, ${prologAtom("REQ-HO-CONTRADICTION")}, ${prologAtom("FACT-HO-ONE-DAY")}, [])`,
      `kb_assert_relationship(requires_property, ${prologAtom("REQ-HO-OPPOSING")}, ${prologAtom("FACT-HO-ONE-YEAR")}, [])`,
    ]);
    const port: PrologPort = {
      query: process.query.bind(process),
      nextSolution: async () => null,
      save: () => process.query("kb_save"),
      storageStatus: () => process.query("kb_storage_status(Status)"),
    };
    return { root, storePath, process, port };
  } catch (error) {
    await process.terminate();
    throw error;
  }
}

// implements REQ-kibi-change-to-proof-evaluation
export async function liveCompileEvaluator(
  fixture: LiveFixture,
  gold: CompileGoldCase,
): Promise<
  Readonly<{
    propositionCount: number;
    propositionKeys: readonly string[];
    status: CompileGoldCase["expectedStatus"];
  }>
> {
  if (!gold.requirementId) {
    throw new Error(`Live compile case ${gold.id} must declare requirementId.`);
  }
  const context: OperationContext = {
    workspaceRoot: fixture.root,
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-14T00:00:00Z"),
    prolog: fixture.port,
    fs: nodeFilesystem,
    git: {
      revParse: async () => "held-out",
      showToplevel: async () => fixture.root,
      workspaceSnapshot: async () => ({
        version: "kibi.workspace-snapshot.v2",
        hash: "f".repeat(64),
        dirty: false,
        fileCount: 1,
      }),
    },
    branchAttachment: {
      gitBranch: "held-out",
      kbBranch: "held-out",
      storePath: fixture.storePath,
      kind: "exact",
      migrationRequired: false,
    },
  };
  const result = await executeCompileIntent(
    {
      intent: gold.intent,
      mode: "update",
      requirementId: gold.requirementId,
    },
    context,
  );
  return {
    propositionCount: result.structuredContent.propositions.length,
    propositionKeys: result.structuredContent.propositions.map(
      (proposition) => proposition.claimKey,
    ),
    status: result.structuredContent.status,
  };
}

// implements REQ-kibi-change-to-proof-evaluation
export async function runLiveHeldOutEvaluation(
  searchCases: readonly SearchGoldCase[],
  compileCases: readonly CompileGoldCase[],
): Promise<ChangeToProofEvaluation> {
  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "kibi-proof-eval-"));
  let fixture: LiveFixture | undefined;
  try {
    await mkdir(path.join(fixtureRoot, "packages", "cli", "src"), {
      recursive: true,
    });
    await writeFile(
      path.join(fixtureRoot, "packages", "cli", "src", "intent-search.ts"),
      "export function executeIntentSearch() { return []; }\n",
    );
    fixture = await createLiveFixture(fixtureRoot);
    return await evaluateGoldCorpus(searchCases, compileCases, {
      search: (gold) => liveSearchEvaluator(fixtureRoot, gold),
      compile: (gold) => liveCompileEvaluator(fixture as LiveFixture, gold),
    });
  } finally {
    if (fixture) {
      await fixture.process.query("kb_detach").catch(() => undefined);
      await fixture.process.terminate();
    }
    await rm(fixtureRoot, { recursive: true, force: true });
  }
}

// implements REQ-kibi-change-to-proof-evaluation
export function assertLiveHeldOutEvaluation(
  evaluation: ChangeToProofEvaluation,
  searchCases: readonly SearchGoldCase[],
  compileCases: readonly CompileGoldCase[],
): void {
  const positiveSearchCases = searchCases.filter(
    (gold) => gold.expectedIds.length > 0,
  );
  const sourceSearchCases = searchCases.filter(
    (gold) => gold.sourceLocation !== undefined && gold.expectedIds.length > 0,
  );
  const sourceNegativeCases = searchCases.filter(
    (gold) =>
      gold.sourceLocation !== undefined && gold.expectedIds.length === 0,
  );
  if (
    evaluation.search.positiveCaseCount !== positiveSearchCases.length ||
    evaluation.search.sourceCaseCount !== sourceSearchCases.length ||
    evaluation.search.sourceNegativeCaseCount !== sourceNegativeCases.length
  ) {
    throw new Error(
      "Held-out search case accounting does not match the gold corpus.",
    );
  }
  if (evaluation.search.recallAt5 < 1) {
    throw new Error(
      `Held-out search recall failed: expected every labeled positive to be retrieved, got ${evaluation.search.recallAt5}.`,
    );
  }
  if (evaluation.search.sourceRecallAt5 < 1) {
    throw new Error(
      `Held-out source recall failed: expected every labeled source location to be covered, got ${evaluation.search.sourceRecallAt5}.`,
    );
  }
  if (
    evaluation.search.abstentionPrecision < 1 ||
    evaluation.search.abstentionRecall < 1 ||
    evaluation.search.sourceNegativeAbstentionRecall < 1
  ) {
    throw new Error(
      `Held-out abstention scoring failed: precision=${evaluation.search.abstentionPrecision}, recall=${evaluation.search.abstentionRecall}, sourceNegativeRecall=${evaluation.search.sourceNegativeAbstentionRecall}.`,
    );
  }
  if (evaluation.compile.propositionAccounting < 1) {
    throw new Error(
      `Held-out proposition accounting failed: got ${evaluation.compile.propositionAccounting}.`,
    );
  }
  if (
    compileCases.some((gold) => gold.expectedPropositionKeys !== undefined) &&
    evaluation.compile.propositionIdentityAccuracy < 1
  ) {
    throw new Error(
      `Held-out proposition identity accuracy failed: got ${evaluation.compile.propositionIdentityAccuracy}.`,
    );
  }
  if (compileCases.length > 0 && evaluation.compile.statusAccuracy < 1) {
    throw new Error(
      `Held-out compile status accuracy failed: got ${evaluation.compile.statusAccuracy}.`,
    );
  }
}

function normalizedPath(value: unknown): string {
  return typeof value === "string"
    ? value.trim().replaceAll("\\", "/").replace(/^\.\//, "")
    : "";
}

function normalizedText(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

// implements REQ-kibi-change-to-proof-evaluation
function sourceMatchCovers(
  match: SearchSourceMatch,
  location: NonNullable<SearchGoldCase["sourceLocation"]>,
): boolean {
  if (normalizedPath(match.path) !== normalizedPath(location.path))
    return false;
  if (
    location.symbol !== undefined &&
    ![match.symbol, match.symbolId].some(
      (candidate) =>
        normalizedText(candidate) === normalizedText(location.symbol),
    )
  ) {
    return false;
  }
  if (location.line !== undefined && match.line !== location.line) return false;
  if (location.column !== undefined && match.column !== location.column)
    return false;
  return true;
}

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
    };
  }
  let hits = 0;
  let sourceHits = 0;
  let reciprocalRank = 0;
  let abstentionCount = 0;
  let correctAbstentions = 0;
  let sourceNegativeAbstentions = 0;
  const positiveCases = cases.filter((gold) => gold.expectedIds.length > 0);
  const sourceCases = cases.filter(
    (gold) => gold.sourceLocation !== undefined && gold.expectedIds.length > 0,
  );
  const sourceNegativeCases = cases.filter(
    (gold) =>
      gold.sourceLocation !== undefined && gold.expectedIds.length === 0,
  );
  for (const gold of cases) {
    const result = await evaluate(gold);
    const ids = result.results.slice(0, 5).map((candidate) => candidate.id);
    const expected = new Set(gold.expectedIds);
    const hitIndex = ids.findIndex((id) => expected.has(id));
    if (hitIndex >= 0) {
      hits += 1;
      reciprocalRank += 1 / (hitIndex + 1);
    }
    const sourceLocation = gold.sourceLocation;
    if (
      sourceLocation &&
      result.results
        .slice(0, 5)
        .some(
          (candidate) =>
            expected.has(candidate.id) &&
            (candidate.sourceMatches ?? []).some((match) =>
              sourceMatchCovers(match, sourceLocation),
            ),
        )
    ) {
      sourceHits += 1;
    }
    if (result.abstained) {
      abstentionCount += 1;
      if (gold.expectAbstention === true) correctAbstentions += 1;
    }
    if (
      gold.sourceLocation !== undefined &&
      gold.expectedIds.length === 0 &&
      result.abstained
    ) {
      sourceNegativeAbstentions += 1;
    }
  }
  const expectedAbstentions = cases.filter(
    (gold) => gold.expectAbstention === true,
  ).length;
  return {
    caseCount: cases.length,
    positiveCaseCount: positiveCases.length,
    recallAt5: positiveCases.length ? hits / positiveCases.length : 0,
    sourceCaseCount: sourceCases.length,
    sourceRecallAt5: sourceCases.length ? sourceHits / sourceCases.length : 0,
    sourceNegativeCaseCount: sourceNegativeCases.length,
    sourceNegativeAbstentionRecall: sourceNegativeCases.length
      ? sourceNegativeAbstentions / sourceNegativeCases.length
      : 0,
    mrr: positiveCases.length ? reciprocalRank / positiveCases.length : 0,
    abstentionPrecision: abstentionCount
      ? correctAbstentions / abstentionCount
      : expectedAbstentions === 0
        ? 1
        : 0,
    abstentionRecall: expectedAbstentions
      ? correctAbstentions / expectedAbstentions
      : 1,
    abstentionCount,
  };
}

// implements REQ-kibi-change-to-proof-evaluation
// Run both scoring lanes against the same gold snapshot. Callers supply the
// live search/compiler adapters, so this helper cannot accidentally turn a
// corpus inventory into a passing evaluation without executing behavior.
export async function evaluateGoldCorpus(
  searchCases: readonly SearchGoldCase[],
  compileCases: readonly CompileGoldCase[],
  evaluators: Readonly<{
    search: SearchEvaluator;
    compile: CompileEvaluator;
  }>,
): Promise<ChangeToProofEvaluation> {
  const [search, compile] = await Promise.all([
    evaluateSearch(searchCases, evaluators.search),
    evaluateCompile(compileCases, evaluators.compile),
  ]);
  return { search, compile };
}

// implements REQ-kibi-change-to-proof-evaluation
export async function evaluateCompile(
  cases: readonly CompileGoldCase[],
  evaluate: CompileEvaluator,
): Promise<CompileEvaluation> {
  if (cases.length === 0) {
    return {
      caseCount: 0,
      propositionAccounting: 0,
      propositionIdentityAccuracy: 0,
      statusAccuracy: 0,
    };
  }
  let accounted = 0;
  let identityCases = 0;
  let identityMatches = 0;
  let statusMatches = 0;
  for (const gold of cases) {
    const result = await evaluate(gold);
    if (result.propositionCount === gold.assertivePropositions) accounted += 1;
    if (gold.expectedPropositionKeys !== undefined) {
      identityCases += 1;
      if (
        JSON.stringify(result.propositionKeys ?? []) ===
        JSON.stringify(gold.expectedPropositionKeys)
      ) {
        identityMatches += 1;
      }
    }
    if (result.status === gold.expectedStatus) statusMatches += 1;
  }
  return {
    caseCount: cases.length,
    propositionAccounting: accounted / cases.length,
    propositionIdentityAccuracy: identityCases
      ? identityMatches / identityCases
      : 0,
    statusAccuracy: statusMatches / cases.length,
  };
}

export async function main(): Promise<void> {
  const live = process.argv[2] === "--live";
  const argumentOffset = live ? 1 : 0;
  const searchPath = process.argv[2 + argumentOffset];
  const compilePath = process.argv[3 + argumentOffset];
  if (!searchPath || !compilePath) {
    throw new Error(
      "Usage: bun run scripts/change-to-proof-eval.ts [--live] <search-gold.jsonl> <compile-gold.jsonl>",
    );
  }
  const [search, compile] = await Promise.all([
    readJsonl<SearchGoldCase>(searchPath),
    readJsonl<CompileGoldCase>(compilePath),
  ]);
  if (live) {
    const output = await runLiveHeldOutEvaluation(search, compile);
    assertLiveHeldOutEvaluation(output, search, compile);
    process.stdout.write(`${JSON.stringify(output)}\n`);
    return;
  }
  process.stdout.write(
    `${JSON.stringify({ searchCases: search.length, compileCases: compile.length })}\n`,
  );
}

if (import.meta.main) void main();
