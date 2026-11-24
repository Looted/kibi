import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

export type ConceptualGoldCase = Readonly<{
  id: string;
  stratum: "A" | "B" | "C" | "D";
  query: string;
  expectedAdrIds?: readonly string[];
  expectedReqIds?: readonly string[];
  forbiddenReqIds?: readonly string[];
  mapKeywords?: readonly string[];
  followUpQuery?: string;
  expectAbstention?: boolean;
}>;

export type SearchRunObservation = Readonly<{
  abstained: boolean;
  topScore: number | null;
  resultIds: readonly string[];
  governingIds: readonly string[];
  rationaleIds: readonly string[];
  notGoverningIds: readonly string[];
  hintIds: readonly string[];
  latencyMs: number;
}>;

export type ConceptualCaseEvaluation = Readonly<{
  id: string;
  stratum: ConceptualGoldCase["stratum"];
  singleShot: SearchRunObservation;
  adrHit: boolean | null;
  reqHit: boolean | null;
  wrongLiftIds: readonly string[];
  abstainedAsExpected: boolean | null;
  mapSurfaced: boolean | null;
  twoCallReqHit: boolean | null;
  twoCallAdrHit: boolean | null;
}>;

export type ConceptualEvaluationSummary = Readonly<{
  goldPath: string;
  singleShotOnly: boolean;
  caseCount: number;
  adrCaseCount: number;
  adrRecallAt6: number;
  reqCaseCount: number;
  reqRecallAt5: number;
  wrongLiftCaseCount: number;
  wrongLiftCases: readonly { id: string; ids: readonly string[] }[];
  abstentionCount: number;
  abstentionPrecision: number;
  abstentionRecall: number;
  mapCheckedCount: number;
  mapSurfacedRate: number;
  twoCallReqRecallAt5: number;
  twoCallAdrRecallAt6: number;
  mapBytes: number | null;
  latencyMs: { p50: number; p95: number; max: number };
  cases: readonly ConceptualCaseEvaluation[];
}>;

function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length, Math.max(1, rank)) - 1] as number;
}

function runCli(
  cliPath: string,
  workspaceRoot: string,
  args: readonly string[],
  input?: string,
): { stdout: string; latencyMs: number } {
  const start = performance.now();
  const result = spawnSync("node", [cliPath, ...args], {
    cwd: workspaceRoot,
    encoding: "utf8",
    input,
    maxBuffer: 64 * 1024 * 1024,
    timeout: 300_000,
  });
  const latencyMs = performance.now() - start;
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `kibi ${args.join(" ")} exited ${result.status}: ${(result.stderr || result.stdout).slice(0, 600).trim()}`,
    );
  }
  return { stdout: result.stdout, latencyMs };
}

function parseSearchEnvelope(
  stdout: string,
  latencyMs: number,
): SearchRunObservation {
  const envelope = JSON.parse(stdout) as {
    status?: unknown;
    data?: {
      results?: { entity?: { id?: unknown } }[];
      queryAnalysis?: {
        abstained?: unknown;
        topScore?: unknown;
        hints?: { items?: { id?: unknown }[] };
      };
      answer?: {
        governing?: { id?: unknown }[];
        rationale?: { id?: unknown }[];
        notGoverning?: { id?: unknown }[];
      };
    };
  };
  if (envelope.status !== "success" || !envelope.data) {
    throw new Error(`kibi search failed: ${stdout.slice(0, 400).trim()}`);
  }
  const governingIds = (envelope.data.answer?.governing ?? []).map((row) =>
    String(row.id ?? ""),
  );
  const rationaleIds = (envelope.data.answer?.rationale ?? []).map((row) =>
    String(row.id ?? ""),
  );
  const notGoverningIds = (envelope.data.answer?.notGoverning ?? []).map(
    (row) => String(row.id ?? ""),
  );
  const resultIds = (envelope.data.results ?? []).map((row) =>
    String(row.entity?.id ?? ""),
  );
  const hintIds = (envelope.data.queryAnalysis?.hints?.items ?? []).map(
    (row) => String(row.id ?? ""),
  );
  return {
    abstained:
      envelope.data.queryAnalysis?.abstained === true || resultIds.length === 0,
    topScore:
      typeof envelope.data.queryAnalysis?.topScore === "number"
        ? envelope.data.queryAnalysis.topScore
        : null,
    resultIds,
    governingIds,
    rationaleIds,
    notGoverningIds,
    hintIds,
    latencyMs,
  };
}

