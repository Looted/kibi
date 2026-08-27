import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

import { executeIngestVerification } from "../../src/operations/verification/ingest-verification.js";
import type {
  OperationContext,
  PrologPort,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";
import { verificationContractHash } from "../../src/public/verification-receipt.js";

const contract = {
  version: "kibi.verification-contract.v1",
  runner: "playwright",
  command_argv: ["pnpm", "exec", "playwright", "test"],
  required_case_symbols: ["SYM-CASE-1"],
  required_projects: ["chromium"],
  success_policy: "all_required_cases_first_attempt",
};

function context(query: PrologPort["query"]): OperationContext {
  return {
    workspaceRoot: process.cwd(),
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
        hash: "a".repeat(64),
        dirty: false,
        fileCount: 1,
      }),
    },
  };
}

describe("kb_ingest_verification", () => {
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
  test("derives a passing v2 receipt from a complete contracted artifact", async () => {
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("kb_entity('TEST-001'")) {
        return {
          success: true,
          bindings: {
            Results: `[[TEST-001,test,[title="Contracted flow",status=active,source="tests/flow.spec.ts",created_at="2026-08-13T00:00:00Z",updated_at="2026-08-13T00:00:00Z",verification_scope=end_to_end,verification_perspective=consumer,verification_contract=${JSON.stringify(JSON.stringify(contract))}]]]`,
          },
        };
      }
      if (goal.includes("kb_commit_upsert"))
        return { success: true, bindings: { ChangeKind: "updated" } };
      return { success: true, bindings: { Results: "[]" } };
    });
    const result = await executeIngestVerification(
      {
        testId: "TEST-001",
        snapshot: "a".repeat(64),
        artifact: {
          version: "kibi.playwright-run.v1",
          runner: "playwright",
          command_argv: contract.command_argv,
          code_snapshot: "a".repeat(64),
          environment_hash: "b".repeat(64),
          started_at: "2026-08-13T00:00:00Z",
          finished_at: "2026-08-13T00:00:01Z",
          process_exit_code: 0,
          cases: [
            {
              symbol_id: "SYM-CASE-1",
              project: "chromium",
              outcome: "passed",
              retries: 0,
              duration_ms: 1000,
            },
          ],
        },
      },
      context(query),
    );
    expect(result.structuredContent.proofOutcome).toBe("passed");
    expect(result.structuredContent.receipt.version).toBe(
      "kibi.verification-receipt.v2",
    );
    expect(result.structuredContent.receipt.contract_hash).toBe(
      verificationContractHash(contract),
    );
  });

  test("appends current-contract evidence without rewriting earlier-contract receipts", async () => {
    const historicalReceipt = {
      version: "kibi.verification-receipt.v2",
      receipt_id: "VR-historical-contract-001",
      test_id: "TEST-001",
      runner: "playwright",
      command: "pnpm exec playwright test",
      command_argv: contract.command_argv,
      scope: "end_to_end",
      outcome: "passed",
      code_snapshot: "a".repeat(64),
      environment_hash: "b".repeat(64),
      started_at: "2026-08-12T00:00:00Z",
      finished_at: "2026-08-12T00:00:01Z",
      artifact_digest: "c".repeat(64),
      contract_hash: "d".repeat(64),
      case_results: [
        {
          symbol_id: "SYM-CASE-1",
          project: "chromium",
          outcome: "passed",
          retries: 0,
          duration_ms: 1000,
        },
      ],
    };
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("kb_entity('TEST-001'")) {
        return {
          success: true,
          bindings: {
            Results: `[[TEST-001,test,[title="Contracted flow",status=active,source="tests/flow.spec.ts",created_at="2026-08-13T00:00:00Z",updated_at="2026-08-13T00:00:00Z",verification_scope=end_to_end,verification_perspective=consumer,verification_contract=${JSON.stringify(JSON.stringify(contract))},verification_receipts=${JSON.stringify(JSON.stringify([historicalReceipt]))}]]]`,
          },
        };
      }
      if (goal.includes("kb_commit_upsert"))
        return { success: true, bindings: { ChangeKind: "updated" } };
      return { success: true, bindings: { Results: "[]" } };
    });

    const result = await executeIngestVerification(
      {
        testId: "TEST-001",
        snapshot: "a".repeat(64),
        artifact: {
          version: "kibi.playwright-run.v1",
          runner: "playwright",
          command_argv: contract.command_argv,
          code_snapshot: "a".repeat(64),
          environment_hash: "b".repeat(64),
          started_at: "2026-08-13T00:00:00Z",
          finished_at: "2026-08-13T00:00:01Z",
          process_exit_code: 0,
          cases: [
            {
              symbol_id: "SYM-CASE-1",
              project: "chromium",
              outcome: "passed",
              retries: 0,
              duration_ms: 1000,
            },
          ],
        },
      },
      context(query),
    );

    expect(result.structuredContent.receiptCount).toBe(2);
    expect(result.structuredContent.receipt.contract_hash).toBe(
      verificationContractHash(contract),
    );
    const commitGoal = query.mock.calls
      .map(([goal]) => String(goal))
      .find((goal) => goal.includes("kb_commit_upsert"));
    expect(commitGoal).toContain(historicalReceipt.receipt_id);
    expect(commitGoal).toContain(historicalReceipt.contract_hash);
  });

  test("rejects a changed live snapshot before loading or mutating the test", async () => {
    const query = mock(
      async (): Promise<PrologQueryResult> => ({
        success: true,
        bindings: { Results: "[]" },
      }),
    );
    await expect(
      executeIngestVerification(
        {
          testId: "TEST-001",
          snapshot: "b".repeat(64),
          artifact: {
            version: "kibi.playwright-run.v1",
            code_snapshot: "b".repeat(64),
          },
        },
        context(query),
      ),
    ).rejects.toThrow("live workspace snapshot");
    expect(query).not.toHaveBeenCalled();
  });
});
