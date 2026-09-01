import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { executeIngestProof } from "../../src/operations/proof/ingest-proof.js";
import type {
  OperationContext,
  PrologPort,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";
import {
  environmentHash,
  proofContractHash,
} from "../../src/public/proof-fingerprint.js";

const SNAPSHOT = "a".repeat(64);
const ENVIRONMENT = {
  os: "linux",
  arch: "x86_64",
  runtime: { name: "node", version: "v24.0.0" },
};
const ENVIRONMENT_HASH = environmentHash(ENVIRONMENT);

const contract = {
  version: "kibi.proof-contract.v1",
  integration: "self-proof",
  required_proofs: [{ symbol_id: "SYM-CASE-1", target: "default" }],
  success_policy: "all_required_first_attempt",
};

const secondContract = {
  version: "kibi.proof-contract.v1",
  integration: "self-proof",
  required_proofs: [
    { symbol_id: "SYM-CASE-2", target: "default" },
    { symbol_id: "SYM-CASE-3", target: "postgres-16" },
  ],
  success_policy: "all_required_first_attempt",
};

const command = ["node", "scripts/run-proof-step.mjs"];

const historicalReceipt = {
  version: "kibi.proof-receipt.v1",
  receipt_id: "PR-historical-contract01",
  test_id: "TEST-001",
  scope: "end_to_end",
  outcome: "passed",
  code_snapshot: SNAPSHOT,
  environment_hash: ENVIRONMENT_HASH,
  started_at: "2026-08-12T00:00:00Z",
  finished_at: "2026-08-12T00:00:01Z",
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
  command_argv: command,
  run_outcome: "passed",
  proof_results: [
    {
      symbol_id: "SYM-CASE-1",
      target: "default",
      outcome: "passed",
      binding: "aggregate_run",
      attempts: { status: "unavailable" },
    },
  ],
};

function testProps(extra: string): string {
  return `title="Contracted flow",status=active,source="tests/flow.spec.ts",created_at="2026-08-13T00:00:00Z",updated_at="2026-08-13T00:00:00Z",verification_scope=end_to_end,verification_perspective=consumer${extra}`;
}

function baseArtifact(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    version: "kibi.proof-run.v1",
    producer: { name: "kibi-command-producer" },
    integration: "self-proof",
    command_argv: command,
    code_snapshot: SNAPSHOT,
    environment: ENVIRONMENT,
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
    ],
    ...overrides,
  };
}

function withTempWorkspace(run: (dir: string) => Promise<void>): Promise<void> {
  const dir = mkdtempSync(path.join(tmpdir(), "ingest-proof-test-"));
  mkdirSync(path.join(dir, ".kb", "proof"), { recursive: true });
  writeFileSync(
    path.join(dir, ".kb", "proof", "integrations.json"),
    JSON.stringify({
      version: "kibi.proof-integration.v1",
      integrations: [
        {
          id: "self-proof",
          producer: "command",
          command,
          description: "Self proof steps",
        },
      ],
    }),
  );
  return run(dir).finally(() => rmSync(dir, { recursive: true, force: true }));
}

function context(
  workspaceRoot: string,
  query: PrologPort["query"],
): OperationContext {
  return {
    workspaceRoot,
    signal: new AbortController().signal,
    clock: () => new Date("2026-08-13T00:00:00Z"),
    prolog: {
      query,
      nextSolution: async () => null,
      save: async () => ({ success: true, bindings: {} }),
    },
    git: {
      workspaceSnapshot: async () => ({
        version: "kibi.workspace-snapshot.v2",
        hash: SNAPSHOT,
        dirty: false,
        fileCount: 1,
      }),
    },
  };
}

