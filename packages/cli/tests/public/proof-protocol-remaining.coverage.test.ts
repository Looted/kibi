// implements REQ-kibi-proof-evidence-protocol
import { afterEach, describe, expect, test } from "bun:test";
import {
  ATTEMPTS_STATUS,
  PROOF_BINDING_KINDS,
  PROOF_BINDINGS_SCHEMA,
  PROOF_CONTRACT_SCHEMA,
  PROOF_CONTRACT_VERSION,
  PROOF_INTEGRATION_VERSION,
  PROOF_RECEIPT_VERSION,
  PROOF_RESULT_OUTCOMES,
  PROOF_RESULT_SCHEMA,
  PROOF_RUN_ARTIFACT_SCHEMA,
  PROOF_RUN_OUTCOMES,
  PROOF_RUN_VERSION,
  RUN_FAILURE_PHASES,
  SUCCESS_POLICIES,
  proofBindingsErrors,
  proofContractErrors,
  proofResultErrors,
  proofRunArtifactErrors,
} from "../../src/public/proof-protocol.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
});

const SNAPSHOT = "a".repeat(64);

function validArtifact() {
  return {
    version: PROOF_RUN_VERSION,
    producer: { name: "kibi-command-producer", version: "1.0.0" },
    command_argv: ["node", "scripts/proof.mjs"],
    code_snapshot: SNAPSHOT,
    environment: { os: "linux" },
    run: {
      outcome: "passed",
      exit_code: 0,
      started_at: "2026-08-13T00:00:00Z",
      finished_at: "2026-08-13T00:00:01Z",
    },
    proof_results: [
      {
        symbol_id: "SYM-1",
        target: "default",
        outcome: "passed",
        binding: "aggregate_run",
        attempts: { status: "unavailable" },
      },
    ],
  };
}

describe("proof-protocol leftover validator and constant branches", () => {
  test("exports runtime constants used by producers", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    expect(PROOF_RUN_VERSION).toBe("kibi.proof-run.v1");
    expect(PROOF_CONTRACT_VERSION).toBe("kibi.proof-contract.v1");
    expect(PROOF_RECEIPT_VERSION).toBe("kibi.proof-receipt.v1");
    expect(PROOF_INTEGRATION_VERSION).toBe("kibi.proof-integration.v1");
    expect(PROOF_RUN_OUTCOMES).toContain("no_results");
    expect(PROOF_RESULT_OUTCOMES).toContain("interrupted");
    expect(PROOF_BINDING_KINDS).toContain("native_case");
    expect(ATTEMPTS_STATUS).toContain("complete");
    expect(RUN_FAILURE_PHASES).toContain("setup");
    expect(SUCCESS_POLICIES).toContain("all_required_first_attempt");
    expect(PROOF_RESULT_SCHEMA.required).toContain("attempts");
    expect(PROOF_RUN_ARTIFACT_SCHEMA.required).toContain("proof_results");
    expect(PROOF_CONTRACT_SCHEMA.required).toContain("success_policy");
    expect(PROOF_BINDINGS_SCHEMA.items.required).toEqual(["symbol_id", "target"]);
  });

  test("proofRunArtifactErrors covers missing producer, array environment, and non-array results", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    expect(
      proofRunArtifactErrors({
        ...validArtifact(),
        producer: undefined,
      }).join(" "),
    ).toContain("producer is required");
    expect(
      proofRunArtifactErrors({
        ...validArtifact(),
        executor: "node",
      }).join(" "),
    ).toContain("executor must be an object");
    expect(
      proofRunArtifactErrors({
        ...validArtifact(),
        environment: ["linux"],
      }).join(" "),
    ).toContain("environment must be a typed environment object");
    expect(
      proofRunArtifactErrors({
        ...validArtifact(),
        proof_results: "nope",
      }).join(" "),
    ).toContain("non-empty array");
    expect(
      proofRunArtifactErrors({
        ...validArtifact(),
        diagnostics: "nope",
      }).join(" "),
    ).toContain("diagnostics must be an array");
  });

  test("proofContractErrors covers a non-array obligation list", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    expect(
      proofContractErrors({
        version: PROOF_CONTRACT_VERSION,
        integration: "self-proof",
        required_proofs: { symbol_id: "SYM-1" },
        success_policy: "all_required_first_attempt",
      }).join(" "),
    ).toContain("non-empty array");
  });

  test("proofBindingsErrors accepts an empty list and rejects blank aliases", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    expect(proofBindingsErrors([])).toEqual([]);
    expect(
      proofBindingsErrors([
        {
          symbol_id: "SYM-1",
          target: "default",
          aliases: ["ok", ""],
        },
      ]).join(" "),
    ).toContain("aliases");
  });

  test("proofResultErrors accepts a complete attempt history", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    expect(
      proofResultErrors(
        {
          symbol_id: "SYM-1",
          target: "default",
          outcome: "passed",
          binding: "native_case",
          attempts: {
            status: "complete",
            entries: [{ outcome: "passed", duration_ms: 2 }],
          },
          diagnostics: ["ok"],
        },
        "r",
      ),
    ).toEqual([]);
  });

  test("proofRunArtifactErrors covers run field, JSON environment, and duplicate results", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    expect(proofRunArtifactErrors(null)[0]).toContain("must be an object");
    const artifact = validArtifact();
    expect(
      proofRunArtifactErrors({
        ...artifact,
        command_argv: ["node", ""],
        environment: { nested: undefined },
        run: {
          outcome: "nope",
          exit_code: 0.5,
          started_at: "",
          finished_at: "",
          failure_phase: "later",
        },
        integration: " ",
        proof_results: [
          artifact.proof_results[0],
          artifact.proof_results[0],
        ],
      }).join(" "),
    ).toMatch(/command_argv|environment|outcome|exit_code|started_at|integration|duplicates/);
  });

  test("proofContractErrors and proofBindingsErrors cover duplicates and line/source shapes", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    expect(proofContractErrors(null)[0]).toContain("must be an object");
    expect(
      proofContractErrors({
        version: "wrong",
        integration: "",
        required_proofs: [
          { symbol_id: "SYM-1", target: "default" },
          { symbol_id: "SYM-1", target: "default" },
          "nope",
        ],
        success_policy: "unknown",
      }).join(" "),
    ).toMatch(/version|integration|duplicates|must be an object|success_policy/);
    expect(proofBindingsErrors("nope")[0]).toContain("array");
    expect(
      proofBindingsErrors([
        {
          symbol_id: "SYM-1",
          target: "default",
          native_id: " ",
          source_file: " ",
          line: 0,
        },
        { symbol_id: "SYM-1", target: "default" },
      ]).join(" "),
    ).toMatch(/native_id|source_file|line|duplicates/);
  });

  test("rejects unavailable attempts with leftover entries and oversized contracts", () => {
    expect(
      proofResultErrors(
        {
          symbol_id: "SYM-1",
          target: "default",
          outcome: "passed",
          binding: "aggregate_run",
          attempts: { status: "unavailable", entries: [] },
        },
        "r",
      ).join(" "),
    ).toMatch(/entries|unavailable/);
    expect(
      proofContractErrors({
        version: PROOF_CONTRACT_VERSION,
        integration: "self-proof",
        required_proofs: Array.from({ length: 1001 }, (_, index) => ({
          symbol_id: `SYM-${index}`,
          target: "default",
        })),
        success_policy: SUCCESS_POLICIES[0],
      }).join(" "),
    ).toMatch(/1000|too many|length/);
  });
});
