import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PREDICATE_HELD_OUT_CASE_IDS } from "./fixtures/predicate-cases";
import { parsePrivateEvaluatorManifest } from "./fixtures/private";
import {
  type HeldOutEvaluation,
  type RealOptimizationDependencies,
  requireRuntime,
} from "./real-workflow-types";
import { runCodexCell } from "./runtime/codex-cell-runner";

// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export const defaultEvaluateHeldOut: RealOptimizationDependencies["evaluateHeldOut"] =
  async (input): Promise<HeldOutEvaluation> => {
    const runtime = requireRuntime(input.runtime);
    const manifest = parsePrivateEvaluatorManifest(
      await readFile(runtime.evaluatorManifestPath, "utf8"),
    );
    let allHardPass = true;
    for (let repetition = 1; repetition <= 3; repetition += 1)
      for (const variant of input.variants)
        for (const taskId of PREDICATE_HELD_OUT_CASE_IDS) {
          const completed = await runCodexCell({
            request: {
              schemaVersion: "1.0.0",
              artifactType: "episode-request",
              episodeId: randomUUID(),
              runId: input.runId,
              runLockHash: variant.bodyHash,
              variant: variant.variant,
              skill: input.skill,
              taskId,
              attempt: repetition,
              prompt: variant.body,
              workspaceFixtureHash: manifest.workspaceHash,
            },
            fixtureRoot: runtime.fixtureRoot,
            sourceWorktree: input.sourceWorktree,
            artifactRoot: input.artifactRoot,
            targetSkill: input.skill,
            candidate: { body: variant.body },
            codexExecutable: runtime.codexExecutable ?? "codex",
            bwrapExecutable: runtime.bwrapExecutable ?? "/usr/bin/bwrap",
            env: input.env,
            finalStateRequests: [
              { tool: "kb_query", args: { type: "fact" } },
              { tool: "kb_check", args: {} },
              { tool: "kb_status", args: {} },
            ],
            evaluatorManifest: manifest,
            hiddenMarkers: runtime.hiddenMarkers ?? [],
            pricingHash: runtime.pricingHash ?? "0".repeat(64),
            priceAmount: runtime.priceAmount ?? 0,
            timeoutMs: runtime.timeoutMs ?? 180_000,
          });
          allHardPass = allHardPass && completed.receipt.result.hardPass;
        }
    return {
      eligibility: allHardPass ? "eligible" : "HELD_OUT_MATRIX_INELIGIBLE",
      cellCount: input.variants.length * PREDICATE_HELD_OUT_CASE_IDS.length * 3,
    };
  };
