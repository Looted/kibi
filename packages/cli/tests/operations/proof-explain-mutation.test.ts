import { afterEach, describe, expect, test } from "bun:test";
import {
  classifyExplainTarget,
  executeProofExplain,
  requireExplainTarget,
} from "../../src/operations/proof/explain.js";
import type {
  OperationContext,
  PrologPort,
} from "../../src/public/operations/runtime-types.js";

const savedMode = process.env.KIBI_PROOF_BINDING_MODE;
afterEach(() => {
  if (savedMode === undefined)
    Reflect.deleteProperty(process.env, "KIBI_PROOF_BINDING_MODE");
  else process.env.KIBI_PROOF_BINDING_MODE = savedMode;
});

function recordingProlog(answers: boolean[]): {
  prolog: PrologPort;
  goals: string[];
} {
  const goals: string[] = [];
  const prolog = {
    query: async (goal: string) => {
      goals.push(goal);
      return { success: answers.shift() ?? false, bindings: {} };
    },
  } as unknown as PrologPort;
  return { prolog, goals };
}

describe("proof explain targets", () => {
  test("naming both a requirement and a symbol is an invalid target", () => {
    expect(() =>
      classifyExplainTarget(undefined, {
        requirement: "REQ-1",
        symbol: "SYM-1",
      }),
    ).toThrow(
      expect.objectContaining({
        code: "INVALID_TARGET",
        retryable: false,
      }),
    );
  });

  test("a symbol is looked up as a symbol, and a missing one is not retryable", async () => {
    const found = recordingProlog([true]);
    await requireExplainTarget(found.prolog, { kind: "symbol", id: "SYM-a" });
    expect(found.goals).toEqual(["once(kb_entity('SYM-a', symbol, _))"]);

    const missing = recordingProlog([false, false]);
    const error = await requireExplainTarget(missing.prolog, {
      kind: "symbol",
      id: "SYM-b",
    }).catch((caught: unknown) => caught);
    expect(error).toMatchObject({
      code: "ENTITY_NOT_FOUND",
      retryable: false,
      message:
        "proof explain: no symbol SYM-b in the KB for this branch. Check the id with kibi query symbol; if its file was just written or pulled, run kibi sync first.",
    });
    expect(missing.goals).toEqual([
      "once(kb_entity('SYM-b', symbol, _))",
      "once(kb_entity('SYM-b', _, _))",
    ]);
  });

  test("explaining without a Prolog runtime says so", async () => {
    process.env.KIBI_PROOF_BINDING_MODE = "strict-snapshot";
    const context = {
      workspaceRoot: "/nonexistent",
      signal: new AbortController().signal,
      clock: () => new Date("2026-10-09T00:00:00Z"),
    } as unknown as OperationContext;
    const error = await executeProofExplain(
      { kind: "requirement", id: "REQ-a" },
      context,
    ).catch((caught: unknown) => caught);
    expect(error).toMatchObject({
      code: "PROLOG_UNAVAILABLE",
      message: "Proof explain requires a Prolog runtime",
    });
  });
});
