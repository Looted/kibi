/* eslint-disable @typescript-eslint/no-explicit-any */
// file-level: allow explicit any for test scaffolding
// @ts-ignore - bun:test provided by Bun runtime
import { describe, expect, test } from "bun:test";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import changesetSchema from "../src/schemas/changeset.schema.json";
import entitySchema from "../src/schemas/entity.schema.json";
import relationshipSchema from "../src/schemas/relationship.schema.json";

// helper: try to register the JSON Schema 2020-12 meta-schema from ajv package
async function addDraft2020Meta(ajvInstance: any) {
  try {
    // @ts-ignore
    const mod = await import("ajv/dist/refs/json-schema-draft-2020-12.json");
    const meta = mod?.default ?? mod;
    if (meta) ajvInstance.addMetaSchema(meta);
    return;
  } catch (e) {
    // ignore
  }
  try {
    // fallback to local copy if present
    // @ts-ignore
    const mod2 = await import("../src/schemas/json-schema-draft-2020-12.json");
    const meta2 = mod2?.default ?? mod2;
    if (meta2) ajvInstance.addMetaSchema(meta2);
  } catch (e) {
    // ignore
  }
}

describe("Entity Schema", () => {
  test("validates correct entity", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(entitySchema as any);
    const entity = {
      id: "test-1",
      title: "Test",
      status: "open",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      source: "https://example.com",
      type: "req",
    };
    expect(validate(entity)).toBe(true);
  });

  test("accepts documented entity-specific statuses", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(entitySchema as any);
    const base = {
      id: "test-entity",
      title: "Test",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      source: "https://example.com",
    };

    expect(validate({ ...base, type: "req", status: "open" })).toBe(true);
    expect(validate({ ...base, type: "test", status: "passing" })).toBe(true);
    expect(validate({ ...base, type: "adr", status: "accepted" })).toBe(true);
    expect(validate({ ...base, type: "flag", status: "inactive" })).toBe(true);
    expect(validate({ ...base, type: "symbol", status: "removed" })).toBe(true);
  });

  test("rejects entity missing title", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(entitySchema as any);
    const entity = {
      id: "test-1",
      status: "open",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      source: "https://example.com",
      type: "req",
    };
    expect(validate(entity)).toBe(false);
  });
});

describe("Relationship Schema", () => {
  test("valid relationship", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(relationshipSchema as any);
    const rel = { type: "depends_on", from: "a", to: "b" };
    expect(validate(rel)).toBe(true);
  });

  test("invalid relationship missing to", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(relationshipSchema as any);
    const rel = { type: "depends_on", from: "a" };
    expect(validate(rel)).toBe(false);
  });
});

describe("Changeset Schema", () => {
  test("valid changeset with upsert", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    // register dependent schemas so $ref can be resolved
    // @ts-ignore
    ajv.addSchema(entitySchema as any, "entity.schema.json");
    // @ts-ignore
    ajv.addSchema(relationshipSchema as any, "relationship.schema.json");
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(changesetSchema as any);
    const cs = {
      operations: [
        {
          operation: "upsert",
          entity: {
            id: "e1",
            title: "T",
            status: "open",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
            source: "https://x",
            type: "req",
          },
        },
      ],
      metadata: { timestamp: "2024-01-01T00:00:00Z" },
    };
    expect(validate(cs)).toBe(true);
  });

  test("accepts changeset upserts with documented req status", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    // @ts-ignore
    ajv.addSchema(entitySchema as any, "entity.schema.json");
    // @ts-ignore
    ajv.addSchema(relationshipSchema as any, "relationship.schema.json");
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(changesetSchema as any);
    const cs = {
      operations: [
        {
          operation: "upsert",
          entity: {
            id: "e-open",
            title: "T",
            status: "open",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
            source: "https://x",
            type: "req",
          },
        },
      ],
      metadata: { timestamp: "2024-01-01T00:00:00Z" },
    };
    expect(validate(cs)).toBe(true);
  });

  test("invalid changeset with delete missing id", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    await addDraft2020Meta(ajv);
    // register dependent schemas so $ref can be resolved
    // @ts-ignore
    ajv.addSchema(entitySchema as any, "entity.schema.json");
    // @ts-ignore
    ajv.addSchema(relationshipSchema as any, "relationship.schema.json");
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(changesetSchema as any);
    const cs = { operations: [{ operation: "delete" }] };
    expect(validate(cs)).toBe(false);
  });
});

describe("Future Strict Fact Model Schema (RED: pending implementation)", () => {
  test("should accept strict fact with future normalized fields (currently fails)", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(entitySchema as any);

    // Future strict fact model fields based on design doc
    const strictFact = {
      id: "FACT-SESSION-TIMEOUT-30",
      title: "Session timeout is 30 minutes",
      status: "active",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      source: "facts/FACT-SESSION-TIMEOUT-30.md",
      type: "fact",
      // Future strict fact model fields
      fact_kind: "property_value", // property_value | observation | constraint | meta
      subject_key: "user.session",
      property_key: "timeout_minutes",
      operator: "eq", // eq | lt | gt | lte | gte | ne | in | not_in
      value_type: "int", // int | string | bool | float | enum | timestamp
      value_int: 30,
      value_string: null,
      unit: "minutes",
      scope: "global", // global | tenant | user | session
      polarity: "positive", // positive | negative
      canonical_key: "user.session.timeout_minutes.eq.30",
    };

    // RED TEST: Should validate successfully once strict fact model is implemented.
    // Currently FAILS because additionalProperties is false and rejects unknown fields.
    const isValid = validate(strictFact);
    expect(isValid).toBe(true);
  });

  test("should accept strict fact with value_string instead of value_int", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(entitySchema as any);

    const strictFactWithString = {
      id: "FACT-USER-TYPE-ADMIN",
      title: "User type can be admin",
      status: "active",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      source: "facts/FACT-USER-TYPE-ADMIN.md",
      type: "fact",
      fact_kind: "property_value",
      subject_key: "user.type",
      property_key: "allowed_value",
      operator: "eq",
      value_type: "string",
      value_int: null,
      value_string: "admin",
      unit: null,
      scope: "global",
      polarity: "positive",
      canonical_key: "user.type.allowed_value.eq.admin",
    };

    // RED TEST: Should validate successfully once strict fact model is implemented.
    // Currently FAILS because additionalProperties is false and rejects unknown fields.
    const isValid = validate(strictFactWithString);
    expect(isValid).toBe(true);
  });

  test("should accept observation fact with required observation fields", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(entitySchema as any);

    const observationFact = {
      id: "FACT-OBS-SESSION-001",
      title: "Observed session count on 2024-01-01",
      status: "active",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      source: "facts/FACT-OBS-SESSION-001.md",
      type: "fact",
      fact_kind: "observation",
      subject_key: "system.sessions",
      property_key: "active_count",
      operator: "eq",
      value_type: "int",
      value_int: 150,
      observed_at: "2024-01-01T12:00:00Z",
      observer: "metrics-collector",
      confidence: 0.95,
      sample_size: 1000,
      scope: "global",
      polarity: "positive",
      canonical_key: "system.sessions.active_count.eq.150",
    };

    // RED TEST: Should validate successfully once strict fact model is implemented.
    // Currently FAILS because additionalProperties is false and rejects unknown fields.
    const isValid = validate(observationFact);
    expect(isValid).toBe(true);
  });
});
