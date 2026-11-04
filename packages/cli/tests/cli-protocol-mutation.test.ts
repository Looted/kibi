// implements REQ-kibi-operation-interface-parity
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { InputError, OperationError } from "../src/cli-errors.js";
import * as loader from "../src/cli-operation-loader.js";
import {
  type CliContext,
  executeOperation,
  openFailureResult,
} from "../src/cli-protocol.js";
import { EngineQueryLimitError } from "../src/engine-limits.js";
import * as telemetry from "../src/usage-telemetry.js";

function context(overrides: Partial<CliContext> = {}): CliContext {
  return {
    workspaceRoot: "/ws",
    signal: new AbortController().signal,
    clock: () => new Date(0),
    ...overrides,
  } as CliContext;
}

const restores: Array<() => void> = [];
afterEach(() => {
  for (const restore of restores.splice(0)) restore();
});

type Spec = {
  name?: string;
  cliName?: string;
  outputSchema?: object;
  execute: (input: unknown, context: CliContext) => Promise<unknown>;
};

function stubSpec(spec: Spec) {
  const load = spyOn(loader, "loadOperationSpec").mockResolvedValue({
    name: spec.name ?? "kb_status",
    cliName: spec.cliName ?? "status",
    effects: ["kb-read"],
    resultVersion: `kibi.${spec.name ?? "kb_status"}.v1`,
    businessInputSchema: {
      type: "object",
      properties: { q: { type: "string" } },
    },
    ...(spec.outputSchema ? { outputSchema: spec.outputSchema } : {}),
    execute: spec.execute,
  } as never);
  restores.push(() => load.mockRestore());
}

const json = (text: string | undefined) => JSON.parse(text ?? "null");

function errorEnvelope(
  operation: string,
  error: Record<string, unknown>,
  effectStatus: string,
  effects = ["kb-read"],
) {
  return {
    kibiProtocol: 1,
    operation,
    resultVersion: `kibi.${operation}.v1`,
    status: "error",
    data: null,
    effects: effects.map((kind) =>
      effectStatus === "failed"
        ? { kind, status: "failed", errorCode: error.code }
        : { kind, status: effectStatus },
    ),
    diagnostics: [],
    nextActions: [],
    error,
  };
}

