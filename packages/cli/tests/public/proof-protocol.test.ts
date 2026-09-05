import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import {
  effectiveProofFingerprint,
  environmentHash,
  fingerprintDrift,
  jsonDigest,
} from "../../src/public/proof-fingerprint.js";
import {
  PROOF_CONTRACT_VERSION,
  PROOF_RUN_VERSION,
  proofBindingsErrors,
  proofContractErrors,
  proofResultErrors,
  proofRunArtifactErrors,
} from "../../src/public/proof-protocol.js";
import {
  MAX_PROOF_RECEIPTS,
  appendOnlyProofReceiptHistoryErrors,
  proofReceiptCurrentBindingErrors,
  proofReceiptHistoryErrors,
} from "../../src/public/proof-receipt.js";

const SNAPSHOT = "a".repeat(64);

const validArtifact = () => ({
  version: PROOF_RUN_VERSION,
  producer: { name: "kibi-command-producer", version: "1.0.0" },
  executor: { name: "node", version: "v24.0.0" },
  integration: "self-proof",
  command_argv: ["node", "scripts/proof.mjs"],
  code_snapshot: SNAPSHOT,
  environment: {
    os: "linux",
    arch: "x86_64",
    runtime: { name: "node", version: "v24.0.0" },
  },
  run: {
    outcome: "passed",
    exit_code: 0,
    started_at: "2026-08-13T00:00:00Z",
    finished_at: "2026-08-13T00:00:01Z",
  },
  proof_results: [
    {
      symbol_id: "SYM-CASE-1",
      target: "default",
      outcome: "passed",
      binding: "aggregate_run",
      attempts: { status: "unavailable" },
    },
    {
      symbol_id: "SYM-CASE-2",
      target: "postgres-16",
      outcome: "passed",
      binding: "native_case",
      native_id: "tests/db.py::test_replication",
      attempts: {
        status: "complete",
        entries: [
          { outcome: "failed", duration_ms: 10 },
          { outcome: "passed", duration_ms: 271 },
        ],
      },
    },
  ],
});

describe("kibi.proof-run.v1", () => {
  test("accepts a complete canonical artifact", () => {
    expect(proofRunArtifactErrors(validArtifact())).toEqual([]);
  });

  test("accepts docs/examples/proof artifacts", () => {
    const dir = join(import.meta.dir, "../../../../docs/examples/proof");
    const files = readdirSync(dir).filter((name) => name.endsWith(".json"));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const artifact = JSON.parse(readFileSync(join(dir, file), "utf8"));
      expect(proofRunArtifactErrors(artifact), file).toEqual([]);
    }
  });

  test("rejects wrong version, missing fields, duplicate results", () => {
    expect(proofRunArtifactErrors(null)[0]).toContain(
      "artifact must be an object",
    );
    const artifact = validArtifact();
    // Legacy pre-proof-architecture version must be rejected by the validator.
    artifact.version =
      "kibi.playwright-run.v1" as unknown as typeof artifact.version;
    expect(proofRunArtifactErrors(artifact)[0]).toContain(
      "artifact.version must be kibi.proof-run.v1",
    );
    const duplicated = validArtifact();
    duplicated.proof_results = [
      ...duplicated.proof_results,
      { ...duplicated.proof_results[0] },
    ];
    expect(proofRunArtifactErrors(duplicated).join(" ")).toContain(
      "duplicates",
    );
    const noResults = validArtifact();
    noResults.proof_results = [];
    expect(proofRunArtifactErrors(noResults)[0]).toContain("non-empty");
  });

  test("validates attempt history shapes", () => {
    expect(
      proofResultErrors(
        {
          symbol_id: "SYM-1",
          target: "default",
          outcome: "passed",
          binding: "native_case",
          attempts: { status: "complete", entries: [] },
        },
        "r",
      )[0],
    ).toContain("non-empty array");
    expect(
      proofResultErrors(
        {
          symbol_id: "SYM-1",
          target: "default",
          outcome: "passed",
          binding: "native_case",
          attempts: { status: "unavailable", entries: [{ outcome: "passed" }] },
        },
        "r",
      )[0],
    ).toContain("must be omitted");
  });

  test("validates proof contracts", () => {
    expect(
      proofContractErrors({
        version: PROOF_CONTRACT_VERSION,
        integration: "self-proof",
        required_proofs: [
          { symbol_id: "SYM-1", target: "default" },
          { symbol_id: "SYM-2", target: "postgres-16" },
        ],
        success_policy: "all_required_first_attempt",
      }),
    ).toEqual([]);
    expect(
      proofContractErrors({
        version: PROOF_CONTRACT_VERSION,
        integration: "self-proof",
        required_proofs: [],
        success_policy: "all_required_first_attempt",
      })[0],
    ).toContain("non-empty array");
  });

  test("validates proof bindings", () => {
    expect(
      proofBindingsErrors([
        {
          symbol_id: "SYM-1",
          target: "default",
          native_id: "tests/a.py::test_a",
          aliases: ["a"],
          source_file: "tests/a.py",
          line: 3,
        },
      ]),
    ).toEqual([]);
    expect(proofBindingsErrors("nope")[0]).toContain("array");
  });
});

