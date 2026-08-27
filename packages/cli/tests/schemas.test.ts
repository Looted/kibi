/* eslint-disable @typescript-eslint/no-explicit-any */
// file-level: allow explicit any for test scaffolding
// @ts-ignore - bun:test provided by Bun runtime
import { describe, expect, test } from "bun:test";
import Ajv from "ajv";
import type { AnySchema } from "ajv";
import addFormats from "ajv-formats";
import changesetSchema from "../src/schemas/changeset.schema.json";
import entitySchema from "../src/schemas/entity.schema.json";
import relationshipSchema from "../src/schemas/relationship.schema.json";

// helper: try to register the JSON Schema 2020-12 meta-schema from ajv package
async function addDraft2020Meta(ajvInstance: Ajv) {
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
    const validate = ajv.compile(entitySchema);
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
    const validate = ajv.compile(entitySchema);
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

  test("accepts a requirement logical-claim manifest", () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(entitySchema as AnySchema);

    expect(
      validate({
        id: "REQ-LOGIC-COVERAGE",
        title: "Requirement with complete logical claims",
        status: "open",
        created_at: "2026-08-04T00:00:00Z",
        updated_at: "2026-08-04T00:00:00Z",
        source: "docs/requirements/logic.md",
        type: "req",
        logic_claims: ["CLAIM-0123456789ABCDEF"],
      }),
    ).toBe(true);
  });

  test("accepts requirement semantic_text and rejects it on other entities", () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(entitySchema as AnySchema);
    const entity = {
      id: "REQ-SEMANTIC-SOURCE",
      title: "Separate semantic prose from evidence",
      status: "open",
      created_at: "2026-08-11T00:00:00Z",
      updated_at: "2026-08-11T00:00:00Z",
      source: ".kb/requirements/REQ-SEMANTIC-SOURCE.md",
      semantic_text: "Authored requirement prose.",
      semantic_source_field: "semantic_text",
    };

    expect(validate({ ...entity, type: "req" })).toBe(true);
    expect(
      validate({ ...entity, id: "SCEN-SEMANTIC-SOURCE", type: "scenario" }),
    ).toBe(false);
  });

  test("accepts verification receipts only on scoped test entities", () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(entitySchema as AnySchema);
    const base = {
      id: "TEST-RECEIPT-SCHEMA",
      title: "Receipt schema test",
      status: "failing",
      created_at: "2026-08-10T00:00:00Z",
      updated_at: "2026-08-10T00:00:00Z",
      source: ".kb/tests/TEST-RECEIPT-SCHEMA.md",
      verification_scope: "end_to_end",
      verification_receipts: [
        {
          version: "kibi.verification-receipt.v1",
          receipt_id: "VR-SCHEMA-00000001",
          test_id: "TEST-RECEIPT-SCHEMA",
          runner: "bun:test",
          command: "bun test receipt.test.ts",
          scope: "end_to_end",
          outcome: "passed",
          code_snapshot:
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          environment_hash:
            "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          started_at: "2026-08-10T12:00:00Z",
          finished_at: "2026-08-10T12:01:00Z",
          artifact_digest:
            "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        },
      ],
    };

    expect(validate({ ...base, type: "test" })).toBe(true);
    expect(
      validate({
        ...base,
        type: "test",
        verification_receipts: Array.from({ length: 51 }, (_, index) => ({
          ...base.verification_receipts[0],
          receipt_id: `VR-SCHEMA-${String(index).padStart(8, "0")}`,
        })),
      }),
    ).toBe(true);
    expect(validate({ ...base, type: "req" })).toBe(false);
    const { verification_scope: _scope, ...withoutScope } = base;
    expect(validate({ ...withoutScope, type: "test" })).toBe(false);
  });

  test("rejects entity missing title", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(entitySchema as AnySchema);
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
    const validate = ajv.compile(relationshipSchema as AnySchema);
    const rel = { type: "depends_on", from: "a", to: "b" };
    expect(validate(rel)).toBe(true);
  });

  test("valid ontology relationship", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(relationshipSchema as unknown);
    const rel = {
      type: "requires_predicate",
      from: "REQ-POST-DELETE",
      to: "FACT-CAN-USER-DELETE-POST",
    };
    expect(validate(rel)).toBe(true);
  });

  test("invalid relationship missing to", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(relationshipSchema as unknown);
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
    ajv.addSchema(entitySchema as unknown, "entity.schema.json");
    // @ts-ignore
    ajv.addSchema(relationshipSchema as unknown, "relationship.schema.json");
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(changesetSchema as unknown);
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
    ajv.addSchema(entitySchema as unknown, "entity.schema.json");
    // @ts-ignore
    ajv.addSchema(relationshipSchema as unknown, "relationship.schema.json");
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(changesetSchema as unknown);
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
    ajv.addSchema(entitySchema as unknown, "entity.schema.json");
    // @ts-ignore
    ajv.addSchema(relationshipSchema as unknown, "relationship.schema.json");
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(changesetSchema as unknown);
    const cs = { operations: [{ operation: "delete" }] };
    expect(validate(cs)).toBe(false);
  });
});

