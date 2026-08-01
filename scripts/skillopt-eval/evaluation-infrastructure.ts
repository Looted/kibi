import type { EpisodeResult } from "./contracts/episode";

const INFRASTRUCTURE_STATUSES = new Set<EpisodeResult["status"]>([
  "infrastructure-failure",
  "interrupted",
  "budget-exhausted",
  "evidence-conflict",
]);

export const EVALUATION_INFRASTRUCTURE_MARKER = "KIBI_SKILLOPT_INFRASTRUCTURE:";

export type EvaluationInfrastructureStage =
  | "runtime"
  | "training"
  | "development"
  | "held-out";

export type EvaluationInfrastructureDetails = Readonly<{
  stage: EvaluationInfrastructureStage;
  taskId: string;
  variant: string;
  status: EpisodeResult["status"] | "runtime-staging-failure";
  criticalFailures: readonly string[];
  receiptPath: string | null;
}>;

// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export class EvaluationInfrastructureError extends Error {
  readonly name = "EvaluationInfrastructureError";

  constructor(readonly details: EvaluationInfrastructureDetails) {
    super("evaluation_infrastructure_failure");
  }
}

type CellCompletion = Readonly<{
  receipt: Readonly<{
    result: Readonly<{
      status: EpisodeResult["status"];
      criticalFailures: readonly string[];
    }>;
  }>;
  receiptPath: string;
}>;

// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export function assertCellInfrastructureHealthy(
  completed: CellCompletion,
  context: Readonly<{
    stage: Exclude<EvaluationInfrastructureStage, "runtime">;
    taskId: string;
    variant: string;
  }>,
): void {
  const { result } = completed.receipt;
  if (!INFRASTRUCTURE_STATUSES.has(result.status)) return;
  throw new EvaluationInfrastructureError({
    ...context,
    status: result.status,
    criticalFailures:
      result.criticalFailures.length > 0
        ? [...result.criticalFailures]
        : [result.status],
    receiptPath: completed.receiptPath,
  });
}

export function evaluationInfrastructurePayload(
  error: EvaluationInfrastructureError,
): Readonly<{
  verdict: "no-go";
  reason: "cell_infrastructure_failure" | "runtime_staging_failure";
}> &
  EvaluationInfrastructureDetails {
  return {
    verdict: "no-go",
    reason:
      error.details.stage === "runtime"
        ? "runtime_staging_failure"
        : "cell_infrastructure_failure",
    ...error.details,
  };
}

export function parseEvaluationInfrastructureMarker(
  text: string,
): EvaluationInfrastructureError | null {
  const index = text.lastIndexOf(EVALUATION_INFRASTRUCTURE_MARKER);
  if (index < 0) return null;
  const tail = text
    .slice(index + EVALUATION_INFRASTRUCTURE_MARKER.length)
    .trim();
  const end = tail.indexOf("}\n");
  const candidate = end < 0 ? tail : tail.slice(0, end + 1);
  try {
    const parsed = JSON.parse(candidate) as Partial<
      ReturnType<typeof evaluationInfrastructurePayload>
    >;
    if (
      typeof parsed.stage !== "string" ||
      typeof parsed.taskId !== "string" ||
      typeof parsed.variant !== "string" ||
      typeof parsed.status !== "string" ||
      !Array.isArray(parsed.criticalFailures) ||
      !parsed.criticalFailures.every((value) => typeof value === "string") ||
      !(typeof parsed.receiptPath === "string" || parsed.receiptPath === null)
    ) {
      return null;
    }
    return new EvaluationInfrastructureError({
      stage: parsed.stage as EvaluationInfrastructureStage,
      taskId: parsed.taskId,
      variant: parsed.variant,
      status: parsed.status as EvaluationInfrastructureDetails["status"],
      criticalFailures: parsed.criticalFailures,
      receiptPath: parsed.receiptPath,
    });
  } catch {
    return null;
  }
}
