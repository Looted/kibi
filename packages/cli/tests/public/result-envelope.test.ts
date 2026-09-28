import { describe, expect, test } from "bun:test";

import { toKibiResult } from "../../src/public/operations/result-envelope.js";

const mutationSpec = {
  name: "kb_delete",
  effects: ["kb-write", "workspace-write"] as const,
};

describe("result envelope effect statuses", () => {
  test("a successful result reports its declared effects as completed", () => {
    const envelope = toKibiResult(mutationSpec, { deleted: 1 });

    expect(envelope.effects).toEqual([
      { kind: "kb-write", status: "completed" },
      { kind: "workspace-write", status: "completed" },
    ]);
  });

  test("a plan-only result reports the effects it left to a later call as not applicable", () => {
    const envelope = toKibiResult(mutationSpec, {
      deleted: 0,
      skippedEffects: ["kb-write", "workspace-write"],
    });

    expect(envelope.status).toBe("success");
    expect(envelope.effects).toEqual([
      { kind: "kb-write", status: "not_applicable" },
      { kind: "workspace-write", status: "not_applicable" },
    ]);
  });

  test("an error result never reports a declared effect as completed", () => {
    const envelope = toKibiResult(mutationSpec, null, {
      status: "error",
      error: { code: "OPERATION_FAILED", message: "rejected", retryable: true },
    });

    expect(envelope.effects).toEqual([
      { kind: "kb-write", status: "failed", errorCode: "OPERATION_FAILED" },
      {
        kind: "workspace-write",
        status: "failed",
        errorCode: "OPERATION_FAILED",
      },
    ]);
  });

  test("an error raised before the operation ran reports effects as not applicable", () => {
    const envelope = toKibiResult(mutationSpec, null, {
      status: "error",
      attempted: false,
      error: {
        code: "VALIDATION_FAILED",
        message: "bad input",
        retryable: false,
      },
    });

    expect(envelope.effects).toEqual([
      { kind: "kb-write", status: "not_applicable" },
      { kind: "workspace-write", status: "not_applicable" },
    ]);
  });

  test("an explicit effect failure still wins over the error outcome", () => {
    const envelope = toKibiResult(
      mutationSpec,
      {
        effectFailures: [
          { kind: "kb-write", errorCode: "MUTATION_OUTCOME_UNKNOWN" },
        ],
      },
      {
        status: "error",
        error: {
          code: "MUTATION_OUTCOME_UNKNOWN",
          message: "timed out",
          retryable: false,
        },
      },
    );

    expect(envelope.effects[0]).toEqual({
      kind: "kb-write",
      status: "failed",
      errorCode: "MUTATION_OUTCOME_UNKNOWN",
    });
  });
});
