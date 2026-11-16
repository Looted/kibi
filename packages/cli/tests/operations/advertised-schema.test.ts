import { describe, expect, test } from "bun:test";
import Ajv from "ajv";

import {
  ADVERTISED_DESCRIPTION,
  ADVERTISED_DESCRIPTION_LIMIT,
  ADVERTISED_SUMMARY,
  advertisedFieldSchemaHints,
  advertisedInputSchema,
} from "../../src/public/operations/advertised-schema.js";
import { listSpecs } from "../../src/public/operations/catalog.js";
import { upsertSpec } from "../../src/public/operations/specs/upsert.js";
import { prepareOperationInput } from "../../src/cli-validate.js";

const contract = {
  type: "object",
  description: "Full contract.",
  [ADVERTISED_SUMMARY]: "One-line contract.",
  required: ["version"],
  properties: { version: { type: "string", const: "v1" } },
  additionalProperties: false,
};
const receipts = {
  type: "array",
  maxItems: 3,
  [ADVERTISED_SUMMARY]: "One-line receipts.",
  items: { type: "object", required: ["id"] },
};
const schema = {
  type: "object",
  properties: {
    properties: {
      type: "object",
      properties: {
        title: { type: "string", description: "Kept as it is." },
        proof_contract: contract,
        proof_receipts: receipts,
      },
    },
  },
};

