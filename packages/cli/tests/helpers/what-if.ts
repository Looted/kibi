import type { PrologQueryResult } from "../../src/public/operations/runtime-types.js";

/** True for the rolled-back staging goal kb_apply_plan and kb_compile_intent run. */
export function isWhatIfGoal(goal: string): boolean {
  return goal.includes("checks:what_if_analysis_json(");
}

/** What-if analysis result for a plan that introduces and resolves nothing. */
export function whatIfResult(
  analysis: Readonly<{
    introduced?: readonly Record<string, unknown>[];
    removed?: readonly Record<string, unknown>[];
    unchanged?: readonly Record<string, unknown>[];
  }> = {},
): PrologQueryResult {
  const introduced = analysis.introduced ?? [];
  const unchanged = analysis.unchanged ?? [];
  return {
    success: true,
    bindings: {
      JsonString: JSON.stringify({
        witnesses: [...introduced, ...unchanged],
        before: [...(analysis.removed ?? []), ...unchanged],
        after: [...introduced, ...unchanged],
        introduced,
        removed: analysis.removed ?? [],
        unchanged,
      }),
    },
  };
}
