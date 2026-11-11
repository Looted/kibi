import { describe, expect, test } from "bun:test";

import { KbRejection } from "../src/cli-errors";
import { prepareOperationInput } from "../src/cli-validate";
import { validateUpsertInput } from "../src/operations/mutation/validation";
import { analyzeSemanticAdvisorInput } from "../src/operations/semantic-advisor/analyze-prose";
import {
  assertSemanticInventoryBoundary,
  inventoryIssues,
} from "../src/operations/semantic-advisor/ingestion-boundary";
import {
  kibiSchemaFieldNames,
  operationTelemetrySignals,
  schemaFieldPath,
  schemaIssues,
} from "../src/telemetry-details";

function rejectionOf(run: () => unknown): KbRejection {
  try {
    run();
  } catch (error) {
    if (error instanceof KbRejection) return error;
    throw error;
  }
  throw new Error("expected a rejection");
}

describe("schema field paths", () => {
  test("keep Kibi schema names, star list positions and hide invented keys", () => {
    expect(kibiSchemaFieldNames().has("status")).toBe(true);
    expect(kibiSchemaFieldNames().has("semantic_inventory")).toBe(true);
    expect(schemaFieldPath(["relationships", "3", "type"])).toBe(
      "relationships.*.type",
    );
    expect(schemaFieldPath(["status"])).toBe("status");
    expect(schemaFieldPath(["customerSecretField"])).toBe("other");
    expect(schemaFieldPath(["properties", "acme_internal"])).toBe("other");
    expect(schemaFieldPath([])).toBe("");
  });

  test("Ajv errors become rule and field, never values", () => {
    expect(
      schemaIssues([
        {
          keyword: "enum",
          instancePath: "/status",
          schemaPath: "#/properties/status/enum",
          params: { allowedValues: ["open"] },
          message: "must be equal to one of the allowed values",
        },
        {
          keyword: "required",
          instancePath: "",
          schemaPath: "#/required",
          params: { missingProperty: "title" },
        },
        {
          keyword: "additionalProperties",
          instancePath: "",
          schemaPath: "#/additionalProperties",
          params: { additionalProperty: "acme_secret_key" },
        },
        {
          keyword: "type",
          instancePath: "/relationships/0/to",
          schemaPath: "#/type",
          params: { type: "string" },
        },
      ]),
    ).toEqual([
      { rule: "enum", field: "status" },
      { rule: "required", field: "title" },
      { rule: "additionalProperties", field: "other" },
      { rule: "type", field: "relationships.*.to" },
    ]);
    expect(schemaIssues(null)).toEqual([]);
    expect(
      schemaIssues(
        [{ keyword: "type", instancePath: "", schemaPath: "#", params: {} }],
        [],
      ),
    ).toEqual([{ rule: "type" }]);
  });
});

