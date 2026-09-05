// implements REQ-skillopt-codex-optimization
import { describe, expect, test } from "bun:test";
import {
  EVALUATION_INFRASTRUCTURE_MARKER,
  EvaluationInfrastructureError,
  assertCellInfrastructureHealthy,
  evaluationInfrastructurePayload,
  parseEvaluationInfrastructureMarker,
} from "../evaluation-infrastructure.ts";

function completed(
  status: "passed" | "infrastructure-failure" | "interrupted" | "budget-exhausted" | "evidence-conflict",
  criticalFailures: string[] = [],
) {
  return {
    receipt: {
      result: { status, criticalFailures },
    },
    receiptPath: "/tmp/receipt.json",
  };
}

describe("evaluation infrastructure helpers", () => {
  test("allows healthy cells and throws on infrastructure statuses", () => {
    expect(() =>
      assertCellInfrastructureHealthy(completed("passed"), {
        stage: "training",
        taskId: "t1",
        variant: "skillopt",
      }),
    ).not.toThrow();

    expect(() =>
      assertCellInfrastructureHealthy(completed("infrastructure-failure", ["disk"]), {
        stage: "development",
        taskId: "t2",
        variant: "baseline",
      }),
    ).toThrow(EvaluationInfrastructureError);

    try {
      assertCellInfrastructureHealthy(completed("interrupted"), {
        stage: "held-out",
        taskId: "t3",
        variant: "one-shot",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(EvaluationInfrastructureError);
      const details = (error as EvaluationInfrastructureError).details;
      expect(details.criticalFailures).toEqual(["interrupted"]);
      expect(details.receiptPath).toBe("/tmp/receipt.json");
      const payload = evaluationInfrastructurePayload(
        error as EvaluationInfrastructureError,
      );
      expect(payload.verdict).toBe("no-go");
      expect(payload.reason).toBe("cell_infrastructure_failure");
    }

    const runtimeError = new EvaluationInfrastructureError({
      stage: "runtime",
      taskId: "t4",
      variant: "skillopt",
      status: "runtime-staging-failure",
      criticalFailures: ["stage"],
      receiptPath: null,
    });
    expect(evaluationInfrastructurePayload(runtimeError).reason).toBe(
      "runtime_staging_failure",
    );
  });

  test("parses markers, rejects malformed JSON, and ignores missing markers", () => {
    expect(parseEvaluationInfrastructureMarker("no marker here")).toBeNull();
    const details = {
      stage: "training",
      taskId: "t5",
      variant: "skillopt",
      status: "budget-exhausted",
      criticalFailures: ["tokens"],
      receiptPath: "/tmp/a.json",
    };
    const text = `prefix ${EVALUATION_INFRASTRUCTURE_MARKER}${JSON.stringify(details)}\ntrailer`;
    const parsed = parseEvaluationInfrastructureMarker(text);
    expect(parsed?.details.taskId).toBe("t5");

    const noNewline = `${EVALUATION_INFRASTRUCTURE_MARKER}${JSON.stringify(details)}`;
    expect(parseEvaluationInfrastructureMarker(noNewline)?.details.variant).toBe(
      "skillopt",
    );

    expect(
      parseEvaluationInfrastructureMarker(
        `${EVALUATION_INFRASTRUCTURE_MARKER}{"stage":1}`,
      ),
    ).toBeNull();
    expect(
      parseEvaluationInfrastructureMarker(`${EVALUATION_INFRASTRUCTURE_MARKER}{`),
    ).toBeNull();
    expect(
      parseEvaluationInfrastructureMarker(
        `${EVALUATION_INFRASTRUCTURE_MARKER}${JSON.stringify({
          ...details,
          criticalFailures: [1],
        })}`,
      ),
    ).toBeNull();
    expect(
      parseEvaluationInfrastructureMarker(
        `${EVALUATION_INFRASTRUCTURE_MARKER}${JSON.stringify({
          ...details,
          stage: undefined,
        })}`,
      ),
    ).toBeNull();
    expect(
      parseEvaluationInfrastructureMarker(
        `${EVALUATION_INFRASTRUCTURE_MARKER}${JSON.stringify({
          ...details,
          receiptPath: 12,
        })}`,
      ),
    ).toBeNull();
    const withNullReceipt = {
      ...details,
      receiptPath: null,
    };
    expect(
      parseEvaluationInfrastructureMarker(
        `${EVALUATION_INFRASTRUCTURE_MARKER}${JSON.stringify(withNullReceipt)}`,
      )?.details.receiptPath,
    ).toBeNull();
  });
});
