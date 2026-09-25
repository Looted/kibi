import { afterEach, describe, expect, spyOn, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as upsertModule from "../../src/operations/mutation/upsert.js";
import { executeMigrateLegacyReceipts } from "../../src/operations/proof/migrate-legacy-receipts.js";
import { executePruneReceipts } from "../../src/operations/proof/prune-receipts.js";
import * as discovery from "../../src/public/operations/discovery-entities.js";
import type {
  OperationContext,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";

const restores: Array<() => void> = [];
const scratchDirs: string[] = [];

afterEach(() => {
  while (restores.length > 0) restores.pop()?.();
  while (scratchDirs.length > 0) {
    const dir = scratchDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

function scratchWorkspace(document: string): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-maintenance-op-"));
  scratchDirs.push(root);
  mkdirSync(join(root, ".kb", "tests"), { recursive: true });
  writeFileSync(join(root, ".kb", "tests", "TEST-MAINT.md"), document, "utf8");
  return root;
}

const PROOF_CONTRACT = {
  version: "kibi.proof-contract.v1",
  integration: "self-proof",
  required_proofs: [{ symbol_id: "SYM-X", target: "default" }],
  success_policy: "all_required_first_attempt",
} as const;

function receiptBlock(
  receiptId: string,
  finishedAt: string,
): Record<string, unknown> {
  return {
    version: "kibi.proof-receipt.v1",
    receipt_id: receiptId,
    test_id: "TEST-MAINT",
    scope: "end_to_end",
    outcome: "passed",
    code_snapshot: "a".repeat(64),
    environment_hash: "b".repeat(64),
    started_at: "2026-01-01T00:00:00.000Z",
    finished_at: finishedAt,
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
    integration_id: "command",
    producer: { name: "kibi-command-producer" },
    command_argv: ["node", "--test", "t.js"],
    run_outcome: "passed",
    proof_results: [
      {
        symbol_id: "SYM-X",
        target: "default",
        outcome: "passed",
        binding: "aggregate_run",
        attempts: { status: "unavailable" },
      },
    ],
  };
}

function contextWith(extras: Partial<OperationContext> = {}): OperationContext {
  return {
    workspaceRoot: "/ws",
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-19T00:00:00Z"),
    prolog: {
      query: async (): Promise<PrologQueryResult> => ({
        success: true,
        bindings: {},
      }),
    } as never,
    fs: {
      readFile: async (path: string) => readFileSync(path, "utf8"),
    } as never,
    ...extras,
  };
}

function migrateTestEntity(extras: Record<string, unknown> = {}) {
  return {
    id: "TEST-MAINT",
    type: "test",
    title: "Maintenance fixture",
    status: "passing",
    source: ".kb/tests/TEST-MAINT.md",
    proof_contract: { ...PROOF_CONTRACT },
    ...extras,
  };
}

const LEGACY_DOC = `---
id: TEST-MAINT
title: Maintenance fixture
status: passing
proof_contract:
  version: kibi.proof-contract.v1
verification_receipts:
  - snapshot: aaaa
    outcome: passed
links: []
---

Body.
`;

const CLEAN_DOC = LEGACY_DOC.replace(/verification_receipts:\n( {2}.*\n)+/, "");

describe("executeMigrateLegacyReceipts authored-document flow", () => {
  test("splices the legacy block from a proof-contract test document", async () => {
    const workspaceRoot = scratchWorkspace(LEGACY_DOC);
    const loadEntities = spyOn(discovery, "loadEntities").mockResolvedValue([
      migrateTestEntity(),
    ] as never);
    restores.push(() => loadEntities.mockRestore());
    const executeUpsert = spyOn(
      upsertModule,
      "executeUpsert",
    ).mockResolvedValue({} as never);
    restores.push(() => executeUpsert.mockRestore());

    const result = await executeMigrateLegacyReceipts(
      {},
      contextWith({ workspaceRoot }),
    );

    expect(result.structuredContent.migrated).toBe(1);
    expect(result.structuredContent.tests).toEqual([{ testId: "TEST-MAINT" }]);
    const [, , options] = executeUpsert.mock.calls[0] as unknown as [
      unknown,
      unknown,
      { sourceDocumentOverride?: string },
    ];
    expect(options.sourceDocumentOverride).not.toContain(
      "verification_receipts",
    );
    expect(options.sourceDocumentOverride).toContain("proof_contract");
    expect(options.sourceDocumentOverride).toContain("Body.");
  });

  test("leaves documents without the legacy block untouched", async () => {
    const workspaceRoot = scratchWorkspace(CLEAN_DOC);
    const loadEntities = spyOn(discovery, "loadEntities").mockResolvedValue([
      migrateTestEntity(),
    ] as never);
    restores.push(() => loadEntities.mockRestore());
    const executeUpsert = spyOn(
      upsertModule,
      "executeUpsert",
    ).mockResolvedValue({} as never);
    restores.push(() => executeUpsert.mockRestore());

    const result = await executeMigrateLegacyReceipts(
      {},
      contextWith({ workspaceRoot }),
    );

    expect(result.structuredContent.migrated).toBe(0);
    expect(executeUpsert).not.toHaveBeenCalled();
  });

  test("skips legacy blocks on tests without a proof contract", async () => {
    const workspaceRoot = scratchWorkspace(LEGACY_DOC);
    const loadEntities = spyOn(discovery, "loadEntities").mockResolvedValue([
      migrateTestEntity({
        proof_contract: null,
        verification_receipts: [{ outcome: "passed" }],
      }),
    ] as never);
    restores.push(() => loadEntities.mockRestore());
    const executeUpsert = spyOn(
      upsertModule,
      "executeUpsert",
    ).mockResolvedValue({} as never);
    restores.push(() => executeUpsert.mockRestore());

    const result = await executeMigrateLegacyReceipts(
      {},
      contextWith({ workspaceRoot }),
    );

    expect(result.structuredContent.migrated).toBe(0);
    expect(executeUpsert).not.toHaveBeenCalled();
  });

  test("fails loudly when a compiled legacy lane has no patchable document", async () => {
    const workspaceRoot = scratchWorkspace(LEGACY_DOC);
    const loadEntities = spyOn(discovery, "loadEntities").mockResolvedValue([
      migrateTestEntity({
        verification_receipts: [{ outcome: "passed" }],
        source: "tests/maint.test.ts",
      }),
    ] as never);
    restores.push(() => loadEntities.mockRestore());

    await expect(
      executeMigrateLegacyReceipts({}, contextWith({ workspaceRoot })),
    ).rejects.toThrow(/is not an authored markdown document/);
  });

  test("fails when a compiled legacy lane points at a non-frontmatter document", async () => {
    const workspaceRoot = scratchWorkspace("no frontmatter\n");
    const loadEntities = spyOn(discovery, "loadEntities").mockResolvedValue([
      migrateTestEntity({ verification_receipts: [{ outcome: "passed" }] }),
    ] as never);
    restores.push(() => loadEntities.mockRestore());

    await expect(
      executeMigrateLegacyReceipts({}, contextWith({ workspaceRoot })),
    ).rejects.toThrow(/is not a patchable frontmatter document/);
  });
});

describe("executePruneReceipts history flow", () => {
  test("shrinks a passing history to the newest receipts through the prune carve-out", async () => {
    const loadEntities = spyOn(discovery, "loadEntities").mockResolvedValue([
      migrateTestEntity({
        verification_scope: "end_to_end",
        proof_receipts: [
          receiptBlock("PR-00000001", "2026-01-01T00:00:01.000Z"),
          receiptBlock("PR-00000002", "2026-01-02T00:00:01.000Z"),
          receiptBlock("PR-00000003", "2026-01-03T00:00:01.000Z"),
        ],
      }),
    ] as never);
    restores.push(() => loadEntities.mockRestore());
    const executeUpsert = spyOn(
      upsertModule,
      "executeUpsert",
    ).mockResolvedValue({} as never);
    restores.push(() => executeUpsert.mockRestore());

    const result = await executePruneReceipts({ keep: 2 }, contextWith());

    expect(result.structuredContent.pruned).toBe(1);
    expect(result.structuredContent.tests).toEqual([
      { testId: "TEST-MAINT", before: 3, after: 2, pruned: 1 },
    ]);
    const [payload, , options] = executeUpsert.mock.calls[0] as unknown as [
      { properties: { proof_receipts: { receipt_id: string }[] } },
      unknown,
      { allowReceiptsPrune?: boolean },
    ];
    expect(payload.properties.proof_receipts.map((r) => r.receipt_id)).toEqual([
      "PR-00000002",
      "PR-00000003",
    ]);
    expect(options.allowReceiptsPrune).toBe(true);
  });

  test("keeps histories within the keep window untouched", async () => {
    const loadEntities = spyOn(discovery, "loadEntities").mockResolvedValue([
      migrateTestEntity({
        verification_scope: "end_to_end",
        proof_receipts: [
          receiptBlock("PR-00000001", "2026-01-01T00:00:01.000Z"),
        ],
      }),
    ] as never);
    restores.push(() => loadEntities.mockRestore());
    const executeUpsert = spyOn(
      upsertModule,
      "executeUpsert",
    ).mockResolvedValue({} as never);
    restores.push(() => executeUpsert.mockRestore());

    const result = await executePruneReceipts({ keep: 1 }, contextWith());

    expect(result.structuredContent.pruned).toBe(0);
    expect(executeUpsert).not.toHaveBeenCalled();
  });

  test("refuses to prune a history whose remainder would be invalid", async () => {
    const duplicate = receiptBlock(
      "PR-00000002",
      "2026-01-02T00:00:01.000Z",
    ) as Record<string, unknown>;
    const invalidHistory = [
      receiptBlock("PR-00000001", "2026-01-01T00:00:01.000Z"),
      { ...duplicate, test_id: "TEST-OTHER" },
    ];
    const loadEntities = spyOn(discovery, "loadEntities").mockResolvedValue([
      migrateTestEntity({
        verification_scope: "end_to_end",
        proof_receipts: invalidHistory,
      }),
    ] as never);
    restores.push(() => loadEntities.mockRestore());

    await expect(
      executePruneReceipts({ keep: 1 }, contextWith()),
    ).rejects.toThrow(/pruned history is invalid/);
  });
});
