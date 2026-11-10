import { spyOn } from "bun:test";
import type {
  FilesystemPort,
  OperationContext,
  PrologPort,
} from "../../../src/public/operations/runtime-types.js";

const restores: Array<() => void> = [];

/**
 * Restore every stub. Each test file registers this with its own afterEach:
 * this module is evaluated once per run, so a hook registered here would
 * only belong to the first file that imports it.
 */
export function restoreStubs(): void {
  while (restores.length > 0) restores.pop()?.();
}

/** spyOn a module export and restore it after the current test. */
export function stub<T extends object, K extends keyof T>(
  target: T,
  key: K,
  // biome-ignore lint/suspicious/noExplicitAny: test doubles accept any signature
  implementation: (...args: any[]) => unknown,
) {
  // biome-ignore lint/suspicious/noExplicitAny: spyOn typing is per-export
  const spy = spyOn(target, key as any).mockImplementation(
    implementation as never,
  );
  restores.push(() => spy.mockRestore());
  return spy;
}

export const PROLOG = { query: async () => ({}) } as unknown as PrologPort;

/** In-memory filesystem keyed by absolute path. */
export function memoryFs(files: Record<string, string> = {}): FilesystemPort & {
  reads: string[];
} {
  const reads: string[] = [];
  return {
    reads,
    readFile: async (path: string) => {
      reads.push(path);
      const content = files[path];
      if (content === undefined) throw new Error(`ENOENT: ${path}`);
      return content;
    },
  } as unknown as FilesystemPort & { reads: string[] };
}

export function contextWith(
  extras: Partial<OperationContext> = {},
): OperationContext {
  return {
    workspaceRoot: "/ws",
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-19T00:00:00Z"),
    prolog: PROLOG,
    fs: memoryFs(),
    ...extras,
  };
}

export function receiptBlock(
  receiptId: string,
  finishedAt: string,
  testId = "TEST-MAINT",
): Record<string, unknown> {
  return {
    version: "kibi.proof-receipt.v1",
    receipt_id: receiptId,
    test_id: testId,
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

export function receipts(count: number, testId = "TEST-MAINT") {
  return Array.from({ length: count }, (_, index) =>
    receiptBlock(
      `PR-0000000${index + 1}`,
      `2026-01-0${index + 1}T00:00:01.000Z`,
      testId,
    ),
  );
}

export function testEntity(extras: Record<string, unknown> = {}) {
  return {
    id: "TEST-MAINT",
    type: "test",
    title: "Maintenance fixture",
    status: "passing",
    source: ".kb/tests/TEST-MAINT.md",
    verification_scope: "end_to_end",
    proof_contract: { version: "kibi.proof-contract.v1" },
    ...extras,
  };
}
