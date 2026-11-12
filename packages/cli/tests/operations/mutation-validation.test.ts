import { describe, expect, test } from "bun:test";
import { validateUpsertInput } from "../../src/operations/mutation/validation.js";

describe("mutation granularity validation", () => {
  test("accepts test-suite as a coarse symbol reason", () => {
    const validated = validateUpsertInput(
      {
        type: "symbol",
        id: "SYM-test-suite",
        properties: {
          title: "test suite anchor",
          status: "active",
          sourceFile: "packages/cli/tests/example.test.ts",
          granularity_reason: "test-suite",
        },
      },
      new Date("2026-08-24T00:00:00.000Z"),
    );

    expect(validated.entity.granularity_reason).toBe("test-suite");
  });
});

describe("symbol sourceFile validation", () => {
  test("rejects a sourceFile pointing into .kb/", () => {
    expect(() =>
      validateUpsertInput(
        {
          type: "symbol",
          id: "SYM-KB-INTERNAL",
          properties: {
            title: "kb internal symbol",
            status: "active",
            sourceFile: ".kb/tests/test-public-beta.md",
          },
        },
        new Date("2026-09-07T00:00:00.000Z"),
      ),
    ).toThrow(/sourceFile must point at a real code file/);
  });

  test("accepts a sourceFile outside .kb/", () => {
    const validated = validateUpsertInput(
      {
        type: "symbol",
        id: "SYM-REAL-FILE",
        properties: {
          title: "real symbol",
          status: "active",
          sourceFile: "src/auth/login.ts",
        },
      },
      new Date("2026-09-07T00:00:00.000Z"),
    );
    expect(validated.entity.sourceFile).toBe("src/auth/login.ts");
  });

  test("rejects an absolute sourceFile path", () => {
    expect(() =>
      validateUpsertInput(
        {
          type: "symbol",
          id: "SYM-ABS-ESCAPE",
          properties: {
            title: "API_SECRET_TOKEN",
            status: "active",
            sourceFile: "/tmp/outside-secret.ts",
          },
        },
        new Date("2026-10-19T00:00:00.000Z"),
      ),
    ).toThrow(/workspace-relative path/);
  });

  test("rejects a sourceFile with .. escapes", () => {
    expect(() =>
      validateUpsertInput(
        {
          type: "symbol",
          id: "SYM-DOTDOT-ESCAPE",
          properties: {
            title: "API_SECRET_TOKEN",
            status: "active",
            sourceFile: "../outside-secret.ts",
          },
        },
        new Date("2026-10-19T00:00:00.000Z"),
      ),
    ).toThrow(/workspace-relative path/);
  });

  test("ignores symbols without a sourceFile", () => {
    const validated = validateUpsertInput(
      {
        type: "symbol",
        id: "SYM-NO-SOURCE",
        properties: {
          title: "no source",
          status: "active",
        },
      },
      new Date("2026-09-07T00:00:00.000Z"),
    );
    expect(validated.entity.sourceFile).toBeUndefined();
  });
});

describe("retired requirement validation", () => {
  const at = new Date("2026-11-11T00:00:00.000Z");
  const retired = (extra: Record<string, unknown>, type = "req") =>
    validateUpsertInput(
      {
        type,
        id: "REQ-GONE",
        properties: { title: "gone", status: "retired", ...extra },
      },
      at,
    );

  test("rejects status retired without retired_reason", () => {
    expect(() => retired({})).toThrow(
      "Entity validation failed: status retired requires retired_reason saying why the behavior no longer exists (with the date or change that retired it)",
    );
  });

  test("rejects a blank retired_reason through the schema", () => {
    expect(() => retired({ retired_reason: "   " })).toThrow(/retired_reason/);
  });

  test("accepts status retired with a reason", () => {
    expect(
      retired({ retired_reason: "Removed on 2026-10-30." }).entity,
    ).toMatchObject({
      status: "retired",
      retired_reason: "Removed on 2026-10-30.",
    });
  });

  test("rejects retired_reason on a non-requirement", () => {
    expect(() =>
      retired({ retired_reason: "Removed on 2026-10-30." }, "scenario"),
    ).toThrow(/retired_reason is only valid on req entities/);
  });

  test("leaves a retired status on another entity type to the schema", () => {
    expect(retired({}, "fact").entity.status).toBe("retired");
  });
});

describe("proof exemption validation", () => {
  test("rejects proof_exempt without a reason", () => {
    expect(() =>
      validateUpsertInput(
        {
          type: "req",
          id: "REQ-EXEMPT-NO-REASON",
          properties: {
            title: "exempt without reason",
            status: "open",
            priority: "must",
            proof_exempt: true,
          },
        },
        new Date("2026-09-07T00:00:00.000Z"),
      ),
    ).toThrow(/proof_exempt requires a non-empty proof_exempt_reason/);
  });

  test("rejects an empty proof_exempt_reason", () => {
    expect(() =>
      validateUpsertInput(
        {
          type: "req",
          id: "REQ-EXEMPT-EMPTY-REASON",
          properties: {
            title: "exempt empty reason",
            status: "open",
            priority: "must",
            proof_exempt: true,
            proof_exempt_reason: "   ",
          },
        },
        new Date("2026-09-07T00:00:00.000Z"),
      ),
    ).toThrow(/proof_exempt requires a non-empty proof_exempt_reason/);
  });

  test("accepts proof_exempt with a reason", () => {
    const validated = validateUpsertInput(
      {
        type: "req",
        id: "REQ-EXEMPT-OK",
        properties: {
          title: "toolchain currency gate",
          status: "open",
          priority: "must",
          proof_exempt: true,
          proof_exempt_reason:
            "architectural boundary: verified by toolchain CI, not product E2E",
        },
      },
      new Date("2026-09-07T00:00:00.000Z"),
    );
    expect(validated.entity.proof_exempt).toBe(true);
  });

  test("ignores non-exempt requirements", () => {
    const validated = validateUpsertInput(
      {
        type: "req",
        id: "REQ-NOT-EXEMPT",
        properties: {
          title: "normal requirement",
          status: "open",
          priority: "must",
        },
      },
      new Date("2026-09-07T00:00:00.000Z"),
    );
    expect(validated.entity.proof_exempt).toBeUndefined();
  });
});

describe("status vocabulary errors", () => {
  test("an invalid status lists only the values of the entity's type", () => {
    let message = "";
    try {
      validateUpsertInput(
        {
          type: "test",
          id: "TEST-STATUS",
          properties: { title: "status", status: "unknown" },
        },
        new Date("2026-08-24T00:00:00.000Z"),
      );
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain(
      "/status: must be equal to one of the allowed values. Allowed values for test entities: passing, failing, skipped, pending",
    );
    expect(message).not.toContain("accepted");
  });
});
