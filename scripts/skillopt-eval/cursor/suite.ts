import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  type CanonicalSkill,
  buildHeldOutCatalog,
  buildSkillCatalog,
} from "../catalog";
import {
  parseHeldOutTaskManifest,
  parsePublicTaskManifest,
} from "../fixtures/contracts";
import { resolveTaskFixture } from "../runtime/task-fixture";
import { runCursorCell } from "./runner";
import type {
  CursorCellReceipt,
  CursorCompatibilityReport,
  CursorQualificationReceipt,
  CursorVariant,
  CursorVariantSummary,
} from "./types";

const CURSOR_COMPAT_MEAN_FLOOR = 70;
const CURSOR_COMPAT_HARD_RATE_FLOOR = 0.5;

export const DEFAULT_CURSOR_CELL_TIMEOUT_MS = 240_000;

export type CursorCandidate = Readonly<{
  variant: CursorVariant;
  body: string;
}>;

export type CursorGateInput = Readonly<{
  runId: string;
  skill: CanonicalSkill;
  phase: "development" | "held-out";
  fixtureRunRoot: string;
  sourceWorktree: string;
  artifactRoot: string;
  cursorExecutable: string;
  hostVersion: string;
  candidates: readonly CursorCandidate[];
  qualification: CursorQualificationReceipt;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}>;

// implements REQ-skillopt-cursor-compat
export function summarizeCursorCells(
  cells: readonly CursorCellReceipt[],
): readonly CursorVariantSummary[] {
  const variants: CursorVariant[] = ["baseline", "one-shot", "skillopt"];
  return variants.flatMap((variant) => {
    const scoped = cells.filter((cell) => cell.variant === variant);
    if (scoped.length === 0) return [];
    const hardPasses = scoped.filter((cell) => cell.result.hard === 1).length;
    const meanScore =
      scoped.reduce((total, cell) => total + cell.result.score, 0) /
      scoped.length;
    const securityFailures = scoped.filter((cell) =>
      cell.result.criticalFailures.some(
        (failure) =>
          failure.startsWith("isolation-") || failure.startsWith("sentinel-"),
      ),
    ).length;
    return [
      {
        variant,
        cells: scoped.length,
        hardPasses,
        meanScore,
        securityFailures,
      },
    ];
  });
}

// implements REQ-skillopt-cursor-compat
export function evaluateCursorVerdict(input: {
  phase: "development" | "held-out";
  qualification: CursorQualificationReceipt;
  summaries: readonly CursorVariantSummary[];
}): { verdict: CursorCompatibilityReport["verdict"]; reasons: string[] } {
  if (input.qualification.verdict !== "pass") {
    return {
      verdict: "not-qualified",
      reasons: [...input.qualification.reasons],
    };
  }
  if (input.phase === "held-out") {
    return { verdict: "informational", reasons: [] };
  }
  const candidate = input.summaries.find(
    (summary) => summary.variant === "skillopt",
  );
  if (candidate === undefined || candidate.cells === 0) {
    return { verdict: "incompatible", reasons: ["cursor:no-candidate-cells"] };
  }
  const reasons: string[] = [];
  if (candidate.securityFailures > 0) reasons.push("cursor:security-failures");
  if (candidate.meanScore < CURSOR_COMPAT_MEAN_FLOOR)
    reasons.push("cursor:mean-below-floor");
  if (candidate.hardPasses / candidate.cells < CURSOR_COMPAT_HARD_RATE_FLOOR)
    reasons.push("cursor:hard-pass-rate-below-floor");
  return {
    verdict: reasons.length === 0 ? "compatible" : "incompatible",
    reasons,
  };
}

type TaskManifestMeta = Readonly<{
  text: string;
  prompt: string;
  workspaceHash: string;
}>;

