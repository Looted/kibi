import { describe, expect, test } from "bun:test";
import { withStoredOmittedProperties } from "../../../src/operations/mutation/omitted-properties.js";
import type {
  StoredEntity,
  StoredEntityLookup,
} from "../../../src/operations/mutation/stored-entity.js";
import type { UpsertInput } from "../../../src/operations/mutation/types.js";

function lookupOf(stored: StoredEntity): StoredEntityLookup & {
  calls: number;
} {
  const lookup = {
    calls: 0,
    exists: async () => stored !== undefined,
    entity: async () => {
      lookup.calls += 1;
      return stored;
    },
  };
  return lookup;
}

const NOT_INHERITED = [
  "id",
  "type",
  "created_at",
  "updated_at",
  "source",
  "origin",
  "firmness",
  "approval_ref",
  "proof_receipts",
  "claim_key",
  "text_ref",
  "semantic_text",
  "semantic_clauses",
  "semantic_inventory",
  "semantic_inventory_version",
  "semantic_source_field",
  "semantic_source_hash",
  "logic_claims",
];

const input = (properties?: Record<string, unknown>): UpsertInput =>
  ({ type: "req", id: "REQ-1", properties }) as UpsertInput;

describe("withStoredOmittedProperties", () => {
  test("inherits omitted schema properties and keeps supplied ones", async () => {
    const stored: Record<string, unknown> = {
      type: "req",
      status: "open",
      priority: "must",
      owner: "team",
      tags: ["a"],
      not_a_schema_key: "x",
      title: null,
      summary: undefined,
      severity: null,
      rationale: undefined,
    };
    for (const key of NOT_INHERITED) stored[key] ??= `stored-${key}`;
    const result = await withStoredOmittedProperties(
      input({ title: "New", status: "closed", owner: undefined }),
      lookupOf(stored),
    );
    expect(result).toStrictEqual({
      type: "req",
      id: "REQ-1",
      properties: {
        priority: "must",
        tags: ["a"],
        title: "New",
        status: "closed",
        owner: undefined,
      },
    });
  });

  test("treats missing input properties as empty", async () => {
    expect(
      await withStoredOmittedProperties(
        input(undefined),
        lookupOf({ type: "req", status: "open" }),
      ),
    ).toStrictEqual({
      type: "req",
      id: "REQ-1",
      properties: { status: "open" },
    });
  });

  test("inherits from a stored entity without a type", async () => {
    expect(
      (
        await withStoredOmittedProperties(
          input({}),
          lookupOf({ status: "open" }),
        )
      ).properties,
    ).toStrictEqual({ status: "open" });
  });

  test("prefers the staged entity over the store", async () => {
    const lookup = lookupOf({ type: "req", status: "stored" });
    const result = await withStoredOmittedProperties(input({}), lookup, {
      entities: new Map([["REQ-1", { type: "req", status: "staged" }]]),
      relationships: [],
    });
    expect(result.properties).toStrictEqual({ status: "staged" });
    expect(lookup.calls).toBe(0);
    const other = await withStoredOmittedProperties(input({}), lookup, {
      entities: new Map([["REQ-2", { type: "req", status: "staged" }]]),
      relationships: [],
    });
    expect(other.properties).toStrictEqual({ status: "stored" });
  });

  test("returns the same input when there is nothing to inherit", async () => {
    for (const stored of [
      undefined,
      null,
      { type: "fact", status: "open" },
      { type: "req", id: "REQ-1" },
      { type: "req", title: "stored" },
    ] as StoredEntity[]) {
      const original = input({ title: "x" });
      expect(
        await withStoredOmittedProperties(original, lookupOf(stored)),
      ).toBe(original);
    }
  });
});
