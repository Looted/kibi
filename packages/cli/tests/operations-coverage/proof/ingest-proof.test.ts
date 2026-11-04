import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { MutationRollbackFailureError } from "../../../src/operations/mutation/saga.js";
import * as upsertModule from "../../../src/operations/mutation/upsert.js";
import { executeIngestProof } from "../../../src/operations/proof/ingest-proof.js";
import * as compaction from "../../../src/operations/proof/receipt-compaction.js";
import { nodeFilesystem } from "../../../src/public/operations/node-ports.js";
import type {
  FilesystemPort,
  OperationContext,
  PrologQueryResult,
} from "../../../src/public/operations/runtime-types.js";
import { scratch } from "../helpers.js";

const SNAPSHOT = "a".repeat(64);
const command = ["node", "scripts/run-proof-step.mjs"];
const contract = {
  version: "kibi.proof-contract.v1",
  integration: "self-proof",
  required_proofs: [{ symbol_id: "SYM-CASE-1", target: "default" }],
  success_policy: "all_required_first_attempt",
};
const SOURCE = ".kb/tests/TEST-1.md";
const AUTHORED = [
  "---",
  "id: TEST-1",
  'title: "Contracted flow"',
  "status: active",
  "verification_scope: end_to_end",
  "proof_contract:",
  "  version: kibi.proof-contract.v1",
  "  integration: self-proof",
  "  required_proofs:",
  "    - symbol_id: SYM-CASE-1",
  "      target: default",
  "  success_policy: all_required_first_attempt",
  "proof_receipts: []",
  "---",
  "Authored body.",
  "",
].join("\n");

const spies: { mockRestore: () => void }[] = [];
const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const cleanup of cleanups.splice(0)) cleanup();
});

function artifact(fields: Record<string, unknown> = {}) {
  return {
    version: "kibi.proof-run.v1",
    producer: { name: "kibi-command-producer" },
    integration: "self-proof",
    command_argv: command,
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
    ],
    ...fields,
  };
}

function setup(
  options: {
    bindings?: Record<string, unknown>[];
    commit?: () => PrologQueryResult;
    fs?: (base: FilesystemPort) => FilesystemPort;
  } = {},
) {
  const workspace = scratch({
    ".kb/proof/integrations.json": JSON.stringify({
      version: "kibi.proof-integration.v1",
      integrations: [{ id: "self-proof", producer: "command", command }],
    }),
    [SOURCE]: AUTHORED,
  });
  cleanups.push(workspace.cleanup);
  const query = async (goal: string): Promise<PrologQueryResult> => {
    if (goal.includes("kb_commit_upsert"))
      return (
        options.commit?.() ?? {
          success: true,
          bindings: { ChangeKind: "updated" },
        }
      );
    if (goal.includes("kb_entity('TEST-1'"))
      return {
        success: true,
        bindings: {
          Results: `[[TEST-1,test,[id='TEST-1',title="Contracted flow",status=active,source="${SOURCE}",created_at="2026-08-13T00:00:00Z",updated_at="2026-08-13T00:00:00Z",verification_scope=end_to_end,proof_contract=${JSON.stringify(JSON.stringify(contract))},proof_receipts=[]${options.bindings ? `,proof_bindings=${JSON.stringify(JSON.stringify(options.bindings))}` : ""}]]]`,
        },
      };
    return { success: true, bindings: { Results: "[]" } };
  };
  const context: OperationContext = {
    workspaceRoot: workspace.root,
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
    fs: options.fs ? options.fs(nodeFilesystem) : nodeFilesystem,
    branchAttachment: {
      gitBranch: "develop",
      kbBranch: "develop",
      storePath: path.join(workspace.root, ".kb", "branches", "develop"),
      kind: "exact",
      migrationRequired: false,
    },
  } as OperationContext;
  const lockPath = path.join(
    workspace.root,
    ".kb",
    "recovery",
    "source-authoring.lock",
  );
  return {
    context,
    ingest: (fields: Record<string, unknown> = {}) =>
      executeIngestProof(
        { snapshot: SNAPSHOT, artifact: artifact(fields), testIds: ["TEST-1"] },
        context,
      ),
    authored: () => readFileSync(path.join(workspace.root, SOURCE), "utf8"),
    lockHeld: () => existsSync(lockPath),
  };
}

/** Wrap the real upsert so the deferred commit it prepares can be changed. */
function changeDeferred(
  change: (deferred: Record<string, unknown>) => Record<string, unknown> | undefined,
) {
  const real = upsertModule.executeUpsert;
  spies.push(
    spyOn(upsertModule, "executeUpsert").mockImplementation(
      async (...args: Parameters<typeof real>) => {
        const result = await real(...args);
        const content = result.structuredContent as Record<string, unknown>;
        const deferred = content.deferredCommit as Record<string, unknown>;
        return {
          ...result,
          structuredContent: {
            ...content,
            deferredCommit: change(deferred),
          },
        } as Awaited<ReturnType<typeof real>>;
      },
    ),
  );
}

