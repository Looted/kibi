import { describe, expect, test } from "bun:test";
import { validateBootstrapPayload } from "../../../src/operations/bootstrap/validation.js";
import type { UpsertInput } from "../../../src/operations/mutation/types.js";
import { analyzeSemanticAdvisorInput } from "../../../src/operations/semantic-advisor/analyze-prose.js";
import { semanticInventoryContract } from "../../../src/operations/semantic-advisor/ingestion-boundary.js";

const now = new Date("2026-01-01T00:00:00Z");

function modeledRequirement(): UpsertInput {
  const base = {
    type: "req",
    id: "REQ-export",
    properties: {
      title: "Report export",
      status: "open",
      text_ref: "Users must export reports.",
    },
  };
  const { receipt } = analyzeSemanticAdvisorInput({ payload: base });
  const contract = semanticInventoryContract(base, receipt) as {
    semantic_inventory: Record<string, unknown>[];
  };
  return {
    ...base,
    properties: {
      ...base.properties,
      ...contract,
      semantic_inventory: contract.semantic_inventory.map((entry) => ({
        ...entry,
        status: "modeled",
      })),
    },
  };
}

const grounding = {
  type: "requires_property",
  from: "REQ-export",
  to: "FACT-export",
};

describe("validateBootstrapPayload", () => {
  test("rejects payloads that are not upsert objects", () => {
    for (const payload of [null, [], "req", 7]) {
      expect(() => validateBootstrapPayload(payload as never, now)).toThrow(
        new Error("Bootstrap action payload must be an upsert object"),
      );
    }
  });

  test("rejects relationships that are not an array", () => {
    expect(() =>
      validateBootstrapPayload(
        { type: "fact", id: "FACT-a", relationships: {} },
        now,
      ),
    ).toThrow(
      new Error(
        "Relationship validation failed: relationships must be an array",
      ),
    );
  });

  test("runs entity validation on the payload", () => {
    expect(() => validateBootstrapPayload({ id: "FACT-a" }, now)).toThrow(
      "'type' and 'id' are required for upsert",
    );
  });

  test("returns the payload itself when it is valid", () => {
    const payload = {
      type: "fact",
      id: "FACT-a",
      properties: {
        title: "A fact",
        status: "active",
        fact_kind: "observation",
      },
    };
    expect(validateBootstrapPayload(payload, now)).toBe(payload);
  });

  test("checks the semantic inventory against the payload relationships", () => {
    const payload = modeledRequirement();
    expect(() => validateBootstrapPayload(payload, now)).toThrow(
      "modeled semantic_inventory entries (1) must equal logical grounding relationships (0)",
    );
    const grounded = { ...payload, relationships: [grounding] };
    expect(validateBootstrapPayload(grounded, now)).toBe(grounded);
    expect(grounded.relationships).toStrictEqual([grounding]);
  });

  test("an inventory without modeled claims passes without relationships", () => {
    const payload = modeledRequirement();
    const inventory = payload.properties.semantic_inventory as Record<
      string,
      unknown
    >[];
    const open = {
      ...payload,
      properties: {
        ...payload.properties,
        semantic_inventory: inventory.map((entry) => ({
          ...entry,
          status: "ambiguous",
        })),
      },
    };
    expect(validateBootstrapPayload(open, now)).toBe(open);
  });
});
