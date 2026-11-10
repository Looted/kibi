import { describe, expect, test } from "bun:test";
import {
  ENTITY_ORIGIN_KINDS,
  ENTITY_ORIGIN_SCHEMA,
  SCHEMA6_MIGRATION_ORIGIN_REF,
  normalizeEntityOrigin,
  readEntityOrigin,
} from "../../src/public/entity-origin.js";
import { expectGolden } from "./helpers/golden.js";

describe("entity origin vocabulary", () => {
  test("pins kinds, migration ref and schema", () => {
    expect(ENTITY_ORIGIN_KINDS).toStrictEqual([
      "human",
      "agent",
      "migration",
      "import",
    ]);
    expect(SCHEMA6_MIGRATION_ORIGIN_REF).toBe("kibi migrate v5->v6");
    expectGolden("entity-origin-schema", ENTITY_ORIGIN_SCHEMA);
  });
});

describe("normalizeEntityOrigin", () => {
  test.each([[null], [[]], ["human"], [3]])(
    "rejects non-mapping %p",
    (value) => {
      expect(normalizeEntityOrigin(value)).toStrictEqual({
        error: "origin must be a mapping with at least a kind",
      });
    },
  );

  test("rejects unknown fields", () => {
    expect(
      normalizeEntityOrigin({ kind: "human", by: "x", at: "y", ref: "r" }),
    ).toStrictEqual({
      error:
        "origin has unknown field(s) by, at; allowed: kind, ref, approved_by, recorded_at",
    });
  });

  test.each([{}, { kind: 1 }, { kind: "robot" }, { kind: "Human" }])(
    "rejects kind in %p",
    (value) => {
      expect(normalizeEntityOrigin(value)).toStrictEqual({
        error: "origin.kind must be one of human, agent, migration, import",
      });
    },
  );

  test.each(["human", "agent", "migration", "import"])(
    "accepts kind %p alone",
    (kind) => {
      expect(normalizeEntityOrigin({ kind })).toStrictEqual({
        origin: { kind },
      });
    },
  );

  test("trims ref and approved_by", () => {
    expect(
      normalizeEntityOrigin({
        kind: "agent",
        ref: "  https://x  ",
        approved_by: " Ann ",
        recorded_at: " 2026-01-02 ",
      }),
    ).toStrictEqual({
      origin: {
        kind: "agent",
        ref: "https://x",
        approved_by: "Ann",
        recorded_at: "2026-01-02",
      },
    });
  });

  test.each([
    ["ref", ""],
    ["ref", "   "],
    ["ref", 5],
    ["approved_by", ""],
    ["approved_by", null],
  ])("rejects %p = %p", (field, value) => {
    expect(
      normalizeEntityOrigin({ kind: "human", [field]: value }),
    ).toStrictEqual({ error: `origin.${field} must be a non-empty string` });
  });

  test("stores a YAML Date as its ISO string", () => {
    expect(
      normalizeEntityOrigin({
        kind: "human",
        recorded_at: new Date("2026-03-04T05:06:07.000Z"),
      }),
    ).toStrictEqual({
      origin: { kind: "human", recorded_at: "2026-03-04T05:06:07.000Z" },
    });
  });

  test.each([
    "2026-01-02",
    "2026-01-02T03:04",
    "2026-01-02 03:04",
    "2026-01-02T03:04:05",
    "2026-01-02T03:04:05.1",
    "2026-01-02T03:04:05.123Z",
    "2026-01-02T03:04Z",
    "2026-01-02T03:04:05+02:00",
    "2026-01-02T03:04:05-0530",
    "12345-01-02".slice(1),
  ])("accepts timestamp %p", (recorded_at) => {
    expect(normalizeEntityOrigin({ kind: "human", recorded_at })).toStrictEqual(
      {
        origin: { kind: "human", recorded_at },
      },
    );
  });

  test.each([
    "",
    "  ",
    7,
    new Date("nope"),
    "x2026-01-02",
    "2026-01-02x",
    "202-01-02",
    "20261-01-02",
    "2026-1-02",
    "2026-001-02",
    "2026-01-2",
    "2026-01-002",
    "2026/01/02",
    "2026-01-02X03:04",
    "2026-01-02T3:04",
    "2026-01-02T003:04",
    "2026-01-02T03:4",
    "2026-01-02T03:004",
    "2026-01-02T03",
    "2026-01-02T03:04:5",
    "2026-01-02T03:04:005",
    "2026-01-02T03:04:05.",
    "2026-01-02T03:04:05.x",
    "2026-01-02T03:04:05z",
    "2026-01-02T03:04:05+2:00",
    "2026-01-02T03:04:05+002:00",
    "2026-01-02T03:04:05+02:0",
    "2026-01-02T03:04:05+02:000",
    "2026-01-02T03:04:05*02:00",
    "2026-01-02T03:04:05+02::00",
    "aaaa-bb-cc",
    "2026-01-02Taa:bb",
    "2026-01-02T03:04:cc",
    "2026-01-02T03:04:05.dd",
    "2026-01-02T03:04:05+ee:ff",
  ])("rejects timestamp %p", (recorded_at) => {
    expect(normalizeEntityOrigin({ kind: "human", recorded_at })).toStrictEqual(
      {
        error: "origin.recorded_at must be an ISO-8601 timestamp",
      },
    );
  });
});

describe("readEntityOrigin", () => {
  test("reads an object or its JSON string", () => {
    expect(readEntityOrigin({ kind: "agent", ref: "r" })).toStrictEqual({
      kind: "agent",
      ref: "r",
    });
    expect(readEntityOrigin('{"kind":"import"}')).toStrictEqual({
      kind: "import",
    });
  });

  test("reads malformed values as absent", () => {
    expect(readEntityOrigin("{not json")).toBeNull();
    expect(readEntityOrigin('{"kind":"robot"}')).toBeNull();
    expect(readEntityOrigin(undefined)).toBeNull();
  });
});
