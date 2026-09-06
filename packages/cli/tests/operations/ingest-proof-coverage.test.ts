// implements REQ-014
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

const SNAPSHOT = "a".repeat(64);
const command = ["node", "scripts/run-proof-step.mjs"];
const contract = {
  version: "kibi.proof-contract.v1",
  integration: "self-proof",
  required_proofs: [{ symbol_id: "SYM-CASE-1", target: "default" }],
  success_policy: "all_required_first_attempt",
} as const;

function artifact(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: "kibi.proof-run.v1",
    producer: { name: "kibi-command-producer" },
    integration: "self-proof",
    command_argv: command,
    code_snapshot: SNAPSHOT,
    environment: { os: "linux", arch: "x86_64", runtime: { name: "node", version: "v24" } },
    run: {
      outcome: "failed",
      exit_code: 1,
      started_at: "2026-08-13T00:00:00Z",
      finished_at: "2026-08-13T00:00:01Z",
    },
    proof_results: [
      {
        symbol_id: "SYM-CASE-1",
        target: "default",
        outcome: "failed",
        binding: "aggregate_run",
        attempts: { status: "unavailable" },
      },
    ],
    ...overrides,
  };
}

function writeIntegrations(dir: string): void {
  mkdirSync(path.join(dir, ".kb", "proof"), { recursive: true });
  writeFileSync(
    path.join(dir, ".kb", "proof", "integrations.json"),
    JSON.stringify({
      version: "kibi.proof-integration.v1",
      integrations: [{ id: "self-proof", producer: "command", command }],
    }),
  );
}

function context(
  workspaceRoot: string,
  query: PrologPort["query"],
  extras: Partial<OperationContext> = {},
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
    ...extras,
  };
}

