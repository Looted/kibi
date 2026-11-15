import { describe, expect, test } from "bun:test";
import Ajv from "ajv";

import {
  ADVERTISED_SUMMARY,
  advertisedFieldSchemaHints,
  advertisedInputSchema,
} from "../../src/public/operations/advertised-schema.js";
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
    expect(advertised.properties.properties.properties).toEqual({
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
    expect(fields.origin).toEqual(
      upsertSpec.businessInputSchema.properties.properties.properties.origin,
    );
    expect(fields.firmness?.enum).toEqual(["firm", "default", "exploratory"]);
    expect(JSON.stringify(advertised).length).toBeLessThan(
      JSON.stringify(upsertSpec.businessInputSchema).length - 15_000,
    );
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
