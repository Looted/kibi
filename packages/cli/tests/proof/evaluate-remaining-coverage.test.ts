// implements REQ-kibi-proof-evidence-protocol
import { describe, expect, test } from "bun:test";
import { evaluateContractAgainstRun } from "../../src/proof/evaluate.js";
import type {
  ProofContract,
  ProofResult,
  ProofRunArtifact,
} from "../../src/public/proof-protocol.js";

const SNAPSHOT = "b".repeat(64);

const contract: ProofContract = {
  version: "kibi.proof-contract.v1",
  integration: "self-proof",
  required_proofs: [{ symbol_id: "SYM-ONE", target: "default" }],
  success_policy: "all_required_first_attempt",
};

function result(overrides: Partial<ProofResult> = {}): ProofResult {
  return {
    symbol_id: "SYM-ONE",
    target: "default",
    outcome: "passed",
    binding: "aggregate_run",
    attempts: { status: "unavailable" },
    ...overrides,
  };
}

function artifact(
  run: Partial<ProofRunArtifact["run"]>,
  proofResults: readonly ProofResult[],
): ProofRunArtifact {
  return {
    version: "kibi.proof-run.v1",
    producer: { name: "kibi-command-producer" },
    integration: "self-proof",
    command_argv: ["node", "scripts/run-proof-producer.mjs"],
    code_snapshot: SNAPSHOT,
    environment: {},
    run: {
      outcome: "passed",
      exit_code: 0,
      started_at: "2026-09-05T00:00:00Z",
      finished_at: "2026-09-05T00:00:01Z",
      ...run,
    },
    proof_results: proofResults,
  };
}

describe("evaluateContractAgainstRun remaining branches", () => {
  test("maps cancelled, interrupted, and no_results run outcomes", () => {
    expect(
      evaluateContractAgainstRun(
        artifact({ outcome: "cancelled", exit_code: 1 }, []),
        contract,
      ).outcome,
    ).toBe("cancelled");
    expect(
      evaluateContractAgainstRun(
        artifact({ outcome: "interrupted", exit_code: 1 }, []),
        contract,
      ).outcome,
    ).toBe("interrupted");
    const noResults = evaluateContractAgainstRun(
      artifact({ outcome: "no_results", exit_code: 1 }, []),
      contract,
    );
    expect(noResults.outcome).toBe("failed");
    expect(noResults.gaps[0]?.reason).toContain("run produced no results");
  });

  test("records a missing obligation result on a passing run", () => {
    const evaluation = evaluateContractAgainstRun(artifact({}, []), contract);
    expect(evaluation.satisfied).toBe(false);
    expect(evaluation.gaps[0]?.reason).toContain("missing proof result");
  });

  test("rejects native-case passes without attempt history", () => {
    const evaluation = evaluateContractAgainstRun(
      artifact({}, [
        result({
          binding: "native_case",
          attempts: { status: "unavailable" },
        }),
      ]),
      contract,
    );
    expect(evaluation.gaps[0]?.reason).toContain("attempt history unavailable");
  });

  test("rejects native-case first attempts that did not pass", () => {
    const evaluation = evaluateContractAgainstRun(
      artifact({}, [
        result({
          binding: "native_case",
          attempts: {
            status: "complete",
            entries: [{ outcome: "failed" }, { outcome: "passed" }],
          },
        }),
      ]),
      contract,
    );
    expect(evaluation.gaps[0]?.reason).toContain("first attempt outcome is 'failed'");
  });

  test("rejects aggregate runs whose process exit code is non-zero", () => {
    const evaluation = evaluateContractAgainstRun(
      artifact({ exit_code: 2 }, [result()]),
      contract,
    );
    expect(evaluation.gaps[0]?.reason).toContain("aggregate run exit code is 2");
  });

  test("promotes interrupted and timed_out obligation outcomes on a passing run", () => {
    const interrupted = evaluateContractAgainstRun(
      artifact({}, [result({ outcome: "interrupted" })]),
      contract,
    );
    expect(interrupted.outcome).toBe("interrupted");
    const timedOut = evaluateContractAgainstRun(
      artifact({}, [result({ outcome: "timed_out" })]),
      contract,
    );
    expect(timedOut.outcome).toBe("timed_out");
    const failed = evaluateContractAgainstRun(
      artifact({}, [result({ outcome: "failed" })]),
      contract,
    );
    expect(failed.outcome).toBe("failed");
    expect(failed.gaps[0]?.reason).toContain("proof result outcome is 'failed'");
  });
});
