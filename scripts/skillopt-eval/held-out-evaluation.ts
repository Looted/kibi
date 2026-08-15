import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { CANONICAL_SKILLS, buildBundleCatalog, buildSkillCatalog, type CanonicalSkill } from "./catalog";
import { assertCellInfrastructureHealthy } from "./evaluation-infrastructure";
import { parseHeldOutTaskManifest } from "./fixtures/contracts";
import {
  PREDICATE_HELD_OUT_CASE_IDS,
  PREDICATE_SEMANTIC_CLASSES,
} from "./fixtures/predicate-cases";
import type { HeldOutPhysicalCell } from "./held-out-eligibility";
import { HeldOutReceiptStore } from "./held-out-receipt-store";
import {
  evaluateHeldOutMatrix,
  heldOutEvaluationFromReceipt,
} from "./held-out-review";
import {
  type HeldOutEvaluation,
  type RealOptimizationDependencies,
  requireRuntime,
} from "./real-workflow-types";
import { runCodexCell } from "./runtime/codex-cell-runner";
import { resolveTaskFixture } from "./runtime/task-fixture";

export type { HeldOutPhysicalCell } from "./held-out-eligibility";
export {
  type HeldOutEligibilityReceipt,
  evaluateHeldOutMatrix,
} from "./held-out-review";

type TerminalTask = Readonly<{
  kind: HeldOutPhysicalCell["kind"];
  taskId: string;
  family: string;
  replicates: readonly (1 | 2 | 3 | undefined)[];
}>;

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function terminalTasks(skill: CanonicalSkill): readonly TerminalTask[] {
  const predicates = skill === "kibi-usage"
    ? PREDICATE_HELD_OUT_CASE_IDS.map((taskId) => ({
    kind: "predicate" as const,
    taskId,
    family: PREDICATE_SEMANTIC_CLASSES.get(taskId) ?? "predicate",
    replicates: [1, 2, 3] as const,
  }))
    : [];
  const skills = buildSkillCatalog(skill)
    .filter(
      (task) =>
        task.split === "held-out" && task.family !== "fact-predicate-modeling",
    )
    .map((task) => ({
      kind: "skill" as const,
      taskId: task.id,
      family: task.family,
      replicates: [undefined] as const,
    }));
  const bundles = buildBundleCatalog().map((task) => ({
    kind: "bundle" as const,
    taskId: task.id,
    family: task.family,
    replicates: [undefined] as const,
  }));
  return [...predicates, ...skills, ...bundles];
}

async function resolveTerminalTask(fixtureRunRoot: string, task: TerminalTask) {
  const taskPath = join(
    fixtureRunRoot,
    "held-out",
    "tasks",
    task.taskId,
    "task.json",
  );
  const text = await readFile(taskPath, "utf8");
  const manifest = parseHeldOutTaskManifest(text);
  const fixture = await resolveTaskFixture({
    fixtureRunRoot,
    taskId: task.taskId,
    publicClaim: {
      taskId: task.taskId,
      text: manifest.task.prompt,
      publicManifestHash: sha256(text),
      workspaceHash: manifest.workspaceHash,
    },
  });
  return { ...task, fixture };
}

function frozenCandidateHashes(
  variants: readonly [
    { readonly variant: string; readonly bodyHash: string },
    { readonly variant: string; readonly bodyHash: string },
    { readonly variant: string; readonly bodyHash: string },
  ],
) {
  const [baseline, oneShot, candidate] = variants;
  if (
    baseline.variant !== "baseline" ||
    oneShot.variant !== "one-shot" ||
    candidate.variant !== "skillopt"
  ) {
    throw new Error("terminal_variant_set_invalid");
  }
  return {
    baseline: baseline.bodyHash,
    oneShot: oneShot.bodyHash,
    skillopt: candidate.bodyHash,
  };
}

// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export const defaultEvaluateHeldOut: RealOptimizationDependencies["evaluateHeldOut"] =
  async (input): Promise<HeldOutEvaluation> => {
    const runtime = requireRuntime(input.runtime);
    const cellRunner = input.cellRunner ?? runCodexCell;
    const candidateHashes = frozenCandidateHashes(input.variants);
    const receiptStore = new HeldOutReceiptStore({
      artifactRoot: input.artifactRoot,
      roots: input.roots,
      candidateHashes,
      heldOutCaseIds: PREDICATE_HELD_OUT_CASE_IDS,
      runId: input.runId,
      fixtureClaimRoot: input.roots.corpus,
    });
    return receiptStore.withLease(async () => {
      const terminal = await receiptStore.loadTerminal();
      if (terminal !== undefined) {
        return heldOutEvaluationFromReceipt(terminal.receipt);
      }
      const reservation = await receiptStore.reserve();
      const tasks = await Promise.all(
        terminalTasks(input.skill).map((task) =>
          resolveTerminalTask(runtime.fixtureRunRoot, task),
        ),
      );
      const cells: HeldOutPhysicalCell[] = [];
      for (const task of tasks) {
        for (const variant of input.variants) {
          for (const replicate of task.replicates) {
            const request = {
              schemaVersion: "1.0.0" as const,
              artifactType: "episode-request" as const,
              episodeId: randomUUID(),
              runId: input.runId,
              runLockHash: variant.bodyHash,
              variant: variant.variant,
              skill: input.skill,
              taskId: task.taskId,
              attempt: 1 as const,
              ...(replicate === undefined ? {} : { replicate }),
              prompt: task.fixture.publicClaim.text,
              workspaceFixtureHash: task.fixture.workspaceHash,
            };
            const completed = await cellRunner({
              request,
              fixtureRoot: task.fixture.workspaceRoot,
              sourceWorktree: input.sourceWorktree,
              artifactRoot: input.artifactRoot,
              targetSkill: input.skill,
              candidate: { body: variant.body },
              codexExecutable: runtime.codexExecutable,
              bwrapExecutable: runtime.bwrapExecutable,
              env: input.env,
              finalStateRequests: [
                { tool: "kb_query", args: {} },
                { tool: "kb_check", args: {} },
                { tool: "kb_status", args: {} },
                { tool: "kb_coverage", args: { by: "req" } },
              ],
              evaluatorManifest: task.fixture.evaluatorManifest,
              hiddenMarkers: runtime.hiddenMarkers ?? [],
              pricingHash: runtime.pricingHash ?? "0".repeat(64),
              priceAmount: runtime.priceAmount ?? 0,
              timeoutMs: runtime.timeoutMs ?? 180_000,
            });
            assertCellInfrastructureHealthy(completed, {
              stage: "held-out",
              taskId: task.taskId,
              variant: variant.variant,
            });
            cells.push({
              kind: task.kind,
              taskId: task.taskId,
              family: task.family,
              request,
              receipt: completed.receipt,
              ...(task.kind === "predicate"
                ? {
                    predicateEvidence: completed.receipt.result.hardPass
                      ? { outcome: "pass" as const, caseId: task.taskId }
                      : {
                          outcome: "fail" as const,
                          caseId: task.taskId,
                          failure: "malformed-snapshot" as const,
                        },
                  }
                : {}),
            });
          }
        }
      }
      const review = evaluateHeldOutMatrix({
        reservation,
        physicalCells: cells,
      });
      const persisted = await receiptStore.persistTerminal(
        review.terminalReceipt,
      );
      return heldOutEvaluationFromReceipt(persisted.receipt);
    });
  };
