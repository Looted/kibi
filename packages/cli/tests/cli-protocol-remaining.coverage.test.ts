/// <reference types="bun" />

import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { InputError, OperationError } from "../src/cli-errors.js";
import * as loader from "../src/cli-operation-loader.js";
import { executeOperation } from "../src/cli-protocol.js";
import type { CliContext } from "../src/cli-protocol.js";

function createContext(): CliContext {
  return {
    workspaceRoot: process.cwd(),
    signal: new AbortController().signal,
    clock: () => new Date(0),
    prolog: {
      query: async () => ({ success: true, bindings: {} }),
      nextSolution: async () => null,
      save: async () => ({ success: true, bindings: {} }),
    },
    git: {
      revParse: async () => "develop",
      showToplevel: async () => process.cwd(),
      workspaceSnapshot: async () => ({
        version: "kibi.workspace-snapshot.v2",
        hash: "a".repeat(64),
        dirty: false,
        fileCount: 1,
      }),
    },
  };
}

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
});

function stubSpec(execute: () => Promise<unknown>, outputSchema?: object) {
  const load = spyOn(loader, "loadOperationSpec").mockResolvedValue({
    name: "kb_status",
    effects: ["kb-read"],
    resultVersion: "kibi.kb_status.v1",
    businessInputSchema: { type: "object", additionalProperties: true },
    outputSchema,
    execute,
  } as never);
  restores.push(() => load.mockRestore());
}

describe("executeOperation leftover protocol and error branches", () => {
  test("treats an uncompilable output schema as protocol invalid", async () => {
    stubSpec(async () => ({ ok: true }), { type: "not-a-real-json-schema", $id: true });
    const result = await executeOperation("kb_status", {}, createContext());
    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr ?? "").toMatch(
      /PROTOCOL_VALIDATION_FAILED|OPERATION_FAILED/,
    );
  });

  test("rejects an envelope that fails the compiled output contract", async () => {
    stubSpec(async () => ({ unexpected: true }), {
      type: "object",
      required: ["kibiProtocol", "data"],
      properties: {
        kibiProtocol: { const: 1 },
        data: {
          type: "object",
          required: ["mustExist"],
          properties: { mustExist: { type: "string" } },
          additionalProperties: false,
        },
      },
      additionalProperties: true,
    });
    const result = await executeOperation("kb_status", {}, createContext());
    expect(result.exitCode).not.toBe(0);
    expect(JSON.parse(result.stdout ?? "")).toMatchObject({
      status: "error",
      error: { code: "PROTOCOL_VALIDATION_FAILED" },
    });
  });

  test("returns InputError thrown by the operation execute path", async () => {
    stubSpec(async () => {
      throw new InputError("VALIDATION_FAILED", "bad input");
    });
    const result = await executeOperation("kb_status", {}, createContext());
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("VALIDATION_FAILED");
  });

  test("wraps a generic Error as OPERATION_FAILED", async () => {
    stubSpec(async () => {
      throw new Error("boom");
    });
    const result = await executeOperation("kb_status", {}, createContext());
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("boom");
    expect(JSON.parse(result.stdout ?? "")).toMatchObject({
      error: { code: "OPERATION_FAILED" },
    });
  });

  test("wraps a non-Error throw as an unexpected operation failure", async () => {
    stubSpec(async () => {
      throw "nope";
    });
    const result = await executeOperation("kb_status", {}, createContext());
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("unexpectedly");
  });
});