async function readFileOrNull(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

async function loadTaskManifest(
  fixtureRunRoot: string,
  taskId: string,
): Promise<TaskManifestMeta> {
  const locations = [
    join(fixtureRunRoot, "public", "train", "tasks", taskId, "task.json"),
    join(fixtureRunRoot, "public", "development", "tasks", taskId, "task.json"),
    join(fixtureRunRoot, "held-out", "tasks", taskId, "task.json"),
  ];
  for (const location of locations) {
    const text = await readFileOrNull(location);
    if (text === null) continue;
    const publicParsed = (() => {
      try {
        return parsePublicTaskManifest(text);
      } catch {
        return parseHeldOutTaskManifest(text);
      }
    })();
    return {
      text,
      prompt: publicParsed.task.prompt,
      workspaceHash: publicParsed.workspaceHash,
    };
  }
  throw new Error(`cursor_task_fixture_missing:${taskId}`);
}

function terminalTaskIds(
  skill: CanonicalSkill,
  phase: "development" | "held-out",
): readonly string[] {
  if (phase === "development") {
    return buildSkillCatalog(skill)
      .filter((task) => task.split === "development")
      .map((task) => task.id);
  }
  return buildHeldOutCatalog()
    .filter((task) => task.skill === skill && task.split === "held-out")
    .map((task) => task.id);
}

function variantsForPhase(
  candidates: readonly CursorCandidate[],
  phase: "development" | "held-out",
): readonly CursorCandidate[] {
  if (phase === "development") return candidates;
  return candidates.filter((candidate) => candidate.variant === "skillopt");
}

// implements REQ-skillopt-cursor-compat
export async function runCursorCompatibilityGate(
  input: CursorGateInput,
): Promise<CursorCompatibilityReport> {
  await mkdir(input.artifactRoot, { recursive: true, mode: 0o700 });
  const timeoutMs = input.timeoutMs ?? DEFAULT_CURSOR_CELL_TIMEOUT_MS;
  const cells: CursorCellReceipt[] = [];
  const activeCandidates = variantsForPhase(input.candidates, input.phase);
  if (activeCandidates.length > 0 && input.qualification.verdict === "pass") {
    for (const taskId of terminalTaskIds(input.skill, input.phase)) {
      const manifest = await loadTaskManifest(input.fixtureRunRoot, taskId);
      const fixture = await resolveTaskFixture({
        fixtureRunRoot: input.fixtureRunRoot,
        taskId,
        publicClaim: {
          taskId,
          text: manifest.prompt,
          publicManifestHash: createHash("sha256")
            .update(manifest.text, "utf8")
            .digest("hex"),
          workspaceHash: manifest.workspaceHash,
        },
      });
      for (const candidate of activeCandidates) {
        const completed = await runCursorCell({
          request: {
            schemaVersion: "1.0.0",
            artifactType: "episode-request",
            episodeId: randomUUID(),
            runId: input.runId,
            runLockHash: createHash("sha256")
              .update(candidate.body, "utf8")
              .digest("hex"),
            variant: candidate.variant,
            skill: input.skill,
            taskId,
            attempt: 1,
            prompt: manifest.prompt,
            workspaceFixtureHash: fixture.workspaceHash,
          },
          fixtureRoot: fixture.workspaceRoot,
          sourceWorktree: input.sourceWorktree,
          artifactRoot: input.artifactRoot,
          targetSkill: input.skill,
          candidate: { body: candidate.body },
          cursorExecutable: input.cursorExecutable,
          hostVersion: input.hostVersion,
          env: input.env,
          finalStateRequests: [
            { tool: "kb_query", args: {} },
            { tool: "kb_check", args: {} },
            { tool: "kb_status", args: {} },
            { tool: "kb_coverage", args: { by: "req" } },
          ],
          evaluatorManifest: fixture.evaluatorManifest,
          timeoutMs,
        });
        cells.push(completed.receipt);
      }
    }
  }
  const report = buildReport(input, cells);
  return report;
}

function buildReport(
  input: CursorGateInput,
  cells: readonly CursorCellReceipt[],
): CursorCompatibilityReport {
  const summaries = summarizeCursorCells(cells);
  const { verdict, reasons } = evaluateCursorVerdict({
    phase: input.phase,
    qualification: input.qualification,
    summaries,
  });
  return {
    schemaVersion: "1.1.0",
    artifactType: "skillopt-cursor-compat",
    runId: input.runId,
    skill: input.skill,
    phase: input.phase,
    cursorVersion: input.hostVersion,
    qualificationVerdict: input.qualification.verdict,
    variants: summaries,
    cells: cells.map((cell) => ({
      taskId: cell.taskId,
      variant: cell.variant,
      outcome: cell.result.outcome,
      score: cell.result.score,
      criticalFailures: [...cell.result.criticalFailures],
    })),
    verdict,
    reasons,
    productionAdoption: "external-verdict-required",
  };
}

export async function persistCursorCompatibilityReport(
  artifactRoot: string,
  report: CursorCompatibilityReport,
): Promise<string> {
  await mkdir(artifactRoot, { recursive: true, mode: 0o700 });
  const target = resolve(artifactRoot, "cursor-compat.json");
  await writeFile(target, `${JSON.stringify(report, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  return target;
}