describe("executeOperation", () => {
  test("an unknown operation is an input error with no effects", async () => {
    const result = await executeOperation("kb_nope", {}, context());
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toBe(
      "Error [UNKNOWN_OPERATION]: Unknown operation 'kb_nope'.\n",
    );
    expect(json(result.stdout)).toStrictEqual(
      errorEnvelope(
        "kb_nope",
        {
          code: "UNKNOWN_OPERATION",
          message: "Unknown operation 'kb_nope'.",
          retryable: false,
        },
        "failed",
        [],
      ),
    );
    expect(result.stdout?.endsWith("}\n")).toBe(true);
  });

  test("invalid input of an integrated command lists only the errors", async () => {
    stubSpec({ execute: async () => ({}) });
    const result = await executeOperation(
      "kb_status",
      { q: 1, x: 2 },
      context(),
    );
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toBe(
      "Error [VALIDATION_FAILED]: / must NOT have additional properties: x; /q must be string: string\n",
    );
    expect(json(result.stdout).error).toStrictEqual({
      code: "VALIDATION_FAILED",
      message:
        "/ must NOT have additional properties: x; /q must be string: string",
      retryable: false,
    });
    expect(json(result.stdout).effects).toStrictEqual([
      { kind: "kb-read", status: "not_applicable" },
    ]);
  });

  test("invalid input of a JSON-only command points at its schema", async () => {
    stubSpec({
      name: "kb_skills_list",
      cliName: "skills list",
      execute: async () => ({}),
    });
    const result = await executeOperation(
      "kb_skills_list",
      { q: 1, x: 1 },
      context(),
    );
    expect(result.stderr).toBe(
      "Error [VALIDATION_FAILED]: / must NOT have additional properties: x; /q must be string: string. Run 'kibi skills-list --schema' to print the input fields and allowed values.\n",
    );
  });

  test("a valid result is one JSON envelope; telemetry reaches the operation", async () => {
    const seen: unknown[] = [];
    stubSpec({
      execute: async (input, ctx) => {
        seen.push(input, ctx.diagnosticTelemetry, ctx.workspaceRoot);
        return { structuredContent: { answer: 42 } };
      },
    });
    const result = await executeOperation(
      "kb_status",
      { q: "a", _diagnostic_telemetry: { attempt: 1 } },
      context(),
    );
    expect(seen).toStrictEqual([{ q: "a" }, { attempt: 1 }, "/ws"]);
    expect(result).toStrictEqual({
      exitCode: 0,
      stdout: `${JSON.stringify({
        kibiProtocol: 1,
        operation: "kb_status",
        resultVersion: "kibi.kb_status.v1",
        status: "success",
        data: { answer: 42 },
        effects: [{ kind: "kb-read", status: "completed" }],
        diagnostics: [],
        nextActions: [],
      })}\n`,
    });
  });

  test("without telemetry the context is passed through unchanged", async () => {
    const ctx = context();
    let received: unknown;
    stubSpec({
      execute: async (_input, given) => {
        received = given;
        return {};
      },
    });
    await executeOperation("kb_status", {}, ctx);
    expect(received).toBe(ctx);
  });

  test("an output schema with unknown keywords still validates", async () => {
    stubSpec({
      outputSchema: {
        type: "object",
        "x-kibi": true,
        properties: { status: { const: "success" } },
      },
      execute: async () => ({}),
    });
    expect((await executeOperation("kb_status", {}, context())).exitCode).toBe(
      0,
    );
  });

  test("an envelope outside the output contract is a protocol failure", async () => {
    for (const outputSchema of [
      { type: "object", required: ["missing"] },
      { type: "no-such-type" },
    ]) {
      stubSpec({ outputSchema, execute: async () => ({}) });
      const result = await executeOperation("kb_status", {}, context());
      restores.pop()?.();
      expect(result.exitCode).toBe(1);
      expect(json(result.stdout)).toStrictEqual(
        errorEnvelope(
          "kb_status",
          {
            code: "PROTOCOL_VALIDATION_FAILED",
            message:
              "Operation produced a result that does not satisfy its generated output contract.",
            retryable: true,
          },
          "failed",
        ),
      );
    }
  });

  test("a result reporting an error exits 1 with its error on stderr", async () => {
    stubSpec({ execute: async () => ({ status: "rejected" }) });
    const result = await executeOperation("kb_status", {}, context());
    const envelope = json(result.stdout);
    expect(result).toStrictEqual({
      exitCode: 1,
      stdout: `${JSON.stringify(envelope)}\n`,
      stderr: `Error [BOOTSTRAP_PLAN_REJECTED]: ${envelope.error.message}\n`,
    });
    expect(envelope.status).toBe("error");
  });

  test("a detached read-only answer carries the snapshot notice", async () => {
    stubSpec({ execute: async () => ({}) });
    const result = await executeOperation(
      "kb_status",
      {},
      context({
        branchAttachment: {
          kbBranch: "main",
          storePath: "/s",
          readOnly: { notice: "read only", head: "abc", branchesAtHead: [] },
        },
      } as unknown as Partial<CliContext>),
    );
    expect(json(result.stdout).diagnostics).toStrictEqual([
      {
        code: "detached_head_read_only",
        severity: "warning",
        message: "read only",
        detail: {
          head: "abc",
          branchesAtHead: [],
          kbBranch: "main",
          storePath: "/s",
          writes: "refused",
        },
      },
    ]);
  });

  test("thrown errors become error envelopes", async () => {
    const cases: Array<[unknown, number, Record<string, unknown>]> = [
      [
        new InputError("BAD", "bad input"),
        2,
        { code: "BAD", message: "bad input", retryable: false },
      ],
      [
        new OperationError("BROKE", "it broke", false),
        1,
        { code: "BROKE", message: "it broke", retryable: false },
      ],
      [
        new Error("plain failure"),
        1,
        { code: "OPERATION_FAILED", message: "plain failure", retryable: true },
      ],
      [
        "a string",
        1,
        {
          code: "OPERATION_FAILED",
          message: "Operation failed unexpectedly.",
          retryable: true,
        },
      ],
    ];
    const noted: unknown[] = [];
    const note = spyOn(telemetry, "noteCliThrownError").mockImplementation(
      (error) => {
        noted.push(error);
      },
    );
    restores.push(() => note.mockRestore());
    for (const [thrown, exitCode, error] of cases) {
      stubSpec({
        execute: async () => {
          throw thrown;
        },
      });
      const result = await executeOperation("kb_status", {}, context());
      restores.pop()?.();
      expect(result.exitCode).toBe(exitCode);
      expect(result.stderr).toBe(`Error [${error.code}]: ${error.message}\n`);
      expect(json(result.stdout)).toStrictEqual(
        errorEnvelope("kb_status", error, "failed"),
      );
    }
    // Only a plain Error is noted: coded errors and non-errors are not.
    expect(noted).toStrictEqual([cases[2]?.[0]]);
  });

  test("a read stopped at its engine limit reports the limit", async () => {
    const limit = { kind: "time", limit: 5 } as const;
    stubSpec({
      execute: async () => {
        throw new EngineQueryLimitError(limit as never);
      },
    });
    const result = await executeOperation("kb_status", {}, context());
    const envelope = json(result.stdout);
    expect(envelope.error).toStrictEqual({
      code: "QUERY_LIMIT_EXCEEDED",
      message: new EngineQueryLimitError(limit as never).message,
      retryable: false,
      details: { limitExceeded: limit },
    });
    expect(envelope.effects).toStrictEqual([
      { kind: "kb-read", status: "failed", errorCode: "QUERY_LIMIT_EXCEEDED" },
    ]);
  });
});

describe("openFailureResult", () => {
  test("reports the route as never attempted", () => {
    const spec = { name: "kb_upsert", effects: ["kb-write" as never] };
    for (const [error, message] of [
      [new Error("no branch"), "no branch"],
      ["detached", "detached"],
    ] as const) {
      const result = openFailureResult("kb_upsert", spec, error);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toBe(`Error [OPERATION_FAILED]: ${message}\n`);
      expect(json(result.stdout)).toStrictEqual(
        errorEnvelope(
          "kb_upsert",
          { code: "OPERATION_FAILED", message, retryable: false },
          "not_applicable",
          ["kb-write"],
        ),
      );
    }
  });
});
