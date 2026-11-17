import { describe, expect, test } from "bun:test";
import {
  InputError,
  KbRejection,
  OperationError,
} from "../../../src/cli-errors.js";
import {
  RECORD_DEPS,
  type RecordDeps,
  executeRecord,
} from "../../../src/operations/mutation/record-execute.js";
import type { RecordInput } from "../../../src/operations/mutation/record.js";
import type { UpsertInput } from "../../../src/operations/mutation/types.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";
import { checkSpec } from "../../../src/public/operations/specs/check.js";
import { upsertSpec } from "../../../src/public/operations/specs/upsert.js";

const CONTEXT = { workspaceRoot: "/kibi-record-none" } as OperationContext;

const INPUT: RecordInput = {
  statement: "Keys rotate yearly.",
  why: "Auditors asked for it.",
  saidBy: "agent",
  code: [
    { file: "src/keys.ts", symbol: "rotate" },
    { file: "src/keys.ts", symbol: "expire" },
    { file: "src/audit.ts", symbol: "log" },
  ],
};

const VERDICT = {
  changed: true,
  commitAllowed: false,
  violations: [{ rule: "claim-subject-missing", blocks: "commit" }],
  count: 1,
  diagnostics: [],
  qualityDiagnostics: [],
  messages: ["Found 1 blocking violation(s)"],
};

type Calls = { upserts: UpsertInput[]; checks: unknown[]; asked: string[] };

function deps(
  overrides: Partial<RecordDeps> = {},
  written: Record<string, unknown> = {
    created: 1,
    updated: 0,
    relationships_created: 3,
    warnings: [],
    nextActions: [{ operation: "kb_upsert", reason: "scenario" }],
  },
): { deps: RecordDeps; calls: Calls } {
  const calls: Calls = { upserts: [], checks: [], asked: [] };
  return {
    calls,
    deps: {
      exists: (context) => {
        expect(context).toBe(CONTEXT);
        return async (id) => {
          calls.asked.push(id);
          return id === "REQ-keys-rotate-yearly";
        };
      },
      upsert: async (input, context) => {
        expect(context).toBe(CONTEXT);
        calls.upserts.push(input);
        return {
          content: [{ type: "text", text: "Upserted." }],
          structuredContent: written as never,
        };
      },
      check: async (input, context) => {
        expect(context).toBe(CONTEXT);
        calls.checks.push(input);
        return {
          content: [
            { type: "text", text: "✗ refused" },
            { type: "image" },
            { type: "text", text: "detail" },
          ],
          structuredContent: VERDICT as never,
        };
      },
      ...overrides,
    },
  };
}

