import { describe, expect, test } from "bun:test";

import {
  KIBI_PROTOCOL_VERSION,
  UPSERT_DRY_RUN_INVALID,
  appendPayloadCountField,
  codedErrorOf,
  failedEffectStatus,
  normalizeResultPayload,
  operationData,
  resultVersion,
  toKibiResult,
} from "../../../src/public/operations/result-envelope.js";

const readSpec = { name: "kb_status", effects: [] as const };
const writeSpec = {
  name: "kb_delete",
  effects: ["kb-write", "workspace-write"] as const,
};
const STORE_HINT =
  "An empty answer here does not mean no requirement governs this; run `kibi sync` and ask again.";

describe("constants and re-exports", () => {
  test("exposes the protocol version, dry-run code and coded errors", () => {
    expect(KIBI_PROTOCOL_VERSION).toBe(1);
    expect(UPSERT_DRY_RUN_INVALID).toBe("UPSERT_DRY_RUN_INVALID");
    expect(typeof codedErrorOf).toBe("function");
  });
});

describe("resultVersion", () => {
  test("prefers the declared version and defaults from the name", () => {
    expect(
      resultVersion({ name: "kb_x", resultVersion: "kibi.custom.v2" }),
    ).toBe("kibi.custom.v2");
    expect(resultVersion({ name: "kb_x" })).toBe("kibi.kb_x.v1");
  });
});

describe("failedEffectStatus", () => {
  test("copies the detail and a string error code only", () => {
    expect(
      failedEffectStatus("kb-write", { detail: { a: 1 }, errorCode: "E1" }),
    ).toStrictEqual({
      kind: "kb-write",
      status: "failed",
      detail: { a: 1 },
      errorCode: "E1",
    });
    expect(failedEffectStatus("kb-write", { errorCode: 7 })).toStrictEqual({
      kind: "kb-write",
      status: "failed",
      detail: undefined,
    });
  });
});

describe("toKibiResult envelope", () => {
  test("builds a success envelope without an error key", () => {
    const result = toKibiResult(readSpec, { ok: true });
    expect(result).toStrictEqual({
      kibiProtocol: 1,
      operation: "kb_status",
      resultVersion: "kibi.kb_status.v1",
      status: "success",
      data: { ok: true },
      effects: [],
      diagnostics: [],
      nextActions: [],
    });
    expect("error" in result).toBe(false);
  });

  test("uses the declared result version", () => {
    expect(
      toKibiResult({ ...readSpec, resultVersion: "kibi.s.v3" }, null)
        .resultVersion,
    ).toBe("kibi.s.v3");
  });

  test("treats non-record data as no row", () => {
    for (const data of [null, [{ status: "rejected" }], "rejected", 3]) {
      const result = toKibiResult(writeSpec, data);
      expect(result.status).toBe("success");
      expect(result.data).toStrictEqual(data);
      expect(result.effects).toStrictEqual([
        { kind: "kb-write", status: "completed" },
        { kind: "workspace-write", status: "completed" },
      ]);
    }
  });

  test("derives status from the row unless one is given", () => {
    expect(
      toKibiResult(readSpec, { status: "committed_with_repairs" }).status,
    ).toBe("committed_with_repairs");
    expect(toKibiResult(readSpec, { status: "other" }).status).toBe("success");
    expect(
      toKibiResult(readSpec, { status: "rejected" }, { status: "success" })
        .status,
    ).toBe("success");
    expect(
      toKibiResult(
        readSpec,
        { status: "committed_with_repairs" },
        { status: "error" },
      ).status,
    ).toBe("error");
  });

  test("rejects a bootstrap plan with a fixed error", () => {
    const result = toKibiResult(writeSpec, { status: "rejected" });
    expect(result.status).toBe("error");
    expect(result.error).toStrictEqual({
      code: "BOOTSTRAP_PLAN_REJECTED",
      message:
        "Bootstrap stopped at a deterministic failure. Inspect actionResults for committed actions and re-plan from the current state.",
      retryable: false,
    });
    expect(result.effects).toStrictEqual([
      {
        kind: "kb-write",
        status: "failed",
      },
      {
        kind: "workspace-write",
        status: "failed",
      },
    ]);
  });

  test("lets an explicit error replace the derived one", () => {
    const error = { code: "X", message: "m", retryable: true };
    expect(
      toKibiResult(readSpec, { status: "rejected" }, { error }).error,
    ).toBe(error);
  });
});