describe("advertised input schemas", () => {
  test("replace each marked field with a one-line stub and keep every other field", () => {
    const advertised = advertisedInputSchema(schema);
    // The stub's shape differs from the full field's, which the generic
    // return type does not describe.
    expect(advertised.properties.properties.properties as unknown).toEqual({
      title: { type: "string", description: "Kept as it is." },
      proof_contract: { type: "object", description: "One-line contract." },
      proof_receipts: {
        type: "array",
        items: { type: "object" },
        description: "One-line receipts.",
      },
    });
    // The input contract itself is left as it was.
    expect(schema.properties.properties.properties.proof_contract).toBe(
      contract,
    );
  });

  test("a stub accepts every value the full field accepts", () => {
    const ajv = new Ajv({ strict: false });
    const full = ajv.compile(schema);
    const stubbed = ajv.compile(advertisedInputSchema(schema));
    const valid = {
      properties: {
        title: "t",
        proof_contract: { version: "v1" },
        proof_receipts: [{ id: "r" }],
      },
    };
    expect(full(valid)).toBe(true);
    expect(stubbed(valid)).toBe(true);
  });

  test("a rejection under a stubbed field names that field's full schema once", () => {
    expect(
      advertisedFieldSchemaHints(schema, [
        "/properties/proof_contract",
        "/properties/proof_contract/version",
        "/properties/proof_receipts/0",
        "/properties/title",
        "/missing/path",
      ]),
    ).toEqual([
      `/properties/proof_contract full schema: ${JSON.stringify({
        type: "object",
        description: "Full contract.",
        required: ["version"],
        properties: { version: { type: "string", const: "v1" } },
        additionalProperties: false,
      })}`,
      `/properties/proof_receipts full schema: ${JSON.stringify({
        type: "array",
        maxItems: 3,
        items: { type: "object", required: ["id"] },
      })}`,
    ]);
  });

  test("kb_upsert advertises its proof fields as stubs and keeps origin and firmness in full", () => {
    const advertised = advertisedInputSchema(upsertSpec.businessInputSchema);
    const fields = advertised.properties.properties.properties as Record<
      string,
      Record<string, unknown>
    >;
    for (const name of ["proof_contract", "proof_bindings", "proof_receipts"]) {
      expect(JSON.stringify(fields[name]).length).toBeLessThan(400);
    }
    const {
      [ADVERTISED_DESCRIPTION]: short,
      description: _full,
      ...origin
    } = upsertSpec.businessInputSchema.properties.properties.properties.origin;
    expect(fields.origin).toEqual({ ...origin, description: short });
    expect(fields.firmness?.enum).toEqual(["firm", "default", "exploratory"]);
    expect(JSON.stringify(advertised).length).toBeLessThan(
      JSON.stringify(upsertSpec.businessInputSchema).length - 15_000,
    );
  });

  test("advertise a marked field's short description and keep its schema", () => {
    const advertised = advertisedInputSchema({
      type: "object",
      properties: {
        note: {
          type: "string",
          minLength: 1,
          description: "A long rule with every detail.",
          [ADVERTISED_DESCRIPTION]: "A short rule.",
        },
        // A field named description is a field, not a description.
        description: {
          type: "string",
          description: "Free text.",
          [ADVERTISED_DESCRIPTION]: "Text.",
        },
        plain: { type: "string", description: "Kept as it is." },
      },
    });
    expect(advertised.properties as unknown).toEqual({
      note: { type: "string", minLength: 1, description: "A short rule." },
      description: { type: "string", description: "Text." },
      plain: { type: "string", description: "Kept as it is." },
    });
  });

  test("advertise a choice among string constants as an enum, and leave any other choice", () => {
    const choice = {
      anyOf: [
        { type: "string", const: "a" },
        { type: "string", const: "b" },
      ],
    };
    const mixed = [
      [{ type: "string", const: "a" }, { type: "number" }],
      [{ type: "string", const: "a", description: "A." }],
      [{ type: "number", const: 1 }],
      [{ type: "string", const: 1 }],
      ["a"],
      [],
    ];
    const advertised = advertisedInputSchema({
      type: "array",
      description: "Pick.",
      items: choice,
      anyOfs: mixed.map((anyOf) => ({ anyOf })),
      notAChoice: { anyOf: "a" },
    }) as unknown as Record<string, unknown>;
    expect(advertised.items).toEqual({ type: "string", enum: ["a", "b"] });
    expect(advertised.anyOfs).toEqual(mixed.map((anyOf) => ({ anyOf })));
    expect(advertised.notAChoice).toEqual({ anyOf: "a" });
    // The enum accepts exactly what the choice accepts.
    const ajv = new Ajv({ strict: false });
    const full = ajv.compile(choice);
    const short = ajv.compile(advertised.items as object);
    for (const value of ["a", "b", "c", 1])
      expect(short(value)).toBe(full(value));
  });

  test("name the markers that specs and other tools rely on", () => {
    expect(ADVERTISED_SUMMARY).toBe("x-kibi-advertised-summary");
    expect(ADVERTISED_DESCRIPTION).toBe("x-kibi-advertised-description");
  });

  test("walk into lists and leave null values and other choices as they are", () => {
    const strings = [
      { type: "string", const: "a" },
      { type: "string", const: "b" },
    ];
    const advertised = advertisedInputSchema({
      default: null,
      oneOf: [
        {
          type: "string",
          description: "Long.",
          [ADVERTISED_DESCRIPTION]: "Short.",
        },
      ],
      // Only anyOf becomes an enum.
      allOf: strings,
      anyOf: [
        { type: "number", const: "a" },
        { type: "string", const: "b" },
      ],
    }) as unknown as Record<string, unknown>;
    expect(advertised).toEqual({
      default: null,
      oneOf: [{ type: "string", description: "Short." }],
      allOf: strings,
      anyOf: [
        { type: "number", const: "a" },
        { type: "string", const: "b" },
      ],
    });
  });

  test("a rejection under an escaped name or a list item of a stubbed field names it", () => {
    const marked = { type: "object", [ADVERTISED_SUMMARY]: "Stub." };
    expect(
      advertisedFieldSchemaHints(
        {
          type: "object",
          properties: {
            "a/b": marked,
            "c~d": marked,
            rows: { type: "array", items: marked },
          },
        },
        ["/a~1b/x", "/c~0d", "/rows/0", "/rows/12/y", "/rows/x1", "/rows/1x"],
      ),
    ).toEqual([
      '/a~1b full schema: {"type":"object"}',
      '/c~0d full schema: {"type":"object"}',
      '/rows/0 full schema: {"type":"object"}',
      '/rows/12 full schema: {"type":"object"}',
    ]);
  });

  test("every catalog operation advertises each field description in at most the limit", () => {
    const tooLong: string[] = [];
    const walk = (name: string, value: unknown): void => {
      if (Array.isArray(value)) {
        for (const child of value) walk(name, child);
        return;
      }
      if (value === null || typeof value !== "object") return;
      for (const [key, child] of Object.entries(value)) {
        if (
          key === "description" &&
          typeof child === "string" &&
          child.length > ADVERTISED_DESCRIPTION_LIMIT
        )
          tooLong.push(`${name}: ${child}`);
        else walk(name, child);
      }
    };
    for (const spec of listSpecs())
      walk(spec.name, advertisedInputSchema(spec.businessInputSchema));
    expect(tooLong).toEqual([]);
  });

  test("the input contract rejects a malformed proof contract and spells out its schema", () => {
    const prepared = prepareOperationInput(
      {
        type: "test",
        id: "TEST-bad-contract",
        properties: {
          title: "Bad contract",
          status: "open",
          proof_contract: { version: "kibi.proof-contract.v1" },
        },
      },
      upsertSpec.businessInputSchema,
    );
    expect(prepared.valid).toBe(false);
    const errors = prepared.valid ? [] : prepared.errors;
    expect(errors).toContain(
      "/properties/proof_contract must have required property 'integration': integration",
    );
    expect(errors.filter((line) => line.includes("full schema:"))).toHaveLength(
      1,
    );
  });
});
