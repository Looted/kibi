import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  CANONICAL_SKILLS,
  type CanonicalSkill,
  buildBundleCatalog,
} from "./catalog";
import { sha256Text } from "./cursor/types";
import { parseHeldOutTaskManifest } from "./fixtures/contracts";
import type { CodexCellOptions } from "./runtime/codex-cell-types";
import { SKILLOPT_EVALUATION_BRANCH } from "./runtime/permissions";
import { ProcessControlError } from "./runtime/process";
import { resolveTaskFixture } from "./runtime/task-fixture";

export const BUNDLE_EVALUATION_BRANCH = SKILLOPT_EVALUATION_BRANCH;
const DEFAULT_BUNDLE_CELL_TIMEOUT_MS = 600_000;

export type BundleArm = "baseline" | "skillopt";

export type BundleCandidatesResolver = (
  skill: CanonicalSkill,
) => Promise<string | undefined>;

/**
 * Resolves the skillopt-arm body for a skill from a prior optimization's
 * frozen output when one exists; otherwise the arm falls back to canonical.
 */

// implements REQ-skillopt-codex-optimization
export function resolveBundleCandidatesDir(
  candidatesDir: string,
): BundleCandidatesResolver {
  return async (skill) => {
    try {
      const body = await readFile(
        join(candidatesDir, skill, "trainer-output", "best_skill.md"),
        "utf8",
      );
      return body.trim().length > 0 ? body : undefined;
    } catch {
      return undefined;
    }
  };
}

export type BundleCellSummary = Readonly<{
  arm: BundleArm;
  taskId: string;
  outcome: "pass" | "fail" | "ambiguous";
  score: number;
  hard: 0 | 1;
  criticalFailures: readonly string[];
}>;

export type BundleArmSummary = Readonly<{
  arm: BundleArm;
  cells: number;
  hardPasses: number;
  meanScore: number;
  securityFailures: number;
}>;

// implements REQ-skillopt-codex-optimization
export function summarizeBundleArm(
  arm: BundleArm,
  cells: readonly BundleCellSummary[],
): BundleArmSummary {
  const scoped = cells.filter((cell) => cell.arm === arm);
  const hardPasses = scoped.filter((cell) => cell.hard === 1).length;
  const meanScore =
    scoped.length === 0
      ? 0
      : scoped.reduce((total, cell) => total + cell.score, 0) / scoped.length;
  const securityFailures = scoped.filter((cell) =>
    cell.criticalFailures.some(
      (failure) =>
        failure.startsWith("isolation-") || failure.startsWith("sentinel-"),
    ),
  ).length;
  return { arm, cells: scoped.length, hardPasses, meanScore, securityFailures };
}

const MEAN_FLOOR = 70;
const HARD_RATE_FLOOR = 0.5;

// implements REQ-skillopt-codex-optimization
export function evaluateBundleVerdict(arms: {
  baseline: BundleArmSummary;
  skillopt: BundleArmSummary;
}): {
  verdict: "compatible" | "incompatible" | "no-candidate-delta";
  reasons: readonly string[];
} {
  const identical =
    arms.skillopt.meanScore === arms.baseline.meanScore &&
    arms.skillopt.hardPasses === arms.baseline.hardPasses &&
    arms.skillopt.cells === arms.baseline.cells;
  if (identical) {
    // With no candidate bodies the two arms are byte-identical assemblies;
    // report that explicitly instead of dressing it up as compatibility.
    return {
      verdict: "no-candidate-delta",
      reasons: ["bundle:candidate-bodies-match-canonical"],
    };
  }
  const reasons: string[] = [];
  if (arms.skillopt.securityFailures > 0)
    reasons.push("bundle:security-failures");
  if (arms.skillopt.meanScore < MEAN_FLOOR)
    reasons.push("bundle:mean-below-floor");
  if (
    arms.skillopt.cells === 0 ||
    arms.skillopt.hardPasses / arms.skillopt.cells < HARD_RATE_FLOOR
  )
    reasons.push("bundle:hard-pass-rate-below-floor");
  return {
    verdict: reasons.length === 0 ? "compatible" : "incompatible",
    reasons,
  };
}

export type PaidBundleGateOptions = Readonly<{
  runId: string;
  artifactRoot: string;
  sourceWorktree: string;
  fixtureRunRoot: string;
  env?: NodeJS.ProcessEnv;
  codexExecutable: string;
  bwrapExecutable: string;
  hiddenMarkers?: readonly string[];
  pricingHash?: string;
  priceAmount?: number;
  resolveCandidates?: BundleCandidatesResolver;
  timeoutMs?: number;
}>;

export type BundleCellRunner = (options: CodexCellOptions) => Promise<{
  receipt: {
    result: {
      status:
        | "completed"
        | "behavioral-failure"
        | "infrastructure-failure"
        | "interrupted"
        | "budget-exhausted"
        | "evidence-conflict";
      score: number;
      hardPass: boolean;
      criticalFailures: readonly string[];
    };
  };
}>;

