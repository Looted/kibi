import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  parseProveShard,
  proveCommand,
  shardSelection,
} from "../../src/commands/prove.js";
import type {
  OperationContext,
  OperationRuntime,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";
import { PROOF_INTEGRATION_VERSION } from "../../src/public/proof-protocol.js";
import {
  createGitWorkspace,
  isolateKibiEnv,
  removeTempDir,
  restoreWorkspaceCwd,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  restoreWorkspaceCwd();
  for (const root of roots.splice(0)) removeTempDir(root);
  process.exitCode = 0;
});

describe("parseProveShard", () => {
  test("reads K/N with 1 <= K <= N", () => {
    expect(parseProveShard("1/1")).toStrictEqual({ index: 1, count: 1 });
    expect(parseProveShard(" 3/12 ")).toStrictEqual({ index: 3, count: 12 });
  });

  test("refuses anything else", () => {
    for (const bad of [
      "0/3",
      "4/3",
      "1/0",
      "1",
      "1/",
      "/3",
      "a/b",
      "1/3/4",
      "-1/3",
      "01/3",
    ])
      expect(() => parseProveShard(bad)).toThrow(
        `prove: --shard must be K/N with 1 <= K <= N (got '${bad}')`,
      );
  });
});

describe("shardSelection", () => {
  const ids = ["T-e", "T-a", "T-d", "T-b", "T-g", "T-c", "T-f"];
  const tests = ids.map((id) => ({ id }));
  const part = (index: number, count: number) =>
    shardSelection(tests, { index, count }).map((test) => test.id);

  test("deals tests out in id order", () => {
    expect(part(1, 3)).toStrictEqual(["T-a", "T-d", "T-g"]);
    expect(part(2, 3)).toStrictEqual(["T-b", "T-e"]);
    expect(part(3, 3)).toStrictEqual(["T-c", "T-f"]);
    expect(part(1, 1)).toStrictEqual([...ids].sort());
  });

  test("every test lands in exactly one part, for any part count", () => {
    for (let count = 1; count <= 9; count += 1) {
      const parts = Array.from({ length: count }, (_, index) =>
        part(index + 1, count),
      );
      expect(parts.flat().sort()).toStrictEqual([...ids].sort());
      const sizes = parts.map((ids) => ids.length);
      expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    }
  });

  test("does not reorder the caller's array", () => {
    shardSelection(tests, { index: 1, count: 2 });
    expect(tests.map((test) => test.id)).toStrictEqual(ids);
  });
});

function runtime(dir: string, ids: string[]): OperationRuntime {
  const contract = JSON.stringify({
    version: "kibi.proof-contract.v1",
    integration: "self-proof",
    required_proofs: [{ symbol_id: "SYM-CASE-1", target: "default" }],
    success_policy: "all_required_first_attempt",
  });
  const rows = ids.map(
    (id) =>
      `[${id},test,[title="${id}",status=active,source="tests/flow.spec.ts",created_at="2026-08-13T00:00:00Z",updated_at="2026-08-13T00:00:00Z",verification_scope=end_to_end,verification_perspective=consumer,proof_contract=${JSON.stringify(contract)}]]`,
  );
  const context: OperationContext = {
    workspaceRoot: dir,
    signal: new AbortController().signal,
    clock: () => new Date("2026-08-13T00:00:00Z"),
    prolog: {
      query: async (): Promise<PrologQueryResult> => ({
        success: true,
        bindings: { Results: `[${rows.join(",")}]` },
      }),
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
  return {
    open: async () => context,
    afterSuccess: async () => undefined,
    close: async () => undefined,
  };
}

async function listed(
  options: Parameters<typeof proveCommand>[0],
  ids: string[],
): Promise<{ exitCode: number; output: unknown }> {
  const restoreEnv = isolateKibiEnv();
  restores.push(restoreEnv);
  const cwd = createGitWorkspace();
  roots.push(cwd);
  mkdirSync(path.join(cwd, ".kb", "proof"), { recursive: true });
  writeFileSync(
    path.join(cwd, ".kb", "proof", "integrations.json"),
    `${JSON.stringify({
      version: PROOF_INTEGRATION_VERSION,
      integrations: [
        {
          id: "self-proof",
          producer: "command",
          command: ["node", "-e", "process.exit(1)"],
          description: "Would fail if it ran",
        },
      ],
    })}\n`,
  );
  const chunks: string[] = [];
  const original = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((chunk: string | Uint8Array) => {
    chunks.push(String(chunk));
    return true;
  }) as typeof process.stdout.write;
  restores.push(() => {
    process.stdout.write = original;
  });
  let ingested = 0;
  const result = await proveCommand(
    { ...options, workspaceRoot: cwd },
    {
      runtime: runtime(cwd, ids),
      ingestProof: async () => {
        ingested += 1;
        throw new Error("--list must not run or ingest anything");
      },
    },
  );
  expect(ingested).toBe(0);
  return { exitCode: result.exitCode, output: JSON.parse(chunks.join("")) };
}

describe("kibi prove --list", () => {
  test("prints the selected ids without running them", async () => {
    expect(
      await listed({ all: true, list: true }, ["TEST-B", "TEST-A"]),
    ).toStrictEqual({
      exitCode: 0,
      output: { tests: ["TEST-A", "TEST-B"] },
    });
  });

  test("prints one shard's part and names the shard", async () => {
    expect(
      await listed({ all: true, list: true, shard: { index: 2, count: 2 } }, [
        "TEST-C",
        "TEST-A",
        "TEST-B",
      ]),
    ).toStrictEqual({
      exitCode: 0,
      output: { tests: ["TEST-B"], shard: "2/2" },
    });
  });
});