const failedCommit = () => ({
  success: false,
  bindings: {},
  error: "commit refused",
});

describe("executeIngestProof", () => {
  test("refuses a native result without a native_id", async () => {
    await expect(
      setup().ingest({
        proof_results: [
          {
            symbol_id: "SYM-CASE-1",
            target: "default",
            outcome: "passed",
            binding: "native_case",
            attempts: {
              status: "complete",
              entries: [{ outcome: "passed", duration_ms: 1 }],
            },
          },
        ],
      }),
    ).rejects.toThrow(
      "Proof ingest failed: test TEST-1 native_case result SYM-CASE-1/default has no native_id",
    );
  });

  test("matches a native result to its own binding", async () => {
    const native = {
      proof_results: [
        {
          symbol_id: "SYM-CASE-1",
          target: "default",
          outcome: "passed",
          binding: "native_case",
          native_id: "case-1",
          attempts: {
            status: "complete",
            entries: [{ outcome: "passed", duration_ms: 1 }],
          },
        },
      ],
    };
    const bound = setup({
      bindings: [
        { symbol_id: "SYM-OTHER", target: "default", native_id: "other" },
        { symbol_id: "SYM-CASE-1", target: "default", native_id: "case-1" },
      ],
    });
    expect((await bound.ingest(native)).structuredContent?.passed).toBe(1);
    await expect(
      setup({
        bindings: [
          { symbol_id: "SYM-CASE-1", target: "postgres", native_id: "case-1" },
        ],
      }).ingest(native),
    ).rejects.toThrow(
      "Proof ingest failed: test TEST-1 native_case result SYM-CASE-1/default has no matching proof_binding",
    );
  });

  test("ingests with a certificate for another test", async () => {
    const run = setup();
    const result = await run.ingest({
      certificates: [
        { version: "kibi.certificate.v1", kind: "typecheck", test_id: "TEST-2" },
      ],
    });
    expect(result.structuredContent?.passed).toBe(1);
    expect(run.authored()).toContain("receipt_id:");
  });

  test("writes the canonical document when the authored bytes cannot be read", async () => {
    // The receipt append reads the authored document before the upsert does.
    let refused = false;
    let upserting = false;
    const real = upsertModule.executeUpsert;
    spies.push(
      spyOn(upsertModule, "executeUpsert").mockImplementation((...args) => {
        upserting = true;
        return real(...args);
      }),
    );
    const run = setup({
      fs: (base) => ({
        ...base,
        readFile: async (file: string) => {
          if (!upserting && file.endsWith(SOURCE)) {
            refused = true;
            throw new Error("busy");
          }
          return base.readFile(file);
        },
      }),
    });
    expect((await run.ingest()).structuredContent?.passed).toBe(1);
    expect(refused).toBe(true);
    expect(run.authored()).toContain("receipt_id:");
  });

  test("refuses a compaction that drops the new receipt", async () => {
    spies.push(spyOn(compaction, "compactProofReceipts").mockImplementation(
        () => ({ kept: [] }) as never,
      ));
    const run = setup();
    await expect(run.ingest()).rejects.toThrow(
      "Proof ingest failed for TEST-1: receipt compaction must only drop superseded receipts",
    );
    expect(run.authored()).toBe(AUTHORED);
  });

  test("refuses an upsert that prepared no commit", async () => {
    changeDeferred(() => undefined);
    await expect(setup().ingest()).rejects.toThrow(
      "Proof ingest failed for TEST-1: receipt commit was not prepared",
    );
  });

  test("keeps the lock when an upsert could not undo its own writes", async () => {
    const failure = new MutationRollbackFailureError(
      [new Error("restore failed")],
      "restore failed",
      [],
    );
    spies.push(
      spyOn(upsertModule, "executeUpsert").mockRejectedValue(failure),
    );
    const run = setup();
    await expect(run.ingest()).rejects.toBe(failure);
    expect(run.lockHeld()).toBe(true);
  });

  test("keeps the lock when restoring an uncommitted receipt fails", async () => {
    changeDeferred((deferred) => ({
      ...deferred,
      rollback: async () => [{ step: "source", error: new Error("disk full") }],
    }));
    const run = setup({ commit: failedCommit });
    await expect(run.ingest()).rejects.toThrow(
      "Proof ingest failed and could not restore every uncommitted receipt source; the source mutation lock remains held for recovery (TEST-1:source)",
    );
    expect(run.lockHeld()).toBe(true);
  });

  test("reports a rollback that throws", async () => {
    changeDeferred((deferred) => ({
      ...deferred,
      rollback: async () => {
        throw new Error("rollback crashed");
      },
    }));
    const failure = await setup({ commit: failedCommit })
      .ingest()
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(AggregateError);
    expect((failure as AggregateError).message).toEndWith("(TEST-1:rollback)");
  });
});
