import type {
  ProofContract,
  ProofResult,
  ProofRunArtifact,
} from "../public/proof-protocol.js";
import type { ProofReceiptOutcome } from "./receipt-outcome.js";

export type ProofGap = Readonly<{
  symbol_id: string;
  target: string;
  reason: string;
}>;

export type ContractEvaluation = Readonly<{
  satisfied: boolean;
  outcome: ProofReceiptOutcome;
  gaps: readonly ProofGap[];
  projectedResults: readonly ProofResult[];
}>;

function mapRunOutcome(
  outcome: ProofRunArtifact["run"]["outcome"],
): ProofReceiptOutcome {
  switch (outcome) {
    case "passed":
      return "passed";
    case "errored":
      return "errored";
    case "cancelled":
      return "cancelled";
    case "timed_out":
      return "timed_out";
    case "interrupted":
      return "interrupted";
    case "no_results":
    case "failed":
      return "failed";
  }
}

/**
 * Kibi evaluates proof. Producers only report what happened.
 *
 * - The run must have completed successfully; a failed run never proves
 *   anything, no matter how many individual results passed.
 * - `native_case` results must carry complete attempt history with a passing
 *   first attempt; unknown history fails closed.
 * - `aggregate_run` results are satisfied by the one Kibi-launched process
 *   invocation itself (the process attempt), never by invented native-case
 *   evidence.
 */
export function evaluateContractAgainstRun(
  artifact: ProofRunArtifact,
  contract: ProofContract,
): ContractEvaluation {
  const runPassed = artifact.run.outcome === "passed";
  const gaps: ProofGap[] = [];
  const projectedResults: ProofResult[] = [];

  for (const obligation of contract.required_proofs) {
    const observed = artifact.proof_results.find(
      (result) =>
        result.symbol_id === obligation.symbol_id &&
        result.target === obligation.target,
    );
    if (observed) projectedResults.push(observed);
    if (!runPassed) {
      gaps.push({
        symbol_id: obligation.symbol_id,
        target: obligation.target,
        reason:
          artifact.run.outcome === "no_results"
            ? `run produced no results (outcome: no_results${artifact.run.failure_phase ? `, phase: ${artifact.run.failure_phase}` : ""})`
            : `run did not pass (outcome: ${artifact.run.outcome}${artifact.run.failure_phase ? `, phase: ${artifact.run.failure_phase}` : ""})`,
      });
      continue;
    }
    if (!observed) {
      gaps.push({
        symbol_id: obligation.symbol_id,
        target: obligation.target,
        reason:
          "missing proof result: the run reported no result for this obligation",
      });
      continue;
    }
    if (observed.outcome !== "passed") {
      gaps.push({
        symbol_id: obligation.symbol_id,
        target: obligation.target,
        reason: `proof result outcome is '${observed.outcome}'`,
      });
      continue;
    }
    if (observed.binding === "native_case") {
      if (observed.attempts.status === "unavailable") {
        gaps.push({
          symbol_id: obligation.symbol_id,
          target: obligation.target,
          reason:
            "attempt history unavailable: strict first-attempt policy cannot verify a native-case pass",
        });
        continue;
      }
      const first = observed.attempts.entries[0];
      if (!first || first.outcome !== "passed") {
        gaps.push({
          symbol_id: obligation.symbol_id,
          target: obligation.target,
          reason: `first attempt outcome is '${first?.outcome ?? "unknown"}'`,
        });
      }
      continue;
    }
    // aggregate_run: the single Kibi-launched command invocation is known
    // first-attempt process evidence when the run passed with exit code 0.
    if (artifact.run.exit_code !== 0) {
      gaps.push({
        symbol_id: obligation.symbol_id,
        target: obligation.target,
        reason: `aggregate run exit code is ${artifact.run.exit_code}`,
      });
    }
  }

  if (!runPassed) {
    return {
      satisfied: false,
      outcome: mapRunOutcome(artifact.run.outcome),
      gaps,
      projectedResults,
    };
  }
  if (gaps.length > 0) {
    let outcome: ProofReceiptOutcome = "failed";
    if (
      projectedResults.some(
        (result) =>
          contract.required_proofs.some(
            (obligation) =>
              obligation.symbol_id === result.symbol_id &&
              obligation.target === result.target,
          ) && result.outcome === "interrupted",
      )
    ) {
      outcome = "interrupted";
    } else if (
      projectedResults.some(
        (result) =>
          contract.required_proofs.some(
            (obligation) =>
              obligation.symbol_id === result.symbol_id &&
              obligation.target === result.target,
          ) && result.outcome === "timed_out",
      )
    ) {
      outcome = "timed_out";
    }
    return { satisfied: false, outcome, gaps, projectedResults };
  }
  return { satisfied: true, outcome: "passed", gaps: [], projectedResults };
}
