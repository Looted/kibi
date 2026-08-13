import { describe, expect, mock, test } from "bun:test";

import { executeIngestVerification } from "../../src/operations/verification/ingest-verification.js";
import type {
  OperationContext,
  PrologPort,
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
  test("derives a passing v2 receipt from a complete contracted artifact", async () => {
    const query = mock(async (goal: string) => {
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

  test("rejects a changed live snapshot before loading or mutating the test", async () => {
    const query = mock(async () => ({
      success: true,
      bindings: { Results: "[]" },
    }));
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