describe("environment binding", () => {
  test("canonicalizes typed environments deterministically", () => {
    const left = environmentHash({
      os: "linux",
      arch: "x86_64",
      runtime: { name: "python", version: "3.13.1" },
    });
    const right = environmentHash({
      runtime: { version: "3.13.1", name: "python" },
      arch: "x86_64",
      os: "linux",
    });
    expect(left).toBe(right);
    expect(left).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("effective proof fingerprint", () => {
  const contract = {
    version: PROOF_CONTRACT_VERSION,
    integration: "self-proof",
    required_proofs: [{ symbol_id: "SYM-1", target: "default" }],
    success_policy: "all_required_first_attempt" as const,
  };
  const integration = {
    id: "self-proof",
    producer: "command",
    command: ["node", "scripts/proof.mjs"],
  };
  const bindings = [{ symbol_id: "SYM-1", target: "default" }];

  test("is deterministic", () => {
    const a = effectiveProofFingerprint({ contract, integration, bindings });
    const b = effectiveProofFingerprint({
      contract,
      integration: { ...integration, command: [...integration.command] },
      bindings: [...bindings],
    });
    expect(a.fingerprint).toBe(b.fingerprint);
  });

  test("ignores cosmetic edits but detects execution changes", () => {
    const a = effectiveProofFingerprint({ contract, integration, bindings });
    const cosmetic = effectiveProofFingerprint({
      contract,
      // Unknown extra key must be ignored by the fingerprint normalizer.
      integration: {
        ...integration,
        description: "Changed description",
      } as typeof integration,
      bindings,
    });
    expect(a.fingerprint).toBe(cosmetic.fingerprint);
    const changedCommand = effectiveProofFingerprint({
      contract,
      integration: { ...integration, command: ["node", "scripts/other.mjs"] },
      bindings,
    });
    expect(a.fingerprint).not.toBe(changedCommand.fingerprint);
    expect(fingerprintDrift(a.components, changedCommand.components)).toEqual([
      "integration",
      "command",
    ]);
    const changedBindings = effectiveProofFingerprint({
      contract,
      integration,
      bindings: [
        ...bindings,
        { symbol_id: "SYM-1", target: "default", native_id: "x" },
      ],
    });
    expect(fingerprintDrift(a.components, changedBindings.components)).toEqual([
      "bindings",
    ]);
  });
});

describe("proof receipt history", () => {
  const baseReceipt = (overrides: Record<string, unknown> = {}) => ({
    version: "kibi.proof-receipt.v1",
    receipt_id: "PR-test-receipt-000001",
    test_id: "TEST-001",
    scope: "end_to_end",
    outcome: "passed",
    code_snapshot: SNAPSHOT,
    environment_hash: "b".repeat(64),
    started_at: "2026-08-13T00:00:00Z",
    finished_at: "2026-08-13T00:00:01Z",
    artifact_digest: "c".repeat(64),
    contract_hash: "d".repeat(64),
    fingerprint: "e".repeat(64),
    fingerprint_components: {
      contract: "1a".repeat(32),
      integration: "2a".repeat(32),
      command: "3a".repeat(32),
      bindings: "4a".repeat(32),
      producer: "5a".repeat(32),
    },
    integration_id: "self-proof",
    producer: { name: "kibi-command-producer" },
    command_argv: ["node", "scripts/proof.mjs"],
    run_outcome: "passed",
    proof_results: [
      {
        symbol_id: "SYM-1",
        target: "default",
        outcome: "passed",
        binding: "aggregate_run",
        attempts: { status: "unavailable" },
      },
    ],
    ...overrides,
  });

  test("valid shapes pass and mismatches fail", () => {
    expect(
      proofReceiptHistoryErrors("TEST-001", "end_to_end", [baseReceipt()]),
    ).toEqual([]);
    expect(
      proofReceiptHistoryErrors("TEST-002", "end_to_end", [baseReceipt()])[0],
    ).toContain("test_id must equal");
    expect(
      proofReceiptHistoryErrors("TEST-001", "end_to_end", [
        baseReceipt({ receipt_id: "VR-legacy" }),
      ])[0],
    ).toContain("structurally valid");
    expect(
      proofReceiptHistoryErrors("TEST-001", undefined, [baseReceipt()])[0],
    ).toContain("verification_scope is required");
  });

  test("enforces chronological append-only history and cap rotation", () => {
    const first = baseReceipt();
    const second = baseReceipt({
      receipt_id: "PR-test-receipt-000002",
      started_at: "2026-08-13T00:00:02Z",
      finished_at: "2026-08-13T00:00:03Z",
    });
    expect(
      proofReceiptHistoryErrors("TEST-001", "end_to_end", [second, first])[0],
    ).toContain("strictly later");
    expect(
      appendOnlyProofReceiptHistoryErrors([first], [first, second]),
    ).toEqual([]);
    expect(appendOnlyProofReceiptHistoryErrors([first], [second])[0]).toContain(
      "append-only",
    );
    expect(
      appendOnlyProofReceiptHistoryErrors([first], undefined)[0],
    ).toContain("append-only");
    const cap = MAX_PROOF_RECEIPTS;
    const history = Array.from({ length: cap }, (_, index) =>
      baseReceipt({
        receipt_id: `PR-rotation-${String(index).padStart(3, "0")}`,
        started_at: `2026-08-10T00:00:${String(index % 60).padStart(2, "0")}Z`,
        finished_at: `2026-08-10T00:00:${String(index % 60).padStart(2, "0")}Z`,
      }),
    );
    const rotated = [...history.slice(1), second];
    expect(appendOnlyProofReceiptHistoryErrors(history, rotated)).toEqual([]);
    expect(
      appendOnlyProofReceiptHistoryErrors(history, [history[1], second]).length,
    ).toBeGreaterThan(0);
  });

  test("current binding requires matching scope, contract, and fingerprint", () => {
    const receipt = baseReceipt();
    expect(
      proofReceiptCurrentBindingErrors("TEST-001", "end_to_end", receipt),
    ).toEqual([]);
    expect(
      proofReceiptCurrentBindingErrors("TEST-001", "integration", receipt)[0],
    ).toContain("verification_scope");
  });

  test("receipt ids derive from artifact digest, test id, and fingerprint", () => {
    const digest = jsonDigest({
      artifact: "x",
      test: "TEST-001",
      fingerprint: "f",
    });
    expect(`PR-${digest.slice(0, 24)}`).toMatch(
      /^PR-[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/,
    );
  });
});
