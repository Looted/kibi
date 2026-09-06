// implements REQ-skillopt-codex-optimization
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import * as fsPromises from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  appendTraceReceipt,
  parseTraceReceipts,
  verifyTraceChain,
} from "../runtime/jsonrpc";

const spies: Array<{ mockRestore: () => void }> = [];
const roots: string[] = [];

afterEach(async () => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
  if (process.exitCode === 1) process.exitCode = 0;
});

const HASH = "a".repeat(64);

function receipt(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: "1.0.0",
    sequence: 1,
    correlationId: "rpc-1",
    direction: "broker",
    kind: "request",
    payload: {},
    previousHash: HASH,
    hash: HASH,
    ...overrides,
  };
}

describe("jsonrpc remaining parse and IO error branches", () => {
  test("parseTraceReceipts rejects invalid direction, kind, request id, and elapsedMs", () => {
    expect(() =>
      parseTraceReceipts(JSON.stringify(receipt({ direction: "sideways" }))),
    ).toThrow("invalid_trace_direction");
    expect(() =>
      parseTraceReceipts(JSON.stringify(receipt({ kind: "notify" }))),
    ).toThrow("invalid_trace_kind");
    expect(() =>
      parseTraceReceipts(JSON.stringify(receipt({ requestId: true }))),
    ).toThrow("invalid_trace_request_id");
    expect(() =>
      parseTraceReceipts(JSON.stringify(receipt({ elapsedMs: -1 }))),
    ).toThrow("invalid_trace_elapsed_ms");
    expect(() => parseTraceReceipts(JSON.stringify(["not-an-object"]))).toThrow(
      "trace_receipt_must_be_object",
    );
    expect(
      verifyTraceChain(JSON.stringify(receipt({ sequence: 1.5 }))),
    ).toEqual({ valid: false, entries: 0 });
  });

  test("appendTraceReceipt rethrows non-ENOENT read failures", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-jsonrpc-"));
    roots.push(root);
    const originalRead = fsPromises.readFile.bind(fsPromises);
    const read = spyOn(fsPromises, "readFile").mockImplementation(
      (async (target: unknown, encoding: unknown) => {
        if (String(target).endsWith("trace.jsonl")) {
          const error = new Error("EACCES");
          (error as Error & { code: string }).code = "EACCES";
          throw error;
        }
        return originalRead(target as never, encoding as never);
      }) as never,
    );
    spies.push(read);
    await expect(
      appendTraceReceipt(join(root, "trace.jsonl"), {
        correlationId: "rpc-1",
        direction: "broker",
        kind: "error",
        payload: {},
      }),
    ).rejects.toThrow("EACCES");
    await writeFile(join(root, "ok.jsonl"), "");
  });
});