export type PaidBundleGateResult = Readonly<{
  exitCode: 0 | 1;
  verdict: ReturnType<typeof evaluateBundleVerdict>["verdict"];
  reportPath: string;
}>;

// implements REQ-skillopt-codex-optimization
export async function runPaidBundleGate(
  options: PaidBundleGateOptions,
  dependencies: { runCodexCell: BundleCellRunner },
): Promise<PaidBundleGateResult> {
  await mkdir(options.artifactRoot, { recursive: true, mode: 0o700 });
  const resolveCandidates =
    options.resolveCandidates ?? (async () => undefined);
  const candidateBodies = new Map<CanonicalSkill, string>();
  for (const skill of CANONICAL_SKILLS) {
    const body = await resolveCandidates(skill);
    if (body !== undefined) candidateBodies.set(skill, body);
  }

  const tasks = buildBundleCatalog();
  const cells: BundleCellSummary[] = [];

  for (const task of tasks) {
    const text = await readFile(
      join(options.fixtureRunRoot, "held-out", "tasks", task.id, "task.json"),
      "utf8",
    );
    const parsed = parseHeldOutTaskManifest(text);
    const fixture = await resolveTaskFixture({
      fixtureRunRoot: options.fixtureRunRoot,
      taskId: task.id,
      publicClaim: {
        taskId: task.id,
        text: parsed.task.prompt,
        publicManifestHash: createHash("sha256").update(text).digest("hex"),
        workspaceHash: parsed.workspaceHash,
      },
    });

    for (const arm of ["baseline", "skillopt"] as const) {
      const bundleCandidates: Partial<
        Record<CanonicalSkill, { body: string }>
      > = {};
      if (arm === "skillopt") {
        for (const [skill, body] of candidateBodies) {
          bundleCandidates[skill] = { body };
        }
      }
      let summary: BundleCellSummary = {
        arm,
        taskId: task.id,
        outcome: "ambiguous",
        score: 0,
        hard: 0,
        criticalFailures: [],
      };
      try {
        const completed = await dependencies.runCodexCell({
          request: {
            schemaVersion: "1.0.0",
            artifactType: "episode-request",
            episodeId: randomUUID(),
            runId: options.runId,
            runLockHash: sha256Text(
              `${Object.values(bundleCandidates)
                .map((entry) => entry.body)
                .join("\u0000")}#${arm}`,
            ),
            variant: arm,
            skill: "bundle",
            taskId: task.id,
            attempt: 1,
            prompt: parsed.task.prompt,
            workspaceFixtureHash: fixture.workspaceHash,
          },
          fixtureRoot: fixture.workspaceRoot,
          sourceWorktree: options.sourceWorktree,
          artifactRoot: options.artifactRoot,
          targetSkill: CANONICAL_SKILLS[0],
          ...(Object.keys(bundleCandidates).length > 0
            ? { bundleCandidates }
            : {}),
          codexExecutable: options.codexExecutable,
          bwrapExecutable: options.bwrapExecutable,
          env: {
            ...(options.env ?? process.env),
            KIBI_BRANCH: BUNDLE_EVALUATION_BRANCH,
          },
          finalStateRequests: [
            { tool: "kb_query", args: {} },
            { tool: "kb_check", args: {} },
            { tool: "kb_status", args: {} },
            { tool: "kb_coverage", args: { by: "req" } },
          ],
          evaluatorManifest: fixture.evaluatorManifest,
          hiddenMarkers: options.hiddenMarkers ?? [],
          pricingHash: options.pricingHash ?? "0".repeat(64),
          priceAmount: options.priceAmount ?? 0,
          timeoutMs: options.timeoutMs ?? DEFAULT_BUNDLE_CELL_TIMEOUT_MS,
        });
        summary = {
          arm,
          taskId: task.id,
          outcome:
            completed.receipt.result.status === "completed"
              ? completed.receipt.result.hardPass
                ? "pass"
                : "fail"
              : "ambiguous",
          score: completed.receipt.result.score,
          hard: completed.receipt.result.hardPass ? 1 : 0,
          criticalFailures: completed.receipt.result.criticalFailures,
        };
      } catch (error) {
        if (error instanceof ProcessControlError) {
          summary = {
            ...summary,
            criticalFailures: [`cell-${error.kind}`],
          };
        } else {
          throw error;
        }
      }
      cells.push(summary);
    }
  }

  const baselineSummary = summarizeBundleArm("baseline", cells);
  const skilloptSummary = summarizeBundleArm("skillopt", cells);
  const { verdict, reasons } = evaluateBundleVerdict({
    baseline: baselineSummary,
    skillopt: skilloptSummary,
  });
  const report = {
    schemaVersion: "1.0.0",
    artifactType: "skillopt-bundle-verdict",
    runId: options.runId,
    arms: { baseline: baselineSummary, skillopt: skilloptSummary },
    cells,
    verdict,
    reasons,
    productionAdoption: "external-verdict-required" as const,
  };
  const reportPath = resolve(options.artifactRoot, "bundle-verdict.json");
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  return { exitCode: verdict === "incompatible" ? 1 : 0, verdict, reportPath };
}