describe("Typed Fact Schema", () => {
  test("accepts legacy prose fact without fact_kind", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(entitySchema as AnySchema);

    const legacyFact = {
      id: "FACT-LEGACY-001",
      title: "Legacy prose fact",
      status: "active",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      source: "facts/FACT-LEGACY-001.md",
      type: "fact",
    };

    const isValid = validate(legacyFact);
    expect(isValid).toBe(true);
  });

  test("accepts subject fact with subject_key", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(entitySchema as AnySchema);

    const subjectFact = {
      id: "FACT-USER-SESSION",
      title: "User session subject",
      status: "active",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      source: "facts/FACT-USER-SESSION.md",
      type: "fact",
      fact_kind: "subject",
      subject_key: "user.session",
    };

    const isValid = validate(subjectFact);
    expect(isValid).toBe(true);
  });

  test("accepts property_value fact with value_int", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(entitySchema as AnySchema);

    const propertyFact = {
      id: "FACT-SESSION-TIMEOUT-30",
      title: "Session timeout is 30 minutes",
      status: "active",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      source: "facts/FACT-SESSION-TIMEOUT-30.md",
      type: "fact",
      fact_kind: "property_value",
      subject_key: "user.session",
      property_key: "timeout_minutes",
      operator: "eq",
      value_type: "int",
      value_int: 30,
      unit: "minutes",
      scope: "global",
      polarity: "require",
      closed_world: true,
      valid_from: "2024-01-01T00:00:00Z",
      valid_to: "2024-12-31T23:59:59Z",
      canonical_key: "user.session.timeout_minutes.eq.30",
    };

    const isValid = validate(propertyFact);
    expect(isValid).toBe(true);
  });

  test("accepts predicate_schema fact for project-local ontology contracts", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(entitySchema as AnySchema);

    const predicateSchemaFact = {
      id: "FACT-SCHEMA-CAN",
      title: "Predicate schema: auth.can/3",
      status: "active",
      created_at: "2026-05-30T00:00:00Z",
      updated_at: "2026-05-30T00:00:00Z",
      source: "docs/ontology/auth.md",
      type: "fact",
      fact_kind: "predicate_schema",
      predicate_name: "can",
      predicate_namespace: "auth",
      predicate_arity: 3,
      argument_names: ["actor", "action", "resource"],
      argument_types: ["role", "action", "resource"],
      aliases: ["may", "is allowed to"],
      examples: ["auth.can(user, delete, post)"],
    };

    expect(validate(predicateSchemaFact)).toBe(true);
  });

  test("accepts predicate fact for a ground ontology claim", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(entitySchema as AnySchema);

    const predicateFact = {
      id: "FACT-CAN-USER-DELETE-POST",
      title: "User can delete post",
      status: "active",
      created_at: "2026-05-30T00:00:00Z",
      updated_at: "2026-05-30T00:00:00Z",
      source: "docs/requirements/posts.md",
      type: "fact",
      fact_kind: "predicate",
      predicate_name: "can",
      predicate_namespace: "auth",
      predicate_args: ["user", "delete", "post"],
      argument_types: ["role", "action", "resource"],
      polarity: "assert",
      canonical_key: "auth.can.role:user.action:delete.resource:post.assert",
      claim_key: "CLAIM-0123456789ABCDEF",
      claim_text: "A user may delete a post.",
    };

    expect(validate(predicateFact)).toBe(true);
  });

  test("rejects incomplete logical-claim provenance", () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(entitySchema as AnySchema);
    const propertyFact = {
      id: "FACT-SESSION-TIMEOUT-30",
      title: "Session timeout is 30 minutes",
      status: "active",
      created_at: "2026-08-04T00:00:00Z",
      updated_at: "2026-08-04T00:00:00Z",
      source: "facts/FACT-SESSION-TIMEOUT-30.md",
      type: "fact",
      fact_kind: "property_value",
      subject_key: "user.session",
      property_key: "timeout_minutes",
      operator: "eq",
      value_type: "int",
      value_int: 30,
      polarity: "require",
      canonical_key: "user.session.timeout_minutes.eq.30",
      claim_key: "CLAIM-0123456789ABCDEF",
    };

    expect(validate(propertyFact)).toBe(false);
  });

  test("rejects predicate fact missing required ontology fields", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(entitySchema as AnySchema);

    const predicateFact = {
      id: "FACT-CAN-MALFORMED",
      title: "Malformed predicate fact",
      status: "active",
      created_at: "2026-05-30T00:00:00Z",
      updated_at: "2026-05-30T00:00:00Z",
      source: "docs/requirements/posts.md",
      type: "fact",
      fact_kind: "predicate",
      predicate_name: "can",
    };

    expect(validate(predicateFact)).toBe(false);
  });

  test("rejects property_value fact with predicate polarity", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(entitySchema as AnySchema);

    const propertyFact = {
      id: "FACT-STRICT-ASSERT",
      title: "Invalid strict property polarity",
      status: "active",
      created_at: "2026-05-30T00:00:00Z",
      updated_at: "2026-05-30T00:00:00Z",
      source: "facts/FACT-STRICT-ASSERT.md",
      type: "fact",
      fact_kind: "property_value",
      subject_key: "user.session",
      property_key: "timeout_minutes",
      operator: "eq",
      value_type: "int",
      value_int: 30,
      polarity: "assert",
    };

    expect(validate(propertyFact)).toBe(false);
  });

  test("accepts property_value fact with value_string", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(entitySchema as unknown);

    const propertyFact = {
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
      value_string: "admin",
      scope: "global",
      polarity: "require",
      canonical_key: "user.type.allowed_value.eq.admin",
    };

    const isValid = validate(propertyFact);
    expect(isValid).toBe(true);
  });

  test("accepts property_value fact with value_number", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(entitySchema as unknown);

    const propertyFact = {
      id: "FACT-RATE-LIMIT-1-5",
      title: "Rate limit is 1.5 requests per second",
      status: "active",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      source: "facts/FACT-RATE-LIMIT-1-5.md",
      type: "fact",
      fact_kind: "property_value",
      subject_key: "api.client",
      property_key: "rate_limit_rps",
      operator: "eq",
      value_type: "number",
      value_number: 1.5,
      unit: "requests_per_second",
      scope: "global",
      polarity: "require",
      canonical_key: "api.client.rate_limit_rps.eq.1.5",
    };

    const isValid = validate(propertyFact);
    expect(isValid).toBe(true);
  });

  test("accepts property_value fact with value_bool", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(entitySchema as unknown);

    const propertyFact = {
      id: "FACT-FEATURE-FLAG-ON",
      title: "Feature flag is enabled",
      status: "active",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      source: "facts/FACT-FEATURE-FLAG-ON.md",
      type: "fact",
      fact_kind: "property_value",
      subject_key: "feature.new-ui",
      property_key: "enabled",
      operator: "eq",
      value_type: "bool",
      value_bool: true,
      scope: "global",
      polarity: "require",
      canonical_key: "feature.new-ui.enabled.eq.true",
    };

    const isValid = validate(propertyFact);
    expect(isValid).toBe(true);
  });

  test("accepts observation fact with observation fields", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(entitySchema as unknown);

    const observationFact = {
      id: "FACT-OBS-SESSION-001",
      title: "Observed session count",
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
      scope: "global",
      polarity: "require",
    };

    const isValid = validate(observationFact);
    expect(isValid).toBe(true);
  });

  test("accepts meta fact", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(entitySchema as unknown);

    const metaFact = {
      id: "FACT-META-001",
      title: "Meta fact about facts",
      status: "active",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      source: "facts/FACT-META-001.md",
      type: "fact",
      fact_kind: "meta",
      subject_key: "fact.schema",
    };

    const isValid = validate(metaFact);
    expect(isValid).toBe(true);
  });

  test("rejects non-fact entity with fact_kind", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(entitySchema as unknown);

    const reqWithFactKind = {
      id: "REQ-001",
      title: "Requirement with fact_kind",
      status: "open",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      source: "reqs/REQ-001.md",
      type: "req",
      fact_kind: "property_value",
    };

    const isValid = validate(reqWithFactKind);
    expect(isValid).toBe(false);
  });

  test("rejects non-fact entity with value_int", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(entitySchema as unknown);

    const reqWithValueInt = {
      id: "REQ-002",
      title: "Requirement with value_int",
      status: "open",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      source: "reqs/REQ-002.md",
      type: "req",
      value_int: 42,
    };

    const isValid = validate(reqWithValueInt);
    expect(isValid).toBe(false);
  });

  test("rejects invalid fact_kind enum value", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(entitySchema as unknown);

    const factWithInvalidKind = {
      id: "FACT-INVALID",
      title: "Invalid fact kind",
      status: "active",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      source: "facts/FACT-INVALID.md",
      type: "fact",
      fact_kind: "invalid_kind",
    };

    const isValid = validate(factWithInvalidKind);
    expect(isValid).toBe(false);
  });

  test("rejects invalid operator enum value", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(entitySchema as unknown);

    const factWithInvalidOperator = {
      id: "FACT-INVALID",
      title: "Invalid operator",
      status: "active",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      source: "facts/FACT-INVALID.md",
      type: "fact",
      fact_kind: "property_value",
      subject_key: "user",
      property_key: "name",
      operator: "contains",
    };

    const isValid = validate(factWithInvalidOperator);
    expect(isValid).toBe(false);
  });

  test("rejects invalid value_type enum value", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(entitySchema as unknown);

    const factWithInvalidValueType = {
      id: "FACT-INVALID",
      title: "Invalid value type",
      status: "active",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      source: "facts/FACT-INVALID.md",
      type: "fact",
      fact_kind: "property_value",
      subject_key: "user",
      property_key: "name",
      value_type: "date",
    };

    const isValid = validate(factWithInvalidValueType);
    expect(isValid).toBe(false);
  });

  test("rejects invalid polarity enum value", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(entitySchema as unknown);

    const factWithInvalidPolarity = {
      id: "FACT-INVALID",
      title: "Invalid polarity",
      status: "active",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      source: "facts/FACT-INVALID.md",
      type: "fact",
      fact_kind: "property_value",
      subject_key: "user",
      property_key: "name",
      polarity: "maybe",
    };

    const isValid = validate(factWithInvalidPolarity);
    expect(isValid).toBe(false);
  });
});