async function readJsonl<T>(filePath: string): Promise<T[]> {
  const raw = await readFile(filePath, "utf8");
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .map((line) => JSON.parse(line) as T);
}

function optionValue(
  args: readonly string[],
  name: string,
): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

export async function runConceptualEvaluation(options: {
  goldPath: string;
  workspaceRoot: string;
  cliPath: string;
  singleShotOnly?: boolean;
}): Promise<ConceptualEvaluationSummary> {
  const cases = await readJsonl<ConceptualGoldCase>(options.goldPath);
  const search = (query: string): SearchRunObservation => {
    const { stdout, latencyMs } = runCli(
      options.cliPath,
      options.workspaceRoot,
      ["search", "--input", "-"],
      `${JSON.stringify({ query })}\n`,
    );
    return parseSearchEnvelope(stdout, latencyMs);
  };

  runCli(options.cliPath, options.workspaceRoot, ["engine", "stop"]);
  // Warm the engine on an off-gold query first.
  search("what does kibi status report?");

  let mapPayloadText: string | null = null;
  let mapBytes: number | null = null;
  if (!options.singleShotOnly) {
    const mapRun = runCli(
      options.cliPath,
      options.workspaceRoot,
      ["map", "--input", "-"],
      "{}\n",
    );
    const parsed = JSON.parse(mapRun.stdout) as {
      status?: unknown;
      data?: unknown;
    };
    if (parsed.status !== "success" || !parsed.data) {
      throw new Error(
        `kibi map failed: ${mapRun.stdout.slice(0, 400).trim()}`,
      );
    }
    mapPayloadText = JSON.stringify(parsed.data).toLowerCase();
    mapBytes = Buffer.byteLength(JSON.stringify(parsed.data));
  }

  const caseResults: ConceptualCaseEvaluation[] = [];
  for (const gold of cases) {
    const singleShot = search(gold.query);
    const expectedAdrs = gold.expectedAdrIds ?? [];
    const expectedReqs = gold.expectedReqIds ?? [];
    const adrPool = new Set([
      ...singleShot.rationaleIds.slice(0, 6),
      ...singleShot.resultIds.slice(0, 6),
    ]);
    const reqPool = new Set(singleShot.governingIds.slice(0, 5));
    const adrHit =
      expectedAdrs.length > 0
        ? expectedAdrs.some((id) => adrPool.has(id))
        : null;
    const reqHit =
      expectedReqs.length > 0
        ? expectedReqs.some((id) => reqPool.has(id))
        : null;
    const wrongLiftIds = (gold.forbiddenReqIds ?? []).filter((id) =>
      singleShot.governingIds.includes(id),
    );
    const abstained =
      singleShot.abstained ||
      (singleShot.governingIds.length === 0 &&
        singleShot.rationaleIds.length === 0);
    const abstainedAsExpected =
      gold.expectAbstention === true ? abstained : null;

    let mapSurfaced: boolean | null = null;
    let twoCallReqHit: boolean | null = null;
    let twoCallAdrHit: boolean | null = null;
    if (!options.singleShotOnly && mapPayloadText !== null) {
      const keywords = [
        ...(gold.mapKeywords ?? []),
        ...(gold.expectedAdrIds ?? []),
      ].filter(Boolean);
      if (keywords.length > 0) {
        mapSurfaced = keywords.some((kw) =>
          mapPayloadText?.includes(kw.toLowerCase()),
        );
      }
      if (gold.followUpQuery) {
        const followUp = search(gold.followUpQuery);
        const fAdrs = new Set([
          ...followUp.rationaleIds.slice(0, 6),
          ...followUp.resultIds.slice(0, 6),
        ]);
        const fReqs = new Set([
          ...followUp.governingIds.slice(0, 5),
          ...followUp.resultIds.slice(0, 5),
        ]);
        if (expectedAdrs.length > 0) {
          twoCallAdrHit = expectedAdrs.some((id) => fAdrs.has(id));
        }
        if (expectedReqs.length > 0) {
          twoCallReqHit = expectedReqs.some((id) => fReqs.has(id));
        }
      }
    }

    caseResults.push({
      id: gold.id,
      stratum: gold.stratum,
      singleShot,
      adrHit,
      reqHit,
      wrongLiftIds,
      abstainedAsExpected,
      mapSurfaced,
      twoCallReqHit,
      twoCallAdrHit,
    });
  }

  const adrCases = caseResults.filter((c) => c.adrHit !== null);
  const reqCases = caseResults.filter((c) => c.reqHit !== null);
  const wrongLiftCases = caseResults
    .filter((c) => c.wrongLiftIds.length > 0)
    .map((c) => ({ id: c.id, ids: c.wrongLiftIds }));
  const expectedAbstains = cases.filter((c) => c.expectAbstention === true);
  const actualAbstains = caseResults.filter(
    (c) =>
      c.singleShot.abstained ||
      (c.singleShot.governingIds.length === 0 &&
        c.singleShot.rationaleIds.length === 0),
  );
  const correctAbstains = caseResults.filter(
    (c) => c.abstainedAsExpected === true,
  );
  const mapCases = caseResults.filter((c) => c.mapSurfaced !== null);
  const twoCallReqCases = caseResults.filter((c) => c.twoCallReqHit !== null);
  const twoCallAdrCases = caseResults.filter((c) => c.twoCallAdrHit !== null);
  const latencies = caseResults.map((c) => c.singleShot.latencyMs);

  return {
    goldPath: options.goldPath,
    singleShotOnly: options.singleShotOnly === true,
    caseCount: cases.length,
    adrCaseCount: adrCases.length,
    adrRecallAt6: adrCases.length
      ? adrCases.filter((c) => c.adrHit).length / adrCases.length
      : 1,
    reqCaseCount: reqCases.length,
    reqRecallAt5: reqCases.length
      ? reqCases.filter((c) => c.reqHit).length / reqCases.length
      : 1,
    wrongLiftCaseCount: wrongLiftCases.length,
    wrongLiftCases,
    abstentionCount: actualAbstains.length,
    abstentionPrecision: actualAbstains.length
      ? correctAbstains.length / actualAbstains.length
      : expectedAbstains.length === 0
        ? 1
        : 0,
    abstentionRecall: expectedAbstains.length
      ? correctAbstains.length / expectedAbstains.length
      : 1,
    mapCheckedCount: mapCases.length,
    mapSurfacedRate: mapCases.length
      ? mapCases.filter((c) => c.mapSurfaced).length / mapCases.length
      : 0,
    twoCallReqRecallAt5: twoCallReqCases.length
      ? twoCallReqCases.filter((c) => c.twoCallReqHit).length /
        twoCallReqCases.length
      : 0,
    twoCallAdrRecallAt6: twoCallAdrCases.length
      ? twoCallAdrCases.filter((c) => c.twoCallAdrHit).length /
        twoCallAdrCases.length
      : 0,
    mapBytes,
    latencyMs: {
      p50: Math.round(percentile(latencies, 50)),
      p95: Math.round(percentile(latencies, 95)),
      max: Math.round(Math.max(0, ...latencies)),
    },
    cases: caseResults,
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const goldPath = path.resolve(
    optionValue(args, "--gold") ??
      path.join(
        import.meta.dir,
        "..",
        "documentation",
        "evaluations",
        "change-to-proof",
        "repo-search-conceptual-gold.v1.jsonl",
      ),
  );
  const workspaceRoot = path.resolve(
    optionValue(args, "--workspace") ?? process.cwd(),
  );
  const cliPath = path.resolve(
    optionValue(args, "--cli") ??
      path.join(import.meta.dir, "..", "packages", "cli", "bin", "kibi"),
  );
  const singleShotOnly = args.includes("--single-shot-only");
  const summary = await runConceptualEvaluation({
    goldPath,
    workspaceRoot,
    cliPath,
    singleShotOnly,
  });
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

if (import.meta.main) void main();