describe("toKibiResult dry runs", () => {
  const upsert = { name: "kb_upsert", effects: ["kb-write"] as const };

  test("joins stringified errors into the refusal message", () => {
    const result = toKibiResult(upsert, {
      dryRun: true,
      valid: false,
      errors: ["a", 2],
    });
    expect(result.status).toBe("error");
    expect(result.error).toStrictEqual({
      code: "UPSERT_DRY_RUN_INVALID",
      message:
        "Dry run: kb_upsert would refuse this payload; nothing was written. a; 2",
      retryable: false,
    });
    expect(result.effects).toStrictEqual([
      { kind: "kb-write", status: "not_applicable" },
    ]);
  });

  test("trims the message when errors are absent", () => {
    expect(
      toKibiResult(upsert, { dryRun: true, valid: false, errors: "x" }).error
        ?.message,
    ).toBe(
      "Dry run: kb_upsert would refuse this payload; nothing was written.",
    );
  });

  test("keeps an explicit attempted flag", () => {
    expect(
      toKibiResult(upsert, { dryRun: true, valid: false }, { attempted: true })
        .effects,
    ).toStrictEqual([
      {
        kind: "kb-write",
        status: "failed",
      },
    ]);
  });

  test("needs a strict dry run and a strictly invalid payload", () => {
    for (const row of [
      { dryRun: "true", valid: false },
      { dryRun: true, valid: 0 },
      { dryRun: false, valid: false },
      { valid: false },
    ]) {
      const result = toKibiResult(upsert, row);
      expect(result.status).toBe("success");
      expect(result.error).toBeUndefined();
    }
  });
});

describe("toKibiResult migration refusals", () => {
  const apply = { name: "kb_apply_plan", effects: ["kb-write"] as const };
  const version = "kibi.migration-apply-result.v1";

  test("reports the first failed action detail", () => {
    const result = toKibiResult(apply, {
      version,
      outcome: "refused",
      actionResults: [
        "skip",
        { outcome: "applied", detail: "no" },
        { outcome: "failed", detail: "first" },
        { outcome: "failed", detail: "second" },
      ],
    });
    expect(result.status).toBe("error");
    expect(result.error).toStrictEqual({
      code: "MIGRATION_PLAN_REFUSED",
      message: "Migration plan refused; nothing was changed. first",
      retryable: false,
    });
    expect(result.effects).toStrictEqual([
      { kind: "kb-write", status: "not_applicable" },
    ]);
  });

  test("trims the message without a usable detail", () => {
    const message = "Migration plan refused; nothing was changed.";
    for (const actionResults of [
      undefined,
      "failed",
      [{ outcome: "applied", detail: "x" }],
      [{ outcome: "failed", detail: 4 }],
    ]) {
      expect(
        toKibiResult(apply, { version, outcome: "refused", actionResults })
          .error?.message,
      ).toBe(message);
    }
  });

  test("keeps an explicit attempted flag", () => {
    expect(
      toKibiResult(apply, { version, outcome: "refused" }, { attempted: true })
        .effects,
    ).toStrictEqual([
      {
        kind: "kb-write",
        status: "failed",
      },
    ]);
  });

  test("needs both the result version and the refused outcome", () => {
    for (const row of [
      { version: "kibi.other.v1", outcome: "refused" },
      { version, outcome: "applied" },
    ]) {
      const result = toKibiResult(apply, row);
      expect(result.status).toBe("success");
      expect(result.error).toBeUndefined();
    }
  });
});