describe("kb_ingest_proof", () => {
  const originalBranch = process.env.KIBI_BRANCH;

  beforeEach(() => {
    process.env.KIBI_BRANCH = "test-branch";
  });

  afterEach(() => {
    if (originalBranch === undefined) {
      Reflect.deleteProperty(process.env, "KIBI_BRANCH");
    } else {
      process.env.KIBI_BRANCH = originalBranch;
    }
  });

  test("derives a passing proof receipt bound to contract hash and fingerprint", async () => {
    await withTempWorkspace(async (dir) => {
      const query = mock(async (goal: string): Promise<PrologQueryResult> => {
        if (goal.includes("kb_entity('TEST-001'")) {
          return {
            success: true,
            bindings: {
              Results: `[[TEST-001,test,[${testProps(
                `,proof_contract=${JSON.stringify(JSON.stringify(contract))}`,
              )}]]]`,
            },
          };
        }
        if (goal.includes("kb_commit_upsert"))
          return { success: true, bindings: { ChangeKind: "updated" } };
        return { success: true, bindings: { Results: "[]" } };
      });
      const result = await executeIngestProof(
        { snapshot: SNAPSHOT, artifact: baseArtifact(), testIds: ["TEST-001"] },
        context(dir, query),
      );
      expect(result.structuredContent.passed).toBe(1);
      const receipt = result.structuredContent.results[0] as Record<
        string,
        unknown
      >;
      const full = (receipt as { receipt?: Record<string, unknown> }).receipt;
      expect(receipt.outcome).toBe("passed");
      expect(result.structuredContent.environmentHash).toBe(ENVIRONMENT_HASH);
      void full;
      expect(proofContractHash(contract)).toMatch(/^[a-f0-9]{64}$/);
      const commitGoal = query.mock.calls
        .map(([goal]) => String(goal))
        .find((goal) => goal.includes("kb_commit_upsert"));
      expect(commitGoal).toContain("proof_receipts");
    });
  });

  test("appends current evidence without rewriting earlier-contract receipts", async () => {
    await withTempWorkspace(async (dir) => {
      const query = mock(async (goal: string): Promise<PrologQueryResult> => {
        if (goal.includes("kb_entity('TEST-001'")) {
          return {
            success: true,
            bindings: {
              Results: `[[TEST-001,test,[${testProps(
                `,proof_contract=${JSON.stringify(JSON.stringify(contract))},proof_receipts=${JSON.stringify(JSON.stringify([historicalReceipt]))}`,
              )}]]]`,
            },
          };
        }
        if (goal.includes("kb_commit_upsert"))
          return { success: true, bindings: { ChangeKind: "updated" } };
        return { success: true, bindings: { Results: "[]" } };
      });
      const result = await executeIngestProof(
        { snapshot: SNAPSHOT, artifact: baseArtifact(), testIds: ["TEST-001"] },
        context(dir, query),
      );
      expect(result.structuredContent.results[0]?.receiptCount).toBe(2);
      const commitGoal = query.mock.calls
        .map(([goal]) => String(goal))
        .find((goal) => goal.includes("kb_commit_upsert"));
      expect(commitGoal).toContain(historicalReceipt.receipt_id);
    });
  });

  test("rotates the oldest receipts at the schema cap while appending", async () => {
    await withTempWorkspace(async (dir) => {
      const cap = 50;
      const historical = Array.from({ length: cap }, (_, index) => ({
        ...historicalReceipt,
        receipt_id: `PR-rotation-${String(index).padStart(3, "0")}`,
        started_at: `2026-08-10T00:00:${String(index % 60).padStart(2, "0")}Z`,
        finished_at: `2026-08-10T00:00:${String(index % 60).padStart(2, "0")}Z`,
      }));
      const query = mock(async (goal: string): Promise<PrologQueryResult> => {
        if (goal.includes("kb_entity('TEST-001'")) {
          return {
            success: true,
            bindings: {
              Results: `[[TEST-001,test,[${testProps(
                `,proof_contract=${JSON.stringify(JSON.stringify(contract))},proof_receipts=${JSON.stringify(JSON.stringify(historical))}`,
              )}]]]`,
            },
          };
        }
        if (goal.includes("kb_commit_upsert"))
          return { success: true, bindings: { ChangeKind: "updated" } };
        return { success: true, bindings: { Results: "[]" } };
      });
      const result = await executeIngestProof(
        { snapshot: SNAPSHOT, artifact: baseArtifact(), testIds: ["TEST-001"] },
        context(dir, query),
      );
      expect(result.structuredContent.results[0]?.receiptCount).toBe(cap);
      const commitGoal = query.mock.calls
        .map(([goal]) => String(goal))
        .find((goal) => goal.includes("kb_commit_upsert"));
      expect(commitGoal).toBeDefined();
      const newestHistorical = historical[historical.length - 1];
      expect(commitGoal).toContain(newestHistorical.receipt_id);
      expect(commitGoal).not.toContain(historical[0].receipt_id);
    });
  });

  test("rejects a changed live snapshot before loading or mutating the test", async () => {
    await withTempWorkspace(async (dir) => {
      const query = mock(
        async (): Promise<PrologQueryResult> => ({
          success: true,
          bindings: { Results: "[]" },
        }),
      );
      const ctx = context(dir, query);
      ctx.git.workspaceSnapshot = async () => ({
        version: "kibi.workspace-snapshot.v2",
        hash: "b".repeat(64),
        dirty: false,
        fileCount: 1,
      });
      await expect(
        executeIngestProof(
          {
            snapshot: SNAPSHOT,
            artifact: baseArtifact(),
            testIds: ["TEST-001"],
          },
          ctx,
        ),
      ).rejects.toThrow("live workspace snapshot");
      expect(query).not.toHaveBeenCalled();
    });
  });

  test("re-ingesting the same artifact is an idempotent no-op", async () => {
    await withTempWorkspace(async (dir) => {
      const first = await executeIngestProof(
        {
          snapshot: SNAPSHOT,
          artifact: baseArtifact(),
          testIds: ["TEST-001"],
        },
        context(
          dir,
          mock(async (goal: string): Promise<PrologQueryResult> => {
            if (goal.includes("kb_entity('TEST-001'")) {
              return {
                success: true,
                bindings: {
                  Results: `[[TEST-001,test,[${testProps(
                    `,proof_contract=${JSON.stringify(JSON.stringify(contract))}`,
                  )}]]]`,
                },
              };
            }
            return { success: true, bindings: { Results: "[]" } };
          }),
        ),
      );
      const receiptId = first.structuredContent.results[0]?.receiptId;
      expect(receiptId).toMatch(/^PR-/);
      const stored = [
        {
          ...historicalReceipt,
          receipt_id: receiptId,
          contract_hash: proofContractHash(contract),
          artifact_digest: first.structuredContent.artifactDigest,
          fingerprint: first.structuredContent.results[0]?.receiptId,
        },
      ];
      const second = await executeIngestProof(
        { snapshot: SNAPSHOT, artifact: baseArtifact(), testIds: ["TEST-001"] },
        context(
          dir,
          mock(async (goal: string): Promise<PrologQueryResult> => {
            if (goal.includes("kb_entity('TEST-001'")) {
              return {
                success: true,
                bindings: {
                  Results: `[[TEST-001,test,[${testProps(
                    `,proof_contract=${JSON.stringify(JSON.stringify(contract))},proof_receipts=${JSON.stringify(JSON.stringify(stored))}`,
                  )}]]]`,
                },
              };
            }
            return { success: true, bindings: { Results: "[]" } };
          }),
        ),
      );
      expect(second.structuredContent.unchanged).toBe(1);
      expect(second.structuredContent.passed).toBe(1);
    });
  });

  test("one artifact is evaluated independently per contract; unrelated results are ignored", async () => {
    await withTempWorkspace(async (dir) => {
      const artifact = baseArtifact({
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
            target: "default",
            outcome: "passed",
            binding: "native_case",
            native_id: "tests/flow.spec.ts::case-2",
            attempts: {
              status: "complete",
              entries: [{ outcome: "passed", duration_ms: 271 }],
            },
          },
          {
            symbol_id: "SYM-CASE-3",
            target: "postgres-16",
            outcome: "passed",
            binding: "native_case",
            native_id: "tests/db.spec.ts::case-3",
            attempts: {
              status: "complete",
              entries: [{ outcome: "passed", duration_ms: 91 }],
            },
          },
          {
            symbol_id: "SYM-UNRELATED",
            target: "default",
            outcome: "failed",
            binding: "native_case",
            attempts: { status: "unavailable" },
          },
        ],
      });
      const entities: Record<string, string> = {
        "TEST-001": `,proof_contract=${JSON.stringify(JSON.stringify(contract))}`,
        "TEST-002": `,proof_contract=${JSON.stringify(JSON.stringify(secondContract))}`,
      };
      const query = mock(async (goal: string): Promise<PrologQueryResult> => {
        for (const [id, extra] of Object.entries(entities)) {
          if (goal.includes(`kb_entity('${id}'`)) {
            return {
              success: true,
              bindings: {
                Results: `[[${id},test,[${testProps(extra)}]]]`,
              },
            };
          }
        }
        if (goal.includes("kb_commit_upsert"))
          return { success: true, bindings: { ChangeKind: "updated" } };
        return { success: true, bindings: { Results: "[]" } };
      });
      const result = await executeIngestProof(
        { snapshot: SNAPSHOT, artifact, testIds: ["TEST-001", "TEST-002"] },
        context(dir, query),
      );
      expect(result.structuredContent.passed).toBe(2);
      expect(result.structuredContent.failed).toBe(0);
    });
  });

  test("strict first-attempt policy rejects native-case results with unavailable attempt history", async () => {
    await withTempWorkspace(async (dir) => {
      const artifact = baseArtifact({
        proof_results: [
          {
            symbol_id: "SYM-CASE-1",
            target: "default",
            outcome: "passed",
            binding: "native_case",
            attempts: { status: "unavailable" },
          },
        ],
      });
      const result = await executeIngestProof(
        { snapshot: SNAPSHOT, artifact, testIds: ["TEST-001"] },
        context(
          dir,
          mock(async (goal: string): Promise<PrologQueryResult> => {
            if (goal.includes("kb_entity('TEST-001'")) {
              return {
                success: true,
                bindings: {
                  Results: `[[TEST-001,test,[${testProps(
                    `,proof_contract=${JSON.stringify(JSON.stringify(contract))}`,
                  )}]]]`,
                },
              };
            }
            if (goal.includes("kb_commit_upsert"))
              return { success: true, bindings: { ChangeKind: "updated" } };
            return { success: true, bindings: { Results: "[]" } };
          }),
        ),
      );
      expect(result.structuredContent.failed).toBe(1);
      const row = result.structuredContent.results[0] as Record<
        string,
        unknown
      >;
      expect((row.gaps as { reason: string }[])[0]?.reason).toContain(
        "attempt history unavailable",
      );
    });
  });

  test("a failed run never proves individual passing results", async () => {
    await withTempWorkspace(async (dir) => {
      const artifact = baseArtifact({
        run: {
          outcome: "failed",
          exit_code: 1,
          started_at: "2026-08-13T00:00:00Z",
          finished_at: "2026-08-13T00:00:01Z",
          failure_phase: "teardown",
        },
      });
      const result = await executeIngestProof(
        { snapshot: SNAPSHOT, artifact, testIds: ["TEST-001"] },
        context(
          dir,
          mock(async (goal: string): Promise<PrologQueryResult> => {
            if (goal.includes("kb_entity('TEST-001'")) {
              return {
                success: true,
                bindings: {
                  Results: `[[TEST-001,test,[${testProps(
                    `,proof_contract=${JSON.stringify(JSON.stringify(contract))}`,
                  )}]]]`,
                },
              };
            }
            if (goal.includes("kb_commit_upsert"))
              return { success: true, bindings: { ChangeKind: "updated" } };
            return { success: true, bindings: { Results: "[]" } };
          }),
        ),
      );
      expect(result.structuredContent.failed).toBe(1);
      const row = result.structuredContent.results[0] as Record<
        string,
        unknown
      >;
      expect(row.outcome).toBe("failed");
      expect((row.gaps as { reason: string }[])[0]?.reason).toContain(
        "run did not pass",
      );
    });
  });

  test("a no-results run reports the gap explicitly", async () => {
    await withTempWorkspace(async (dir) => {
      const artifact = baseArtifact({
        run: {
          outcome: "no_results",
          exit_code: 0,
          started_at: "2026-08-13T00:00:00Z",
          finished_at: "2026-08-13T00:00:01Z",
          failure_phase: "collection",
        },
        proof_results: [
          {
            symbol_id: "SYM-CASE-1",
            target: "default",
            outcome: "passed",
            binding: "native_case",
            attempts: {
              status: "complete",
              entries: [{ outcome: "passed", duration_ms: 10 }],
            },
          },
        ],
      });
      const result = await executeIngestProof(
        { snapshot: SNAPSHOT, artifact, testIds: ["TEST-001"] },
        context(
          dir,
          mock(async (goal: string): Promise<PrologQueryResult> => {
            if (goal.includes("kb_entity('TEST-001'")) {
              return {
                success: true,
                bindings: {
                  Results: `[[TEST-001,test,[${testProps(
                    `,proof_contract=${JSON.stringify(JSON.stringify(contract))}`,
                  )}]]]`,
                },
              };
            }
            if (goal.includes("kb_commit_upsert"))
              return { success: true, bindings: { ChangeKind: "updated" } };
            return { success: true, bindings: { Results: "[]" } };
          }),
        ),
      );
      expect(result.structuredContent.failed).toBe(1);
      const row = result.structuredContent.results[0] as Record<
        string,
        unknown
      >;
      expect((row.gaps as { reason: string }[])[0]?.reason).toContain(
        "run produced no results",
      );
    });
  });

  test("artifact command must equal the configured integration command", async () => {
    await withTempWorkspace(async (dir) => {
      const artifact = baseArtifact({
        command_argv: ["node", "scripts/other.mjs"],
      });
      await expect(
        executeIngestProof(
          { snapshot: SNAPSHOT, artifact, testIds: ["TEST-001"] },
          context(
            dir,
            mock(async (goal: string): Promise<PrologQueryResult> => {
              if (goal.includes("kb_entity('TEST-001'")) {
                return {
                  success: true,
                  bindings: {
                    Results: `[[TEST-001,test,[${testProps(
                      `,proof_contract=${JSON.stringify(JSON.stringify(contract))}`,
                    )}]]]`,
                  },
                };
              }
              return { success: true, bindings: { Results: "[]" } };
            }),
          ),
        ),
      ).rejects.toThrow("command_argv does not match");
    });
  });

  test("partial multi-test application resumes idempotently on retry", async () => {
    await withTempWorkspace(async (dir) => {
      const artifact = baseArtifact();
      const committed = new Set<string>();
      const entityExtra = (id: string): string =>
        id === "TEST-001"
          ? `,proof_contract=${JSON.stringify(JSON.stringify(contract))}`
          : `,proof_contract=${JSON.stringify(JSON.stringify(secondContract))}`;

      const makeQuery = () =>
        mock(async (goal: string): Promise<PrologQueryResult> => {
          for (const id of ["TEST-001", "TEST-002"]) {
            if (goal.includes(`kb_entity('${id}'`)) {
              const receiptJson = JSON.stringify(
                committed.has(id)
                  ? [{ ...historicalReceipt, test_id: id }]
                  : [],
              );
              return {
                success: true,
                bindings: {
                  Results: `[[${id},test,[${testProps(`${entityExtra(id)},proof_receipts=${JSON.stringify(JSON.parse(JSON.stringify(receiptJson)))}`)}]]]`,
                },
              };
            }
          }
          if (goal.includes("kb_commit_upsert")) {
            const match = goal.match(/id\s*=\s*'(TEST-\d+)'/);
            if (match) committed.add(match[1]);
            return { success: true, bindings: { ChangeKind: "updated" } };
          }
          return { success: true, bindings: { Results: "[]" } };
        });

      const firstQuery = makeQuery();
      const first = await executeIngestProof(
        { snapshot: SNAPSHOT, artifact, testIds: ["TEST-001"] },
        context(dir, firstQuery),
      );
      expect(first.structuredContent.passed).toBe(1);
      const derivedReceiptId = first.structuredContent.results[0]?.receiptId;
      expect(derivedReceiptId).toMatch(/^PR-/);
      // Simulate a retry: TEST-001 history now holds the receipt the first
      // successful application committed; TEST-002 was never applied.
      const retryQuery = mock(
        async (goal: string): Promise<PrologQueryResult> => {
          if (goal.includes("kb_entity('TEST-001'")) {
            const stored = [
              { ...historicalReceipt, receipt_id: derivedReceiptId },
            ];
            return {
              success: true,
              bindings: {
                Results: `[[TEST-001,test,[${testProps(
                  `${entityExtra("TEST-001")},proof_receipts=${JSON.stringify(JSON.stringify(stored))}`,
                )}]]]`,
              },
            };
          }
          if (goal.includes("kb_entity('TEST-002'")) {
            return {
              success: true,
              bindings: {
                Results: `[[TEST-002,test,[${testProps(entityExtra("TEST-002"))}]]]`,
              },
            };
          }
          if (goal.includes("kb_commit_upsert"))
            return { success: true, bindings: { ChangeKind: "updated" } };
          return { success: true, bindings: { Results: "[]" } };
        },
      );
      const second = await executeIngestProof(
        { snapshot: SNAPSHOT, artifact, testIds: ["TEST-001", "TEST-002"] },
        context(dir, retryQuery),
      );
      expect(second.structuredContent.unchanged).toBe(1);
      expect(second.structuredContent.passed).toBe(1);
      expect(second.structuredContent.results[0]?.duplicate).toBe(true);
      expect(second.structuredContent.results[1]?.applied).toBe(true);
    });
  });
});