describe("kb_record runs its one payload through kb_upsert, then kb_check changed", () => {
  test("the default deps are kb_upsert's and kb_check's own executors", () => {
    expect(RECORD_DEPS.upsert).toBe(upsertSpec.execute);
    expect(RECORD_DEPS.check).toBe(checkSpec.execute as never);
    const goals: string[] = [];
    const exists = RECORD_DEPS.exists({
      ...CONTEXT,
      prolog: {
        query: async (goal: string) => {
          goals.push(goal);
          return { success: true, bindings: {} };
        },
      },
    } as unknown as OperationContext);
    return exists("REQ-a").then((found) => {
      expect(found).toBe(true);
      expect(goals).toEqual(["once((kb_entity('REQ-a', _, _)))"]);
    });
  });

  test("a write returns the payload, kb_upsert's result and the verdict", async () => {
    const { deps: fake, calls } = deps();
    const result = await executeRecord(INPUT, CONTEXT, fake);
    expect(calls.asked).toEqual([
      "REQ-keys-rotate-yearly",
      "REQ-keys-rotate-yearly-2",
    ]);
    const payload = {
      type: "req",
      id: "REQ-keys-rotate-yearly-2",
      properties: {
        title: "Keys rotate yearly",
        status: "open",
        firmness: "default",
        origin: { kind: "agent" },
      },
      document: { body: "Keys rotate yearly.\n" },
      why: "Auditors asked for it.",
      implementedBy: [
        { sourceFile: "src/keys.ts", symbol: "rotate" },
        { sourceFile: "src/keys.ts", symbol: "expire" },
        { sourceFile: "src/audit.ts", symbol: "log" },
      ],
    };
    // kb_upsert's schema validation passes it through unchanged.
    expect(calls.upserts).toEqual([payload]);
    // Each file once, in the order the code names them.
    expect(calls.checks).toEqual([
      { changed: true, sourceFiles: ["src/keys.ts", "src/audit.ts"] },
    ]);
    expect(result.structuredContent).toEqual({
      id: "REQ-keys-rotate-yearly-2",
      upsert: payload,
      written: {
        created: 1,
        updated: 0,
        relationships_created: 3,
        warnings: [],
        nextActions: [{ operation: "kb_upsert", reason: "scenario" }],
      },
      verdict: VERDICT,
      commitAllowed: false,
      nextActions: [{ operation: "kb_upsert", reason: "scenario" }],
    } as never);
    expect(result.content).toEqual([
      {
        type: "text",
        text: "Recorded REQ-keys-rotate-yearly-2 through kb_upsert.",
      },
      { type: "text", text: "Upserted." },
      { type: "text", text: "✗ refused\ndetail" },
    ]);
  });

  test("a write that needs repair keeps its status; one without steps has none", async () => {
    const { deps: fake } = deps(
      {},
      {
        created: 1,
        updated: 0,
        relationships_created: 0,
        warnings: [],
        status: "committed_with_repairs",
      },
    );
    const result = await executeRecord(
      { ...INPUT, code: [{ file: "src/keys.ts", symbol: "rotate" }] },
      CONTEXT,
      fake,
    );
    expect(result.structuredContent?.status).toBe("committed_with_repairs");
    expect(result.structuredContent?.nextActions).toEqual([]);
    expect(result.structuredContent).not.toHaveProperty("dryRun");
  });

  test("a status-less write carries no status", async () => {
    const { deps: fake } = deps();
    const result = await executeRecord(INPUT, CONTEXT, fake);
    expect(result.structuredContent).not.toHaveProperty("status");
  });

  test("dryRun returns the payload and kb_upsert's dry run, and never checks", async () => {
    const preview = {
      valid: false,
      errors: ["firm needs origin.ref"],
      dryRun: true,
    };
    const { deps: fake, calls } = deps({}, preview);
    const result = await executeRecord(
      { ...INPUT, saidBy: "user", dryRun: true },
      CONTEXT,
      fake,
    );
    expect(calls.upserts).toHaveLength(1);
    expect(calls.upserts[0]?.dryRun).toBe(true);
    expect(calls.checks).toEqual([]);
    const { dryRun: _dryRun, ...payload } = calls.upserts[0] as UpsertInput;
    expect(result.structuredContent).toEqual({
      id: "REQ-keys-rotate-yearly-2",
      upsert: payload,
      dryRun: true,
      preview,
      valid: false,
      errors: ["firm needs origin.ref"],
      skippedEffects: ["kb-write", "workspace-write"],
    } as never);
    expect(result.content).toEqual([
      {
        type: "text",
        text: `kb_record REQ-keys-rotate-yearly-2 is this kb_upsert payload: ${JSON.stringify(payload)}`,
      },
      { type: "text", text: "Upserted." },
    ]);
  });

  test("a valid dry run without errors says so", async () => {
    const { deps: fake } = deps({}, { valid: true, dryRun: true });
    const result = await executeRecord(
      { ...INPUT, dryRun: true },
      CONTEXT,
      fake,
    );
    expect(result.structuredContent?.valid).toBe(true);
    expect(result.structuredContent).not.toHaveProperty("errors");
    const unset = await executeRecord(
      { ...INPUT, dryRun: true },
      CONTEXT,
      deps({}, { dryRun: true }).deps,
    );
    expect(unset.structuredContent?.valid).toBe(true);
  });

  test("a field it does not take is refused before anything is read", async () => {
    const { deps: fake, calls } = deps();
    await expect(
      executeRecord(
        { ...INPUT, facts: [] } as unknown as RecordInput,
        CONTEXT,
        fake,
      ),
    ).rejects.toBeInstanceOf(KbRejection);
    expect(calls.asked).toEqual([]);
    expect(calls.upserts).toEqual([]);
  });

  test("a payload kb_upsert's schema refuses is refused as kb_upsert would", async () => {
    const { deps: fake, calls } = deps();
    const error = await executeRecord(
      {
        ...INPUT,
        code: [
          { file: "", symbol: "rotate" },
          { file: "", symbol: "expire" },
        ],
      },
      CONTEXT,
      fake,
    ).catch((failure: unknown) => failure);
    expect(error).toBeInstanceOf(InputError);
    expect((error as InputError).code).toBe("VALIDATION_FAILED");
    expect((error as InputError).message).toContain(
      "kb_upsert refuses the payload kb_record built from this input: ",
    );
    expect((error as InputError).message).toMatch(
      /\/implementedBy\/0\/sourceFile[^;]*; [^;]*\/implementedBy\/1\/sourceFile/,
    );
    expect(calls.upserts).toEqual([]);
  });

  test("a check that fails after the write says the requirement was written", async () => {
    const { deps: fake } = deps({
      check: async () => {
        throw new Error("no git index");
      },
    });
    const error = (await executeRecord(INPUT, CONTEXT, fake).catch(
      (failure: unknown) => failure,
    )) as OperationError;
    expect(error).toBeInstanceOf(OperationError);
    expect(error.code).toBe("RECORD_VERDICT_FAILED");
    expect(error.retryable).toBe(true);
    expect(error.message).toBe(
      "REQ-keys-rotate-yearly-2 was written by kb_upsert; kb_check changed:true failed after it: no git index. Run kb_check with changed:true for src/keys.ts, src/audit.ts to get the verdict.",
    );
    const thrown = (await executeRecord(
      INPUT,
      CONTEXT,
      deps({
        check: async () => {
          throw "plain";
        },
      }).deps,
    ).catch((failure: unknown) => failure)) as OperationError;
    expect(thrown.message).toContain("failed after it: plain.");
  });
});
