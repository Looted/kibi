import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { proofCompactCommand } from "../../src/commands/proof-compact.js";
import { proofExplainCommand } from "../../src/commands/proof-explain.js";
import { proofMigrateLegacyCommand } from "../../src/commands/proof-migrate-legacy.js";
import { proofPruneCommand } from "../../src/commands/proof-prune.js";
import * as compact from "../../src/operations/proof/compact-receipts.js";
import * as explain from "../../src/operations/proof/explain.js";
import * as migrate from "../../src/operations/proof/migrate-legacy-receipts.js";
import * as prune from "../../src/operations/proof/prune-receipts.js";
import * as cliRuntime from "../../src/runtime/cli-runtime.js";

const restores: Array<() => void> = [];
let out: string[] = [];
let events: unknown[][] = [];
const context = { fake: "context" };

beforeEach(() => {
  out = [];
  events = [];
  const writeSpy = spyOn(process.stdout, "write").mockImplementation(((
    chunk: string,
  ) => {
    out.push(chunk);
    return true;
  }) as never);
  const runtimeSpy = spyOn(cliRuntime, "createCliRuntime").mockImplementation(
    (() => ({
      open: async (
        spec: { execute: () => Promise<unknown> },
        opts: unknown,
      ) => {
        events.push(["open", { ...spec, execute: undefined }, opts]);
        expect(await spec.execute()).toBeUndefined();
        return context;
      },
      afterSuccess: async (spec: object, ctx: unknown) => {
        const shown =
          "execute" in spec ? { ...spec, execute: undefined } : spec;
        events.push(["afterSuccess", shown, ctx]);
      },
      close: async (ctx: unknown, outcome: unknown) => {
        events.push(["close", ctx, outcome]);
      },
    })) as never,
  );
  restores.push(
    () => writeSpy.mockRestore(),
    () => runtimeSpy.mockRestore(),
  );
});

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
});

function stub<T extends object>(
  module: T,
  name: keyof T,
  answer: (...args: unknown[]) => unknown,
) {
  const calls: unknown[][] = [];
  const spy = spyOn(module, name as never).mockImplementation(((
    ...args: unknown[]
  ) => {
    calls.push(args);
    return answer(...args);
  }) as never);
  restores.push(() => (spy as { mockRestore(): void }).mockRestore());
  return calls;
}

const mutating = {
  effects: ["kb-mutate", "workspace-write"],
  requiresProlog: true,
  execute: undefined,
};
const success = ["close", context, { status: "success", result: 0 }];
const failure = ["close", context, { status: "error", error: 1 }];

describe("proofExplainCommand", () => {
  test("classifies the target, renders the view and closes as success", async () => {
    const classified: unknown[][] = [];
    stub(explain, "classifyExplainTarget", (...args) => {
      classified.push(args);
      return { kind: "requirement", id: "REQ-1" };
    });
    const executed = stub(explain, "executeProofExplain", async () => ({
      view: { kind: "requirement" },
    }));
    stub(explain, "renderProofExplain", () => "rendered\n");
    expect(
      await proofExplainCommand({ id: "REQ-1", requirement: "R", symbol: "S" }),
    ).toStrictEqual({ exitCode: 0 });
    expect(await proofExplainCommand({ json: true })).toStrictEqual({
      exitCode: 0,
    });
    expect(classified).toStrictEqual([
      ["REQ-1", { requirement: "R", symbol: "S" }],
      [undefined, {}],
    ]);
    expect(executed[0]).toStrictEqual([
      { kind: "requirement", id: "REQ-1" },
      context,
    ]);
    expect(out).toStrictEqual([
      "rendered\n",
      `${JSON.stringify({ kind: "requirement" }, null, 2)}\n`,
    ]);
    const open = [
      "open",
      {
        name: "kibi_proof_explain",
        effects: [],
        requiresProlog: true,
        execute: undefined,
      },
      {},
    ];
    const after = ["afterSuccess", { name: "kibi_proof_explain" }, context];
    expect(events).toStrictEqual([open, after, success, open, after, success]);
  });

  test("closes as an error when the explanation fails", async () => {
    stub(explain, "classifyExplainTarget", () => ({}));
    stub(explain, "executeProofExplain", async () => {
      throw new Error("no such target");
    });
    await expect(proofExplainCommand({})).rejects.toThrow("no such target");
    expect(events.at(-1)).toStrictEqual(failure);
    expect(events).toHaveLength(2);
  });
});

