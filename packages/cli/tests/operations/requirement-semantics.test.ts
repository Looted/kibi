// implements REQ-kibi-upsert-preserves-requirement-semantics, REQ-kibi-review-observation-claim-text
import { describe, expect, test } from "bun:test";
import { withStoredRequirementSemantics } from "../../src/operations/mutation/requirement-semantics.js";
import type {
  StagedUpsertState,
  UpsertInput,
} from "../../src/operations/mutation/types.js";
import { validateUpsertInput } from "../../src/operations/mutation/validation.js";

const STORED = {
  id: "REQ-export-csv",
  type: "req",
  title: "Users must be able to export reports as CSV.",
  status: "open",
  text_ref: "spec:claim:1",
  semantic_text: "Users must be able to export reports as CSV.",
  semantic_inventory_version: "kibi.semantic-inventory.v1",
  semantic_source_field: "semantic_text",
  semantic_source_hash: "a".repeat(64),
  semantic_inventory: [{ claim_key: "CLAIM-0123456789ABCDEF" }],
  logic_claims: ["CLAIM-0123456789ABCDEF"],
  priority: "must",
} as const;

/** A store that has no entity; staged plan steps supply the history. */
const emptyStore = { query: async () => ({ success: false }) } as never;

function staged(entity: Record<string, unknown> = STORED): StagedUpsertState {
  return {
    entities: new Map([[String(entity.id), entity]]),
    relationships: [],
  };
}

function link(properties: Record<string, unknown>): UpsertInput {
  return {
    type: "req",
    id: STORED.id,
    properties,
    relationships: [
      { type: "specified_by", from: STORED.id, to: "SCEN-export-csv" },
    ],
  };
}

describe("relationship-only requirement updates", () => {
  test("merge the stored proposition ledger and text_ref under the payload", async () => {
    const merged = await withStoredRequirementSemantics(
      link({ title: STORED.title, status: "in_progress" }),
      emptyStore,
      staged(),
    );
    expect(merged.properties).toEqual({
      title: STORED.title,
      status: "in_progress",
      text_ref: STORED.text_ref,
      semantic_text: STORED.semantic_text,
      semantic_inventory_version: STORED.semantic_inventory_version,
      semantic_source_field: STORED.semantic_source_field,
      semantic_source_hash: STORED.semantic_source_hash,
      semantic_inventory: STORED.semantic_inventory,
      logic_claims: STORED.logic_claims,
    });
    expect(merged.relationships).toHaveLength(1);
  });

  test("stay strict when the payload supplies a ledger field or changes the prose", async () => {
    for (const properties of [
      { title: STORED.title, status: "open", logic_claims: [] },
      { title: STORED.title, status: "open", semantic_text: "Other prose." },
      { title: "Users must be able to export reports.", status: "open" },
      { title: STORED.title, status: "open", text_ref: "spec:claim:2" },
    ]) {
      const input = link(properties);
      expect(
        await withStoredRequirementSemantics(input, emptyStore, staged()),
      ).toBe(input);
    }
  });

  test("leave a payload that meets the ingestion boundary on its own unread", async () => {
    let queries = 0;
    const counting = {
      query: async () => {
        queries += 1;
        return { success: true };
      },
    } as never;
    const input = link({ title: "Export", status: "open" });
    expect(await withStoredRequirementSemantics(input, counting)).toBe(input);
    expect(queries).toBe(0);
  });

  test("leave new requirements, other types and ledger-free requirements alone", async () => {
    const created = link({ title: STORED.title, status: "open" });
    expect(await withStoredRequirementSemantics(created, emptyStore)).toBe(
      created,
    );
    const scenario: UpsertInput = {
      type: "scenario",
      id: STORED.id,
      properties: { title: "Export", status: "active" },
    };
    expect(
      await withStoredRequirementSemantics(scenario, emptyStore, staged()),
    ).toBe(scenario);
    const plain = link({ title: "Plain", status: "open" });
    expect(
      await withStoredRequirementSemantics(
        plain,
        emptyStore,
        staged({ id: STORED.id, type: "req", title: "Plain", status: "open" }),
      ),
    ).toBe(plain);
  });
});

describe("review observation facts", () => {
  const observation = (properties: Record<string, unknown>): UpsertInput => ({
    type: "fact",
    id: "FACT-review-export-csv",
    properties: {
      title: "Export claim needs review",
      status: "active",
      tags: ["review:invalid-write"],
      claim_text: STORED.title,
      ...properties,
    },
  });

  test("an observation or meta fact may quote a claim without its key", () => {
    for (const fact_kind of ["observation", "meta"])
      expect(() =>
        validateUpsertInput(observation({ fact_kind }), new Date()),
      ).not.toThrow();
  });

  test("any other fact, and a fact naming a claim key, keeps the pair", () => {
    expect(() =>
      validateUpsertInput(
        observation({
          fact_kind: "property_value",
          subject_key: "report.export",
          property_key: "format",
          operator: "eq",
          value_type: "string",
          value_string: "csv",
        }),
        new Date(),
      ),
    ).toThrow("claim_key");
    expect(() =>
      validateUpsertInput(
        {
          type: "fact",
          id: "FACT-review-export-csv",
          properties: {
            title: "Export claim needs review",
            status: "active",
            fact_kind: "observation",
            claim_key: "CLAIM-0123456789ABCDEF",
          },
        },
        new Date(),
      ),
    ).toThrow("claim_text");
  });
});