describe("toKibiResult effects", () => {
  test("marks failed effects with or without an error code", () => {
    expect(
      toKibiResult(writeSpec, null, {
        status: "error",
        error: { code: "", message: "m", retryable: false },
      }).effects,
    ).toStrictEqual([
      { kind: "kb-write", status: "failed" },
      { kind: "workspace-write", status: "failed" },
    ]);
    expect(
      toKibiResult(writeSpec, null, { status: "error" }).effects,
    ).toStrictEqual([
      { kind: "kb-write", status: "failed" },
      { kind: "workspace-write", status: "failed" },
    ]);
    expect(
      toKibiResult(writeSpec, null, { status: "error", attempted: true })
        .effects,
    ).toStrictEqual([
      { kind: "kb-write", status: "failed" },
      { kind: "workspace-write", status: "failed" },
    ]);
    expect(
      toKibiResult(writeSpec, null, { status: "error", attempted: false })
        .effects,
    ).toStrictEqual([
      { kind: "kb-write", status: "not_applicable" },
      { kind: "workspace-write", status: "not_applicable" },
    ]);
  });

  test("completes effects on non-error statuses even when not attempted", () => {
    expect(
      toKibiResult(writeSpec, null, {
        status: "committed_with_repairs",
        attempted: false,
      }).effects,
    ).toStrictEqual([
      { kind: "kb-write", status: "completed" },
      { kind: "workspace-write", status: "completed" },
    ]);
  });

  test("matches effect failures by kind and appends undeclared ones", () => {
    const result = toKibiResult(writeSpec, {
      effectFailures: [
        "junk",
        ["kb-write"],
        { kind: 3, detail: "number kind" },
        { kind: "workspace-write", detail: "ws", errorCode: 9 },
        { kind: "cache-write", detail: "c1", errorCode: "C1" },
        { kind: "cache-write", detail: "c2", errorCode: "C2" },
        { kind: "log-write", detail: "l", errorCode: 1 },
      ],
    });
    expect(result.status).toBe("success");
    expect(result.effects).toStrictEqual([
      { kind: "kb-write", status: "completed" },
      { kind: "workspace-write", status: "failed", detail: "ws" },
      { kind: "cache-write", status: "failed", detail: "c1", errorCode: "C1" },
      { kind: "log-write", status: "failed", detail: "l" },
    ]);
  });

  test("ignores effect failures that are not a list", () => {
    expect(
      toKibiResult(writeSpec, {
        effectFailures: { kind: "kb-write" },
      }).effects,
    ).toStrictEqual([
      { kind: "kb-write", status: "completed" },
      { kind: "workspace-write", status: "completed" },
    ]);
  });

  test("an explicit failure wins over skipped effects", () => {
    expect(
      toKibiResult(writeSpec, {
        effectFailures: [{ kind: "kb-write", errorCode: "E" }],
        skippedEffects: ["kb-write", "workspace-write"],
      }).effects,
    ).toStrictEqual([
      { kind: "kb-write", status: "failed", detail: undefined, errorCode: "E" },
      { kind: "workspace-write", status: "not_applicable" },
    ]);
  });

  test("skipped effects win over an error outcome", () => {
    expect(
      toKibiResult(
        writeSpec,
        { skippedEffects: ["workspace-write"] },
        {
          status: "error",
          error: { code: "E", message: "m", retryable: false },
        },
      ).effects,
    ).toStrictEqual([
      { kind: "kb-write", status: "failed", errorCode: "E" },
      { kind: "workspace-write", status: "not_applicable" },
    ]);
  });

  test("needs skipped effects to be a list", () => {
    expect(
      toKibiResult(writeSpec, { skippedEffects: "kb-write workspace-write" })
        .effects,
    ).toStrictEqual([
      { kind: "kb-write", status: "completed" },
      { kind: "workspace-write", status: "completed" },
    ]);
  });
});

describe("toKibiResult diagnostics", () => {
  test("keeps string and message diagnostics only", () => {
    const kept = { message: "m", severity: "error" as const, code: "C" };
    const result = toKibiResult(readSpec, {
      diagnostics: ["plain", kept, { message: 3 }, ["x"], null, 5],
    });
    expect(result.diagnostics).toStrictEqual([
      { message: "plain", severity: "warning" },
      kept,
    ]);
    expect(result.diagnostics[1]).toBe(kept);
  });

  test("ignores diagnostics that are not a list", () => {
    expect(
      toKibiResult(readSpec, { diagnostics: "plain" }).diagnostics,
    ).toStrictEqual([]);
  });

  test("uses given diagnostics verbatim", () => {
    const diagnostics = [{ message: "given", severity: "info" as const }];
    expect(
      toKibiResult(
        { name: "kb_search", effects: [] },
        {
          diagnostics: ["dropped"],
          branchStore: { state: "not_compiled" },
        },
        { diagnostics },
      ).diagnostics,
    ).toBe(diagnostics);
  });

  test("warns when a search or query reads an uncompiled store", () => {
    for (const name of ["kb_search", "kb_query"]) {
      expect(
        toKibiResult(
          { name, effects: [] },
          {
            diagnostics: ["first"],
            branchStore: {
              state: "not_compiled",
              code: "STORE_NOT_COMPILED",
              detail: "Branch main has no store.",
            },
          },
        ).diagnostics,
      ).toStrictEqual([
        { message: "first", severity: "warning" },
        {
          code: "STORE_NOT_COMPILED",
          severity: "warning",
          message: `Branch main has no store. ${STORE_HINT}`,
        },
      ]);
    }
  });

  test("omits a non-string code and detail", () => {
    expect(
      toKibiResult(
        { name: "kb_query", effects: [] },
        { branchStore: { state: "not_compiled", code: 1, detail: 2 } },
      ).diagnostics,
    ).toStrictEqual([{ severity: "warning", message: STORE_HINT }]);
  });

  test("stays silent for other operations and store states", () => {
    for (const [name, branchStore] of [
      ["kb_status", { state: "not_compiled" }],
      ["kb_search", { state: "compiled" }],
      ["kb_search", "not_compiled"],
      ["kb_search", ["not_compiled"]],
      ["kb_search", undefined],
    ] as const) {
      expect(
        toKibiResult({ name, effects: [] }, { branchStore }).diagnostics,
      ).toStrictEqual([]);
    }
  });
});

