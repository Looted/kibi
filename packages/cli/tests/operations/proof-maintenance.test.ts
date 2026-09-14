import { describe, expect, test } from "bun:test";
import { executeMigrateLegacyReceipts } from "../../src/operations/proof/migrate-legacy-receipts.js";
import { executePruneReceipts } from "../../src/operations/proof/prune-receipts.js";
import type {
  OperationContext,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";

function contextWith(extras: Partial<OperationContext> = {}): OperationContext {
  return {
    workspaceRoot: "/ws",
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-07T00:00:00Z"),
    ...extras,
  };
}

describe("executePruneReceipts guards", () => {
  test("requires a Prolog runtime and a filesystem-capable context", async () => {
    await expect(
      executePruneReceipts({ keep: 1 }, contextWith()),
    ).rejects.toThrow(/requires a Prolog runtime/);
    await expect(
      executePruneReceipts(
        { keep: 1 },
        contextWith({
          prolog: {
            query: async () => ({ success: true, bindings: {} }),
          } as never,
        }),
      ),
    ).rejects.toThrow(/filesystem-capable runtime/);
  });

  test("validates the keep window", async () => {
    await expect(
      executePruneReceipts(
        { keep: 0 },
        contextWith({
          prolog: {
            query: async () => ({ success: true, bindings: {} }),
          } as never,
          fs: {},
        } as never as OperationContext),
      ),
    ).rejects.toThrow(/keep must be an integer between 1 and 50/);
    await expect(
      executePruneReceipts(
        { keep: 51 },
        contextWith({
          prolog: {
            query: async () => ({ success: true, bindings: {} }),
          } as never,
          fs: {},
        } as never as OperationContext),
      ),
    ).rejects.toThrow(/keep must be an integer between 1 and 50/);
  });

  test("fails when an explicitly selected test does not exist", async () => {
    const query = async (): Promise<PrologQueryResult> => ({
      success: true,
      bindings: { Results: "[]" },
    });
    await expect(
      executePruneReceipts(
        { keep: 1, testId: "TEST-MISSING" },
        contextWith({
          prolog: { query } as never,
          fs: {},
        } as never as OperationContext),
      ),
    ).rejects.toThrow(/test TEST-MISSING was not found/);
  });
});

describe("executeMigrateLegacyReceipts guards", () => {
  test("requires a Prolog runtime and a filesystem-capable context", async () => {
    await expect(
      executeMigrateLegacyReceipts({}, contextWith()),
    ).rejects.toThrow(/requires a Prolog runtime/);
    await expect(
      executeMigrateLegacyReceipts(
        {},
        contextWith({
          prolog: {
            query: async () => ({ success: true, bindings: {} }),
          } as never,
        }),
      ),
    ).rejects.toThrow(/filesystem-capable runtime/);
  });

  test("fails when an explicitly selected test does not exist", async () => {
    const query = async (): Promise<PrologQueryResult> => ({
      success: true,
      bindings: { Results: "[]" },
    });
    await expect(
      executeMigrateLegacyReceipts(
        { testId: "TEST-MISSING" },
        contextWith({
          prolog: { query } as never,
          fs: {},
        } as never as OperationContext),
      ),
    ).rejects.toThrow(/test TEST-MISSING was not found/);
  });
});
