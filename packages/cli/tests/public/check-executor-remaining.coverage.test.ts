// implements REQ-kibi-operation-interface-parity, REQ-002
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as discovery from "../../src/public/operations/discovery-executors.js";
import { executeCheck } from "../../src/public/operations/check-executor.js";
import * as impact from "../../src/public/impact-diagnostics.js";
import type {
  OperationContext,
  PrologPort,
} from "../../src/public/operations/runtime-types.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const spies: Array<{ mockRestore: () => void }> = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

function context(
  overrides: Partial<OperationContext> = {},
): OperationContext {
  const prolog: PrologPort = {
    query: async () => ({ success: true, bindings: {} }),
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
  };
  return {
    workspaceRoot: process.cwd(),
    signal: new AbortController().signal,
    clock: () => new Date(0),
    prolog,
    ...overrides,
  };
}

describe("check-executor remaining empty-rule and failure branches", () => {
  test("wraps a missing Prolog runtime", async () => {
    restores.push(isolateKibiEnv());
    await expect(
      executeCheck({}, context({ prolog: undefined })),
    ).rejects.toThrow(
      "Check execution failed: Check operation requires a Prolog runtime",
    );
  });

  test("collects full quality diagnostics for an empty explicit rule set", async () => {
    restores.push(isolateKibiEnv());
    const collect = spyOn(impact, "collectFullKbQualityDiagnostics").mockResolvedValue([
      {
        id: "telemetry_acceptance_incomplete",
        severity: "review",
        blocking: false,
        category: "telemetry",
        message: "incomplete",
        suggestion: "rerun",
      },
    ]);
    spies.push(collect);
    const status = spyOn(discovery, "executeStatus").mockRejectedValue(
      new Error("Failed to resolve active branch: detached"),
    );
    spies.push(status);
    const result = await executeCheck(
      { rules: [] },
      context(),
      { collectFullQualityDiagnosticsForExplicitRules: true },
    );
    expect(collect).toHaveBeenCalled();
    expect(result.structuredContent.qualityDiagnostics).toEqual([
      expect.objectContaining({ id: "telemetry_acceptance_incomplete" }),
    ]);
    expect(result.content[0]?.text).toBeDefined();
  });
});