const workspaces: string[] = [];
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
  while (workspaces.length > 0) {
    const dir = workspaces.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("executeIngestProof guards and selection", () => {
  test("rejects missing runtime, snapshot, artifact, and workspace mismatches", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "kibi-ingest-cov-"));
    workspaces.push(dir);
    writeIntegrations(dir);
    await expect(
      executeIngestProof(
        { snapshot: SNAPSHOT, artifact: artifact() },
        {
          workspaceRoot: dir,
          signal: new AbortController().signal,
          clock: () => new Date(),
        },
      ),
    ).rejects.toThrow(/Prolog runtime/);
    await expect(
      executeIngestProof(
        { snapshot: "  ", artifact: artifact() },
        context(dir, async () => ({ success: true, bindings: {} })),
      ),
    ).rejects.toThrow(/snapshot must be non-empty/);
    await expect(
      executeIngestProof(
        { snapshot: SNAPSHOT, artifact: [] as never },
        context(dir, async () => ({ success: true, bindings: {} })),
      ),
    ).rejects.toThrow(/artifact must be/);
    await expect(
      executeIngestProof(
        { snapshot: SNAPSHOT, artifact: { version: "nope" } },
        context(dir, async () => ({ success: true, bindings: {} })),
      ),
    ).rejects.toThrow(/Proof ingest failed:/);
    await expect(
      executeIngestProof(
        { snapshot: SNAPSHOT, artifact: artifact() },
        context(dir, async () => ({ success: true, bindings: {} }), {
          git: {
            workspaceSnapshot: async () => {
              throw new Error("snapshot unavailable");
            },
          },
        }),
      ),
    ).rejects.toThrow(/snapshot unavailable/);
    await expect(
      executeIngestProof(
        { snapshot: "b".repeat(64), artifact: artifact({ code_snapshot: "b".repeat(64) }) },
        context(dir, async () => ({ success: true, bindings: {} })),
      ),
    ).rejects.toThrow(/not the live workspace snapshot/);
    await expect(
      executeIngestProof(
        { snapshot: SNAPSHOT, artifact: artifact({ code_snapshot: "b".repeat(64) }) },
        context(dir, async () => ({ success: true, bindings: {} })),
      ),
    ).rejects.toThrow(/code_snapshot does not match/);
  });

  test("rejects duplicate testIds, missing integration selection, and missing integrations file", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "kibi-ingest-ids-"));
    workspaces.push(dir);
    await expect(
      executeIngestProof(
        {
          snapshot: SNAPSHOT,
          artifact: artifact(),
          testIds: ["TEST-1", "TEST-1"],
        },
        context(dir, async () => ({ success: true, bindings: {} })),
      ),
    ).rejects.toThrow(/duplicates/);
    const { integration: _ignored, ...noIntegration } = artifact();
    await expect(
      executeIngestProof(
        { snapshot: SNAPSHOT, artifact: noIntegration },
        context(dir, async () => ({ success: true, bindings: {} })),
      ),
    ).rejects.toThrow(/provide testIds/);
    await expect(
      executeIngestProof(
        { snapshot: SNAPSHOT, artifact: artifact() },
        context(dir, async () => ({ success: true, bindings: {} })),
      ),
    ).rejects.toThrow(/integrations/);
  });

  test("selects contracted tests by integration and rejects missing/mismatched bindings", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "kibi-ingest-select-"));
    workspaces.push(dir);
    writeIntegrations(dir);
    await expect(
      executeIngestProof(
        { snapshot: SNAPSHOT, artifact: artifact(), testIds: ["TEST-MISSING"] },
        context(dir, async () => ({ success: true, bindings: { Results: "[]" } })),
      ),
    ).rejects.toThrow(/was not found/);

    await expect(
      executeIngestProof(
        { snapshot: SNAPSHOT, artifact: artifact() },
        context(dir, async () => ({
          success: true,
          bindings: {
            Results:
              "[[TEST-OTHER,test,[id='TEST-OTHER',proof_contract=json('{\"version\":\"kibi.proof-contract.v1\",\"integration\":\"other\",\"required_proofs\":[{\"symbol_id\":\"SYM-1\",\"target\":\"default\"}],\"success_policy\":\"all_required_first_attempt\"}')]]]",
          },
        })),
      ),
    ).rejects.toThrow(/no tests declare/);

    await expect(
      executeIngestProof(
        { snapshot: SNAPSHOT, artifact: artifact(), testIds: ["TEST-1"] },
        context(dir, async (goal) => {
          if (String(goal).includes("kb_entity('TEST-1'")) {
            return {
              success: true,
              bindings: {
                Results:
                  "[[TEST-1,test,[id='TEST-1',proof_contract=json('{\"version\":\"old\",\"integration\":\"self-proof\",\"required_proofs\":[],\"success_policy\":\"all_required_first_attempt\"}')]]]",
              },
            };
          }
          return { success: true, bindings: { Results: "[]" } };
        }),
      ),
    ).rejects.toThrow(/no proof_contract/);

    await expect(
      executeIngestProof(
        { snapshot: SNAPSHOT, artifact: artifact(), testIds: ["TEST-1"] },
        context(dir, async (goal) => {
          if (String(goal).includes("kb_entity('TEST-1'")) {
            return {
              success: true,
              bindings: {
                Results: `[[TEST-1,test,[id='TEST-1',proof_contract=${JSON.stringify(JSON.stringify(contract))},proof_bindings=json('{"nope":true}')]]]`,
              },
            };
          }
          return { success: true, bindings: { Results: "[]" } };
        }),
      ),
    ).rejects.toThrow(/proof_bindings must be an array/);
  });

  test("treats duplicate receipts as unchanged failed evidence", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "kibi-ingest-dup-"));
    workspaces.push(dir);
    writeIntegrations(dir);
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("kb_entity('TEST-1'")) {
        return {
          success: true,
          bindings: {
            Results: `[[TEST-1,test,[id='TEST-1',title="Contracted flow",status=active,verification_scope=end_to_end,proof_contract=${JSON.stringify(JSON.stringify(contract))}]]]`,
          },
        };
      }
      if (goal.includes("kb_commit_upsert")) {
        return { success: true, bindings: { ChangeKind: "updated" } };
      }
      return { success: true, bindings: { Results: "[]" } };
    });
    const first = await executeIngestProof(
      { snapshot: SNAPSHOT, artifact: artifact(), testIds: ["TEST-1"] },
      context(dir, query),
    );
    expect(first.structuredContent.failed).toBe(1);
    expect(first.content[0]?.text).toContain("No passing proof");

    const receiptId = first.structuredContent.results[0]?.receiptId;
    const duplicate = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("kb_entity('TEST-1'")) {
        return {
          success: true,
          bindings: {
            Results: `[[TEST-1,test,[id='TEST-1',title="Contracted flow",status=active,verification_scope=end_to_end,proof_contract=${JSON.stringify(JSON.stringify(contract))},proof_receipts=${JSON.stringify(
              JSON.stringify([{ receipt_id: receiptId }]),
            )}]]]`,
          },
        };
      }
      return { success: true, bindings: { Results: "[]" } };
    });
    const second = await executeIngestProof(
      { snapshot: SNAPSHOT, artifact: artifact(), testIds: ["TEST-1"] },
      context(dir, duplicate),
    );
    expect(second.structuredContent.unchanged).toBe(1);
    expect(second.structuredContent.results[0]?.duplicate).toBe(true);
    expect(second.content[0]?.text).toContain("unchanged");
  });

  test("rejects integration mismatches and maps optional proof bindings", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "kibi-ingest-bind-"));
    workspaces.push(dir);
    writeIntegrations(dir);
    const otherContract = {
      ...contract,
      integration: "other-proof",
    };
    await expect(
      executeIngestProof(
        { snapshot: SNAPSHOT, artifact: artifact(), testIds: ["TEST-1"] },
        context(dir, async (goal) => {
          if (String(goal).includes("kb_entity('TEST-1'")) {
            return {
              success: true,
              bindings: {
                Results: `[[TEST-1,test,[id='TEST-1',title="Mismatched",status=active,verification_scope=end_to_end,proof_contract=${JSON.stringify(JSON.stringify(otherContract))}]]]`,
              },
            };
          }
          return { success: true, bindings: { Results: "[]" } };
        }),
      ),
    ).rejects.toThrow(/binds integration/);

    writeFileSync(
      path.join(dir, ".kb", "proof", "integrations.json"),
      JSON.stringify({
        version: "kibi.proof-integration.v1",
        integrations: [{ id: "other-proof", producer: "command", command }],
      }),
    );
    await expect(
      executeIngestProof(
        { snapshot: SNAPSHOT, artifact: artifact(), testIds: ["TEST-1"] },
        context(dir, async (goal) => {
          if (String(goal).includes("kb_entity('TEST-1'")) {
            return {
              success: true,
              bindings: {
                Results: `[[TEST-1,test,[id='TEST-1',title="Unknown integration",status=active,verification_scope=end_to_end,proof_contract=${JSON.stringify(JSON.stringify(contract))}]]]`,
              },
            };
          }
          return { success: true, bindings: { Results: "[]" } };
        }),
      ),
    ).rejects.toThrow(/is not configured/);

    writeIntegrations(dir);
    await expect(
      executeIngestProof(
        {
          snapshot: SNAPSHOT,
          artifact: artifact({ command_argv: ["node", "scripts/other.mjs"] }),
          testIds: ["TEST-1"],
        },
        context(dir, async (goal) => {
          if (String(goal).includes("kb_entity('TEST-1'")) {
            return {
              success: true,
              bindings: {
                Results: `[[TEST-1,test,[id='TEST-1',title="Command mismatch",status=active,verification_scope=end_to_end,proof_contract=${JSON.stringify(JSON.stringify(contract))}]]]`,
              },
            };
          }
          return { success: true, bindings: { Results: "[]" } };
        }),
      ),
    ).rejects.toThrow(/command_argv does not match/);

    const bindings = [
      {
        symbol_id: "SYM-CASE-1",
        target: "default",
        native_id: "case-1",
        aliases: ["alias-a"],
        source_file: "src/a.ts",
        line: 12,
      },
    ];
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("kb_entity('TEST-1'")) {
        return {
          success: true,
          bindings: {
            Results: `[[TEST-1,test,[id='TEST-1',title="Bound flow",status=active,verification_scope=end_to_end,proof_contract=${JSON.stringify(JSON.stringify(contract))},proof_bindings=${JSON.stringify(JSON.stringify(bindings))}]]]`,
          },
        };
      }
      if (goal.includes("kb_commit_upsert")) {
        return { success: true, bindings: { ChangeKind: "updated" } };
      }
      return { success: true, bindings: { Results: "[]" } };
    });
    const result = await executeIngestProof(
      { snapshot: SNAPSHOT, artifact: artifact(), testIds: ["TEST-1"] },
      context(dir, query),
    );
    expect(result.structuredContent.failed).toBe(1);
    expect(result.structuredContent.results[0]?.applied).toBe(true);
  });
});