describe("proofMigrateLegacyCommand", () => {
  test("removes legacy receipts and lists each test", async () => {
    const calls = stub(migrate, "executeMigrateLegacyReceipts", async () => ({
      content: [{ text: "Migrated 2 tests" }],
      structuredContent: {
        tests: [{ testId: "TEST-1" }, { testId: "TEST-2" }],
      },
    }));
    expect(await proofMigrateLegacyCommand({ test: "TEST-1" })).toStrictEqual({
      exitCode: 0,
    });
    expect(calls).toStrictEqual([[{ testId: "TEST-1" }, context]]);
    expect(out).toStrictEqual([
      "Migrated 2 tests\n",
      "  TEST-1: legacy verification_receipts removed\n",
      "  TEST-2: legacy verification_receipts removed\n",
    ]);
    expect(events).toStrictEqual([
      ["open", { name: "kibi_proof_migrate_legacy", ...mutating }, {}],
      ["afterSuccess", { name: "kibi_proof_migrate_legacy" }, context],
      success,
    ]);
  });

  test("prints an empty line without a summary and closes failures", async () => {
    const calls = stub(migrate, "executeMigrateLegacyReceipts", async () => ({
      content: [],
      structuredContent: { tests: [] },
    }));
    await proofMigrateLegacyCommand({});
    expect(calls[0]?.[0]).toStrictEqual({});
    expect(out).toStrictEqual(["\n"]);
    stub(migrate, "executeMigrateLegacyReceipts", async () => {
      throw new Error("boom");
    });
    events = [];
    await expect(proofMigrateLegacyCommand({})).rejects.toThrow("boom");
    expect(events.slice(1)).toStrictEqual([failure]);
  });
});

describe("proofPruneCommand", () => {
  test("refuses a keep count outside 1..50", async () => {
    for (const keep of ["0", "51", "x", "-3"]) {
      await expect(proofPruneCommand({ keep })).rejects.toThrow(
        "proof prune: --keep must be an integer between 1 and 50",
      );
    }
    expect(events).toStrictEqual([]);
  });

  test("prunes to the keep count and lists each test", async () => {
    const calls = stub(prune, "executePruneReceipts", async () => ({
      content: [{ text: "Pruned" }],
      structuredContent: {
        tests: [{ testId: "TEST-1", before: 5, after: 2 }],
      },
    }));
    expect(
      await proofPruneCommand({ keep: "50", test: "TEST-1" }),
    ).toStrictEqual({ exitCode: 0 });
    await proofPruneCommand({ keep: "1" });
    await proofPruneCommand({});
    expect(calls.map(([input]) => input)).toStrictEqual([
      { keep: 50, testId: "TEST-1" },
      { keep: 1 },
      { keep: 1 },
    ]);
    expect(calls[0]?.[1]).toBe(context);
    expect(out.slice(0, 2)).toStrictEqual([
      "Pruned\n",
      "  TEST-1: 5 -> 2 receipt(s)\n",
    ]);
    expect(events.slice(0, 3)).toStrictEqual([
      ["open", { name: "kibi_proof_prune", ...mutating }, {}],
      ["afterSuccess", { name: "kibi_proof_prune" }, context],
      success,
    ]);
  });

  test("prints an empty line without a summary and closes failures", async () => {
    stub(prune, "executePruneReceipts", async () => ({
      content: [],
      structuredContent: { tests: [] },
    }));
    await proofPruneCommand({});
    expect(out).toStrictEqual(["\n"]);
    stub(prune, "executePruneReceipts", async () => {
      throw new Error("boom");
    });
    events = [];
    await expect(proofPruneCommand({})).rejects.toThrow("boom");
    expect(events.slice(1)).toStrictEqual([failure]);
  });
});

describe("proofCompactCommand", () => {
  const structured = {
    tests: [{ testId: "TEST-1", before: 4, after: 1 }],
    skipped: [{ testId: "TEST-2", reason: "pinned" }],
  };

  test("compacts, lists tests and skips, and records the write", async () => {
    const calls = stub(compact, "executeCompactReceipts", async () => ({
      content: [{ text: "Compacted" }],
      structuredContent: structured,
    }));
    expect(
      await proofCompactCommand({ test: "TEST-1", dryRun: false }),
    ).toStrictEqual({ exitCode: 0 });
    expect(calls).toStrictEqual([[{ testId: "TEST-1" }, context]]);
    expect(out).toStrictEqual([
      "Compacted\n",
      "  TEST-1: 4 -> 1 receipt(s)\n",
      "  TEST-2: skipped (pinned)\n",
    ]);
    const spec = { name: "kibi_proof_compact", ...mutating };
    expect(events).toStrictEqual([
      ["open", spec, {}],
      ["afterSuccess", spec, context],
      success,
    ]);
  });

  test("a dry run prints JSON and records nothing", async () => {
    const calls = stub(compact, "executeCompactReceipts", async () => ({
      content: [],
      structuredContent: structured,
    }));
    await proofCompactCommand({ dryRun: true, json: true });
    await proofCompactCommand({ json: false });
    expect(calls.map(([input]) => input)).toStrictEqual([{ dryRun: true }, {}]);
    expect(out).toStrictEqual([
      `${JSON.stringify(structured, null, 2)}\n`,
      "\n",
      "  TEST-1: 4 -> 1 receipt(s)\n",
      "  TEST-2: skipped (pinned)\n",
    ]);
    expect(events.map(([kind]) => kind)).toStrictEqual([
      "open",
      "close",
      "open",
      "afterSuccess",
      "close",
    ]);
  });

  test("closes failures as errors", async () => {
    stub(compact, "executeCompactReceipts", async () => {
      throw new Error("boom");
    });
    await expect(proofCompactCommand({})).rejects.toThrow("boom");
    expect(events.slice(1)).toStrictEqual([failure]);
  });
});
