import { describe, expect, test } from "bun:test";
import {
  commandEnvironment,
  parseIntegrationSelector,
} from "../../src/commands/prove.js";
import { evaluateContractAgainstRun } from "../../src/proof/evaluate.js";
import type { ProofIntegration } from "../../src/proof/integrations.js";
import type {
  ProofContract,
  ProofResult,
  ProofRunArtifact,
} from "../../src/public/proof-protocol.js";

const SNAPSHOT = "a".repeat(64);

const integration: ProofIntegration = {
  id: "self-proof",
  producer: "command",
  command: ["node", "scripts/run-proof-step.mjs"],
};

const contract: ProofContract = {
  version: "kibi.proof-contract.v1",
  integration: "self-proof",
  required_proofs: [
    { symbol_id: "SYM-AGGREGATE", target: "default" },
    { symbol_id: "SYM-MEMBER", target: "default" },
  ],
  success_policy: "all_required_first_attempt",
};

function result(overrides: Partial<ProofResult>): ProofResult {
  return {
    symbol_id: "SYM-X",
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
    command_argv: integration.command,
    code_snapshot: SNAPSHOT,
    environment: {},
    run: {
      outcome: "passed",
      exit_code: 0,
      started_at: "2026-09-03T00:00:00Z",
      finished_at: "2026-09-03T00:00:01Z",
      ...run,
    },
    proof_results: proofResults,
  };
}

describe("evaluateContractAgainstRun run-failure attribution", () => {
  test("failed run attributes failing member results while own result passed", () => {
    const evaluation = evaluateContractAgainstRun(
      artifact(
        { outcome: "timed_out", exit_code: 1, failure_phase: "execution" },
        [
          result({ symbol_id: "SYM-AGGREGATE" }),
          result({ symbol_id: "SYM-MEMBER" }),
          result({
            symbol_id: "SYM-OTHER",
            outcome: "timed_out",
            binding: "native_case",
            attempts: {
              status: "complete",
              entries: [{ outcome: "timed_out" }],
            },
          }),
        ],
      ),
      contract,
    );
    expect(evaluation.satisfied).toBe(false);
    const aggregateGap = evaluation.gaps.find(
      (gap) => gap.symbol_id === "SYM-AGGREGATE",
    );
    expect(aggregateGap?.reason).toContain(
      "run did not pass (outcome: timed_out",
    );
    expect(aggregateGap?.reason).toContain("phase: execution");
    expect(aggregateGap?.reason).toContain(
      "this obligation's own result passed",
    );
    expect(aggregateGap?.reason).toContain(
      "failing member result(s): SYM-OTHER (timed_out)",
    );
    const memberGap = evaluation.gaps.find(
      (gap) => gap.symbol_id === "SYM-MEMBER",
    );
    expect(memberGap?.reason).toContain("this obligation's own result passed");
  });

  test("failed run surfaces an obligation's own failing result", () => {
    const evaluation = evaluateContractAgainstRun(
      artifact({ outcome: "failed", exit_code: 1 }, [
        result({
          symbol_id: "SYM-AGGREGATE",
          outcome: "failed",
        }),
      ]),
      contract,
    );
    const aggregateGap = evaluation.gaps.find(
      (gap) => gap.symbol_id === "SYM-AGGREGATE",
    );
    expect(aggregateGap?.reason).toContain(
      "this obligation's own result outcome is 'failed'",
    );
  });

  test("failed run without failing member results stays opaque", () => {
    const evaluation = evaluateContractAgainstRun(
      artifact(
        { outcome: "errored", exit_code: 2, failure_phase: "setup" },
        [],
      ),
      contract,
    );
    for (const gap of evaluation.gaps) {
      expect(gap.reason).toContain("run did not pass (outcome: errored");
      expect(gap.reason).not.toContain("failing member result(s)");
      expect(gap.reason).not.toContain("own result");
    }
  });

  test("member attribution caps the listed members", () => {
    const members = Array.from({ length: 7 }, (_, index) =>
      result({ symbol_id: `SYM-FAIL-${index}`, outcome: "failed" }),
    );
    const evaluation = evaluateContractAgainstRun(
      artifact({ outcome: "failed", exit_code: 1 }, [
        result({ symbol_id: "SYM-AGGREGATE" }),
        ...members,
      ]),
      contract,
    );
    const aggregateGap = evaluation.gaps.find(
      (gap) => gap.symbol_id === "SYM-AGGREGATE",
    );
    expect(aggregateGap?.reason).toContain("+2 more");
    expect(aggregateGap?.reason).toContain("SYM-FAIL-4 (failed)");
    expect(aggregateGap?.reason).not.toContain("SYM-FAIL-5");
  });

  test("passing runs keep clean gap semantics", () => {
    const evaluation = evaluateContractAgainstRun(
      artifact({}, [
        result({ symbol_id: "SYM-AGGREGATE" }),
        result({ symbol_id: "SYM-MEMBER" }),
      ]),
      contract,
    );
    expect(evaluation.satisfied).toBe(true);
    expect(evaluation.gaps).toHaveLength(0);
  });
});

describe("commandEnvironment proof-run marker", () => {
  test("marks child processes as proof runs", () => {
    const env = commandEnvironment(
      integration,
      integration.command,
      SNAPSHOT,
      "/tmp/workspace",
      ["TEST-1"],
      "/tmp/workspace/.kb/proof/runs/self-proof.json",
    );
    expect(env.KIBI_PROOF_RUN).toBe("1");
    expect(env.KIBI_PROOF_OUTPUT).toBe(
      "/tmp/workspace/.kb/proof/runs/self-proof.json",
    );
    expect(env.KIBI_PROOF_INTEGRATION).toBe("self-proof");
  });
});

describe("parseIntegrationSelector", () => {
  test("empty and undefined selectors yield an empty set", () => {
    expect(parseIntegrationSelector(undefined, "--integration").size).toBe(0);
    expect(parseIntegrationSelector("", "--integration").size).toBe(0);
    expect(parseIntegrationSelector("  ", "--integration").size).toBe(0);
  });

  test("splits and trims comma-separated ids", () => {
    expect(
      parseIntegrationSelector(
        "web-e2e, api-tests ,self-proof",
        "--integration",
      ),
    ).toEqual(new Set(["web-e2e", "api-tests", "self-proof"]));
  });

  test("rejects blank items fail-fast", () => {
    expect(() =>
      parseIntegrationSelector("web-e2e,,api-tests", "--integration"),
    ).toThrow("empty integration id");
  });
});
