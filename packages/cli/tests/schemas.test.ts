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
      status: "active",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      source: "https://example.com",
      type: "req",
    };
    expect(validate(entity)).toBe(true);
  });

  test("rejects entity missing title", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(entitySchema as any);
    const entity = {
      id: "test-1",
      status: "active",
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
            status: "active",
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