describe("rejections carry their issues", () => {
  test("an invalid entity names the schema rule and field", () => {
    const rejection = rejectionOf(() =>
      validateUpsertInput(
        {
          type: "req",
          id: "REQ-secret",
          properties: { title: "Secret", status: "bogus" },
        },
        new Date(),
      ),
    );
    expect(rejection.code).toBe("ENTITY_VALIDATION_FAILED");
    expect(rejection.issues[0]).toEqual({ rule: "enum", field: "status" });
    expect(
      rejectionOf(() =>
        validateUpsertInput({ type: "req", id: "" } as never, new Date()),
      ).issues,
    ).toEqual([{ rule: "required", field: "id" }]);
    expect(
      rejectionOf(() =>
        validateUpsertInput(
          {
            type: "symbol",
            id: "SYM-x",
            properties: {
              title: "x",
              status: "active",
              sourceFile: ".kb/x.md",
            },
          },
          new Date(),
        ),
      ).issues,
    ).toEqual([{ rule: "symbol_source_in_kb", field: "sourceFile" }]);
    expect(
      rejectionOf(() =>
        validateUpsertInput(
          {
            type: "req",
            id: "REQ-x",
            properties: { title: "x", status: "open" },
            relationships: [{ type: "bogus", from: "REQ-x", to: "TEST-x" }],
          },
          new Date(),
        ),
      ).issues[0]?.field,
    ).toMatch(/^relationships\.\*/);
  });

  test("a requirement without an inventory is one inventory_missing issue", () => {
    const payload = {
      type: "req",
      id: "REQ-secret",
      properties: {
        title: "Secret",
        status: "open",
        semantic_text: "The export shall finish within 5 seconds.",
      },
    };
    const { receipt } = analyzeSemanticAdvisorInput({ payload });
    const rejection = rejectionOf(() =>
      assertSemanticInventoryBoundary(payload, [], receipt),
    );
    expect(rejection.code).toBe("INCOMPLETE_PROPOSITIONS");
    expect(rejection.issues).toEqual([
      { rule: "inventory_missing", field: "semantic_inventory" },
    ]);
    const stale = {
      ...payload,
      properties: {
        ...payload.properties,
        semantic_inventory_version: "kibi.semantic-inventory.v1",
        semantic_source_field: "semantic_text",
        semantic_source_hash: "0",
        semantic_inventory: [],
        logic_claims: [],
      },
    };
    const rules = rejectionOf(() =>
      assertSemanticInventoryBoundary(stale, [], receipt),
    ).issues.map((issue) => issue.rule);
    expect(rules).toContain("source_hash");
    expect(rules).toContain("inventory_count");
    expect(rules).toContain("logic_claims_mismatch");
    expect(
      inventoryIssues(stale, [
        "semantic_inventory[2] does not match advisor proposition 'x'",
        "a check added later",
      ]),
    ).toStrictEqual([
      { rule: "proposition_mismatch", field: "semantic_inventory" },
      { rule: "inventory_other" },
    ]);
  });

  test("invalid JSON input names its schema rule", () => {
    const prepared = prepareOperationInput(
      { query: 3 },
      {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    );
    expect(prepared.valid).toBe(false);
    if (!prepared.valid) {
      expect(prepared.issues?.[0]?.rule).toBe("type");
    }
  });
});

describe("operation signals", () => {
  test("an upsert reports dry run, relationship count, its entity and its refusal", () => {
    const error = new KbRejection("ENTITY_VALIDATION_FAILED", "secret", [
      { rule: "enum", field: "status" },
    ]);
    expect(
      operationTelemetrySignals({
        operation: "kb_upsert",
        args: {
          type: "req",
          id: "REQ-1",
          dryRun: true,
          relationships: [{}, {}],
        },
        error,
      }),
    ).toEqual({
      dryRun: true,
      relationshipCount: 2,
      retryKey: "req\0REQ-1",
      issues: [{ rule: "enum", field: "status" }],
      error,
    });
    expect(
      operationTelemetrySignals({
        operation: "kb_validate_upsert",
        args: { type: "req" },
        result: {
          data: {
            valid: false,
            errorCode: "DOCUMENT_PATH_REQUIRED",
          },
        },
      }),
    ).toEqual({ dryRun: true, rejectionCode: "DOCUMENT_PATH_REQUIRED" });
    expect(
      operationTelemetrySignals({
        operation: "kb_upsert",
        args: { type: "req", id: "REQ-2" },
        result: {
          data: {
            valid: false,
            rejection: {
              code: "INCOMPLETE_PROPOSITIONS",
              issues: [
                { rule: "inventory_missing", field: "semantic_inventory" },
                7,
              ],
            },
          },
        },
        inputIssues: [{ rule: "type" }],
      }),
    ).toMatchObject({
      dryRun: false,
      rejectionCode: "INCOMPLETE_PROPOSITIONS",
      issues: [
        { rule: "type" },
        { rule: "inventory_missing", field: "semantic_inventory" },
      ],
    });
  });

  test("a search reports its result count, abstention and hints", () => {
    expect(
      operationTelemetrySignals({
        operation: "kb_search",
        result: {
          structuredContent: {
            count: 0,
            queryAnalysis: { hints: { items: [{ id: "REQ-x" }] } },
          },
        },
      }),
    ).toEqual({
      search: true,
      resultCount: 0,
      abstained: true,
      hintsShown: true,
    });
    expect(
      operationTelemetrySignals({
        operation: "kb_search",
        result: { data: { count: 4 } },
      }),
    ).toEqual({
      search: true,
      resultCount: 4,
      abstained: false,
      hintsShown: false,
    });
    expect(operationTelemetrySignals({ operation: "kb_search" })).toEqual({});
    expect(
      operationTelemetrySignals({ operation: "kb_status", args: 5 }),
    ).toEqual({});
  });
});

describe("signal edges", () => {
  test("schema names come from properties maps of both schemas only", () => {
    const names = kibiSchemaFieldNames();
    expect(names.has("confidence")).toBe(true);
    expect(names.has("closedWorld")).toBe(true);
    expect(names.has("minLength")).toBe(false);
    expect(names.has("additionalProperties")).toBe(false);
    expect(names.has("depends_on")).toBe(false);
    expect(schemaFieldPath(["relationships", "12", "to"])).toBe(
      "relationships.*.to",
    );
    expect(schemaFieldPath(["relationships", "3a"])).toBe("other");
    expect(schemaFieldPath(["relationships", "a3"])).toBe("other");
    expect(schemaFieldPath(["", "status"])).toBe("other");
    expect(
      schemaIssues([
        {
          keyword: "required",
          instancePath: "/properties",
          schemaPath: "#",
          params: { missingProperty: 5, additionalProperty: "status" },
        },
      ]),
    ).toStrictEqual([{ rule: "required", field: "properties.status" }]);
  });

  test("results and issues are read strictly", () => {
    const signals = (result: unknown, operation = "kb_upsert") =>
      operationTelemetrySignals({
        operation,
        args: { id: "REQ-1", relationships: "x" },
        result,
      });
    expect(
      signals({
        data: {
          rejection: {
            issues: [
              null,
              { field: "status" },
              { rule: "enum", field: 5 },
              { rule: "type", field: "status" },
            ],
          },
        },
      }),
    ).toStrictEqual({
      error: undefined,
      issues: [{ rule: "enum" }, { rule: "type", field: "status" }],
      dryRun: false,
    });
    expect(
      signals({ data: { valid: true, errorCode: "DOCUMENT_PATH_REQUIRED" } }),
    ).toStrictEqual({ error: undefined, dryRun: false });
    expect(
      signals({
        data: { valid: false, errorCode: 7 },
        structuredContent: { valid: false, errorCode: "IGNORED" },
      }),
    ).toStrictEqual({ error: undefined, dryRun: false });
    expect(
      signals({ structuredContent: { valid: false, errorCode: "MCP_CODE" } }),
    ).toStrictEqual({
      error: undefined,
      dryRun: false,
      rejectionCode: "MCP_CODE",
    });
    expect(signals({ data: "x" })).toStrictEqual({
      error: undefined,
      dryRun: false,
    });
    expect(signals({ data: {} }, "kb_search")).toStrictEqual({
      error: undefined,
      search: true,
      hintsShown: false,
    });
    expect(
      signals(
        { data: { queryAnalysis: { hints: { items: [] } } } },
        "kb_search",
      ),
    ).toStrictEqual({ error: undefined, search: true, hintsShown: false });
  });
});