describe("toKibiResult next actions", () => {
  test("keeps well-formed actions and coerces required", () => {
    const input = { id: "x" };
    const result = toKibiResult(readSpec, {
      nextActions: [
        { operation: "kb_sync", input, reason: "stale", required: true },
        { operation: "kb_check", reason: "verify", required: "yes" },
        { operation: 1, reason: "r" },
        { operation: "kb_x", reason: 2 },
        { reason: "r" },
        { operation: "kb_y" },
        "kb_sync",
        ["kb_sync"],
      ],
    });
    expect(result.nextActions).toStrictEqual([
      { operation: "kb_sync", input, reason: "stale", required: true },
      {
        operation: "kb_check",
        input: undefined,
        reason: "verify",
        required: false,
      },
    ]);
    expect(result.nextActions[0]?.input).toBe(input);
  });

  test("ignores next actions that are not a list and honours given ones", () => {
    expect(
      toKibiResult(readSpec, { nextActions: { operation: "x", reason: "y" } })
        .nextActions,
    ).toStrictEqual([]);
    const nextActions = [
      { operation: "kb_a" as const, input: 1, reason: "r", required: false },
    ];
    expect(
      toKibiResult(
        readSpec,
        { nextActions: [{ operation: "kb_b", reason: "s" }] },
        // biome-ignore lint/suspicious/noExplicitAny: operation names are a closed union
        { nextActions: nextActions as any },
      ).nextActions,
    ).toBe(nextActions);
  });
});

describe("operationData", () => {
  test("unwraps structured content when the key is present", () => {
    expect(operationData({ structuredContent: { a: 1 }, b: 2 })).toStrictEqual({
      a: 1,
    });
    expect(operationData({ structuredContent: undefined })).toBeUndefined();
    const plain = { a: 1 };
    expect(operationData(plain)).toBe(plain);
    const list = [{ structuredContent: 1 }];
    expect(operationData(list)).toBe(list);
    expect(operationData(null)).toBeNull();
    expect(operationData("x")).toBe("x");
  });
});

describe("normalizeResultPayload", () => {
  test("returns nothing for non-records", () => {
    expect(normalizeResultPayload(undefined)).toStrictEqual({});
    expect(normalizeResultPayload(null)).toStrictEqual({});
    expect(normalizeResultPayload([{ kibiProtocol: 1 }])).toStrictEqual({});
    expect(normalizeResultPayload("x")).toStrictEqual({});
  });

  test("treats a payload without the protocol as bare data", () => {
    const bare = { count: 2, kibiProtocol: 2 };
    expect(normalizeResultPayload(bare)).toStrictEqual({ data: bare });
    expect(normalizeResultPayload(bare).data).toBe(bare);
    const wrapped = { structuredContent: { count: 3 } };
    expect(normalizeResultPayload(wrapped).data).toBe(
      wrapped.structuredContent,
    );
    const notRecord = { structuredContent: [1], count: 4 };
    expect(normalizeResultPayload(notRecord)).toStrictEqual({
      data: notRecord,
    });
  });

  test("splits an envelope from its data", () => {
    const envelope = { kibiProtocol: 1, data: { count: 5 } };
    const bare = normalizeResultPayload(envelope);
    expect(bare).toStrictEqual({ envelope, data: { count: 5 } });
    expect(bare.envelope).toBe(envelope);
    expect(bare.data).toBe(envelope.data);
    expect(
      normalizeResultPayload({ structuredContent: envelope }).envelope,
    ).toBe(envelope);
    const noData = { kibiProtocol: 1, data: [1] };
    const resolved = normalizeResultPayload(noData);
    expect(resolved).toStrictEqual({ envelope: noData });
    expect("data" in resolved).toBe(false);
  });
});

describe("appendPayloadCountField", () => {
  const countOf = (count: unknown) => {
    const fields: Record<string, unknown> = { keep: true };
    appendPayloadCountField(fields, "hits", "results", { count });
    return fields;
  };

  test("records readable counts", () => {
    expect(countOf(4)).toStrictEqual({
      keep: true,
      hits: 4,
      result_summary: "4 results",
    });
    expect(countOf(0)).toStrictEqual({
      keep: true,
      hits: 0,
      result_summary: "0 results",
    });
    expect(countOf(" 12 ").hits).toBe(12);
    expect(countOf("0").hits).toBe(0);
  });

  test("records unreadable counts as unknown", () => {
    for (const count of [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      "",
      "   ",
      "abc",
      "Infinity",
      null,
      undefined,
      true,
      [3],
    ]) {
      expect(countOf(count)).toStrictEqual({
        keep: true,
        hits: null,
        result_summary: "results count unavailable",
      });
    }
    const fields: Record<string, unknown> = {};
    appendPayloadCountField(fields, "hits", "rows", undefined);
    expect(fields).toStrictEqual({
      hits: null,
      result_summary: "rows count unavailable",
    });
  });
});
