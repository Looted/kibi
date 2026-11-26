import { describe, expect, test } from "bun:test";

import { prepareOperationInput } from "../../src/cli-validate.js";
import { advertisedInputSchema } from "../../src/public/operations/advertised-schema.js";
import {
  INPUT_ALIASES,
  withInputAliases,
} from "../../src/public/operations/input-aliases.js";
import { searchSpec } from "../../src/public/operations/specs/discovery.js";

const schema = {
  type: "object",
  required: ["query"],
  properties: {
    query: { type: "string", [INPUT_ALIASES]: ["question", 7, "ask"] },
    scope: { type: "string", [INPUT_ALIASES]: ["area"] },
    limit: { type: "integer" },
    plain: true,
    loose: { type: "string", [INPUT_ALIASES]: "free" },
  },
};

describe("withInputAliases", () => {
  test("moves a field given under another name to its own name", () => {
    expect(withInputAliases({ question: "q", limit: 2 }, schema)).toEqual({
      query: "q",
      limit: 2,
    });
  });

  test("moves every aliased field of one input", () => {
    const input = { question: "q", area: "auth" };
    const result = withInputAliases(input, schema);
    expect(result).toEqual({ query: "q", scope: "auth" });
    expect(input).toEqual({ question: "q", area: "auth" });
  });

  test("returns the same input when nothing is aliased", () => {
    const input = { query: "q", free: "x" };
    expect(withInputAliases(input, schema)).toBe(input);
  });

  test("keeps the other name when the field is given under its own name", () => {
    const input = { query: "q", question: "other" };
    expect(withInputAliases(input, schema)).toBe(input);
  });

  test("keeps every name when the field is given under more than one", () => {
    const input = { question: "q", ask: "other" };
    expect(withInputAliases(input, schema)).toBe(input);
  });

  test("leaves input alone for a schema without properties", () => {
    const input = { question: "q" };
    expect(withInputAliases(input, { type: "object" })).toBe(input);
    expect(withInputAliases(input, { properties: [] })).toBe(input);
  });
});

describe("kb_search query aliases", () => {
  const contract = searchSpec.businessInputSchema;

  test("a question is validated and run as the query", () => {
    expect(
      prepareOperationInput({ question: "label limit" }, contract),
    ).toEqual({ valid: true, businessInput: { query: "label limit" } });
  });

  test("a question beside a query is refused as an unknown field", () => {
    const result = prepareOperationInput(
      { query: "labels", question: "label limit" },
      contract,
    );
    expect(result.valid).toBe(false);
    expect(result.valid ? [] : result.errors).toContain(
      "/ must NOT have additional properties: question",
    );
  });

  test("another name kb_search does not declare is refused", () => {
    const result = prepareOperationInput({ search: "label limit" }, contract);
    expect(result.valid ? [] : result.errors).toEqual([
      "/ must have required property 'query': query",
      "/ must NOT have additional properties: search",
    ]);
  });

  test("a question is refused for a query that declares no other name", () => {
    const { [INPUT_ALIASES]: _aliases, ...query } = contract.properties.query;
    const result = prepareOperationInput(
      { question: "label limit" },
      { ...contract, properties: { ...contract.properties, query } },
    );
    expect(result.valid ? [] : result.errors).toEqual([
      "/ must have required property 'query': query",
      "/ must NOT have additional properties: question",
    ]);
  });

  test("the advertised schema names only query", () => {
    const advertised = advertisedInputSchema(contract) as {
      properties: Record<string, Record<string, unknown>>;
    };
    expect(advertised.properties.query).not.toHaveProperty(INPUT_ALIASES);
    expect(JSON.stringify(advertised)).not.toContain(`"question"`);
  });
});
