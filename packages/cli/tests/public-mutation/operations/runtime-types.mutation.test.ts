import { describe, expect, test } from "bun:test";
import {
  type OperationContext,
  type OperationOutcome,
  type OperationRuntime,
  type RuntimeOperationSpec,
  executeOperation,
} from "../../../src/public/operations/runtime-types.js";

function recordingRuntime() {
  const calls: unknown[][] = [];
  const context = { workspaceRoot: "/ws" } as unknown as OperationContext;
  const runtime: OperationRuntime = {
    async open(spec, opts) {
      calls.push(["open", spec.name, opts]);
      return context;
    },
    async afterSuccess(spec, ctx) {
      calls.push(["afterSuccess", spec.name, ctx === context]);
    },
    async close(ctx, outcome: OperationOutcome) {
      calls.push(["close", ctx === context, outcome]);
    },
  };
  return { calls, context, runtime };
}

function spec(
  effects: RuntimeOperationSpec["effects"],
  execute: RuntimeOperationSpec<string, string>["execute"],
): RuntimeOperationSpec<string, string> {
  return { name: "op", effects, requiresProlog: false, execute };
}

describe("executeOperation", () => {
  test("runs afterSuccess for kb-write operations and closes with the result", async () => {
    const { calls, context, runtime } = recordingRuntime();
    const seen: unknown[] = [];
    const result = await executeOperation(
      runtime,
      spec(["kb-read", "kb-write"], async (input, ctx) => {
        seen.push(input, ctx === context);
        return `done:${input}`;
      }),
      "in",
      { lockTimeoutMs: 5 } as never,
    );
    expect(result).toBe("done:in");
    expect(seen).toStrictEqual(["in", true]);
    expect(calls).toStrictEqual([
      ["open", "op", { lockTimeoutMs: 5 }],
      ["afterSuccess", "op", true],
      ["close", true, { status: "success", result: "done:in" }],
    ]);
  });

  test("skips afterSuccess for operations that do not write the KB", async () => {
    const { calls, runtime } = recordingRuntime();
    await executeOperation(
      runtime,
      spec(["kb-read", "workspace-write"], async () => "ok"),
      "in",
    );
    expect(calls).toStrictEqual([
      ["open", "op", undefined],
      ["close", true, { status: "success", result: "ok" }],
    ]);
  });

  test("closes with the error and rethrows it", async () => {
    const { calls, runtime } = recordingRuntime();
    const failure = new Error("boom");
    await expect(
      executeOperation(
        runtime,
        spec(["kb-write"], async () => {
          throw failure;
        }),
        "in",
      ),
    ).rejects.toBe(failure);
    expect(calls).toStrictEqual([
      ["open", "op", undefined],
      ["close", true, { status: "error", error: failure }],
    ]);
  });
});
