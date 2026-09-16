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
