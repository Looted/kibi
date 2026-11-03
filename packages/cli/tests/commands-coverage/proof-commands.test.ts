import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { proofCompactCommand } from "../../src/commands/proof-compact.js";
import { proofMigrateLegacyCommand } from "../../src/commands/proof-migrate-legacy.js";
import { proofPruneCommand } from "../../src/commands/proof-prune.js";
import * as compact from "../../src/operations/proof/compact-receipts.js";
import * as migrateLegacy from "../../src/operations/proof/migrate-legacy-receipts.js";
import * as prune from "../../src/operations/proof/prune-receipts.js";
import * as cliRuntime from "../../src/runtime/cli-runtime.js";

type Closed = { status: string; result?: unknown; error?: unknown };

function fakeRuntime() {
  const closed: Closed[] = [];
  const afterSuccess: string[] = [];
  const runtime = {
    open: async () => ({ fake: true }),
    afterSuccess: async (spec: { name: string }) => {
      afterSuccess.push(spec.name);
    },
    close: async (_context: unknown, outcome: Closed) => {
      closed.push(outcome);
    },
  };
  spyOn(cliRuntime, "createCliRuntime").mockImplementation(
    () => runtime as never,
  );
  return { closed, afterSuccess };
}

function captureStdout(): string[] {
  const out: string[] = [];
  spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
    out.push(String(chunk));
    return true;
  });
  return out;
}

afterEach(() => {
  mock.restore();
});

describe("proof maintenance commands", () => {
  test("compact prints JSON when requested and closes successfully", async () => {
    const state = fakeRuntime();
    const structured = { tests: [], skipped: [] };
    spyOn(compact, "executeCompactReceipts").mockResolvedValue({
      content: [{ type: "text", text: "ignored" }],
      structuredContent: structured,
    } as never);
    const out = captureStdout();
    const result = await proofCompactCommand({ json: true });
    mock.restore();
    expect(result).toStrictEqual({ exitCode: 0 });
    expect(out.join("")).toBe(`${JSON.stringify(structured, null, 2)}\n`);
    expect(state.closed).toStrictEqual([{ status: "success", result: 0 }]);
    expect(state.afterSuccess).toStrictEqual(["kibi_proof_compact"]);
  });

  test("compact lists skipped tests and reports missing text as empty", async () => {
    fakeRuntime();
    spyOn(compact, "executeCompactReceipts").mockResolvedValue({
      content: [],
      structuredContent: {
        tests: [{ testId: "TEST-A", before: 3, after: 1 }],
        skipped: [{ testId: "TEST-B", reason: "unreadable source" }],
      },
    } as never);
    const out = captureStdout();
    await proofCompactCommand({ dryRun: true, test: "TEST-A" });
    mock.restore();
    expect(out.join("")).toBe(
      "\n  TEST-A: 3 -> 1 receipt(s)\n  TEST-B: skipped (unreadable source)\n",
    );
  });

  test("compact closes with an error outcome when the operation fails", async () => {
    const state = fakeRuntime();
    spyOn(compact, "executeCompactReceipts").mockRejectedValue(
      new Error("compact failed"),
    );
    await expect(proofCompactCommand({})).rejects.toThrow("compact failed");
    expect(state.closed).toStrictEqual([{ status: "error", error: 1 }]);
    expect(state.afterSuccess).toStrictEqual([]);
  });

  test("migrate-legacy closes with an error outcome when the operation fails", async () => {
    const state = fakeRuntime();
    spyOn(migrateLegacy, "executeMigrateLegacyReceipts").mockRejectedValue(
      new Error("migrate failed"),
    );
    await expect(proofMigrateLegacyCommand({})).rejects.toThrow(
      "migrate failed",
    );
    expect(state.closed).toStrictEqual([{ status: "error", error: 1 }]);
  });

  test("prune closes with an error outcome when the operation fails", async () => {
    const state = fakeRuntime();
    spyOn(prune, "executePruneReceipts").mockRejectedValue(
      new Error("prune failed"),
    );
    await expect(proofPruneCommand({})).rejects.toThrow("prune failed");
    expect(state.closed).toStrictEqual([{ status: "error", error: 1 }]);
  });
});
