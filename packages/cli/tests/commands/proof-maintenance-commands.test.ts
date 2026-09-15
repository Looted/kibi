import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { proofMigrateLegacyCommand } from "../../src/commands/proof-migrate-legacy.js";
import { proofPruneCommand } from "../../src/commands/proof-prune.js";
import * as migrate from "../../src/operations/proof/migrate-legacy-receipts.js";
import * as prune from "../../src/operations/proof/prune-receipts.js";
import * as cliRuntime from "../../src/runtime/cli-runtime.js";

const restores: Array<() => void> = [];

afterEach(() => {
  while (restores.length > 0) restores.pop()?.();
});

function fakeRuntime() {
  const context = {} as never;
  const runtime = {
    open: async () => context,
    afterSuccess: async () => undefined,
    close: async () => undefined,
  };
  const runtimeSpy = spyOn(cliRuntime, "createCliRuntime").mockReturnValue(
    runtime as never,
  );
  restores.push(() => runtimeSpy.mockRestore());
}

describe("proof maintenance command wrappers", () => {
  test("runs legacy migration and reports each selected test", async () => {
    fakeRuntime();
    const operation = spyOn(
      migrate,
      "executeMigrateLegacyReceipts",
    ).mockResolvedValue({
      content: [{ type: "text", text: "Migrated" }],
      structuredContent: { tests: [{ testId: "TEST-LEGACY" }] },
    } as never);
    restores.push(() => operation.mockRestore());
    const output: string[] = [];
    const write = spyOn(process.stdout, "write").mockImplementation(((
      chunk: string | Uint8Array,
    ) => {
      output.push(String(chunk));
      return true;
    }) as typeof process.stdout.write);
    restores.push(() => write.mockRestore());

    await expect(
      proofMigrateLegacyCommand({ test: "TEST-LEGACY" }),
    ).resolves.toEqual({ exitCode: 0 });
    expect(output.join("")).toContain(
      "TEST-LEGACY: legacy verification_receipts removed",
    );
  });

  test("validates prune options before opening a runtime", async () => {
    await expect(proofPruneCommand({ keep: "0" })).rejects.toThrow(
      /between 1 and 50/,
    );
    await expect(proofPruneCommand({ keep: "51" })).rejects.toThrow(
      /between 1 and 50/,
    );
  });

  test("runs receipt pruning and reports before/after counts", async () => {
    fakeRuntime();
    const operation = spyOn(prune, "executePruneReceipts").mockResolvedValue({
      content: [{ type: "text", text: "Pruned" }],
      structuredContent: {
        tests: [{ testId: "TEST-PROOF", before: 3, after: 1 }],
      },
    } as never);
    restores.push(() => operation.mockRestore());
    const output: string[] = [];
    const write = spyOn(process.stdout, "write").mockImplementation(((
      chunk: string | Uint8Array,
    ) => {
      output.push(String(chunk));
      return true;
    }) as typeof process.stdout.write);
    restores.push(() => write.mockRestore());

    await expect(
      proofPruneCommand({ test: "TEST-PROOF", keep: "1" }),
    ).resolves.toEqual({ exitCode: 0 });
    expect(output.join("")).toContain("TEST-PROOF: 3 -> 1 receipt(s)");
  });
});
