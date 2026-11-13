import { describe, expect, test } from "bun:test";
import {
  assertStoredRequirementBoundary,
  withStoredRequirementSemantics,
} from "../../../src/operations/mutation/requirement-semantics.js";
import type { StoredEntityLookup } from "../../../src/operations/mutation/stored-entity.js";
import type {
  StagedUpsertState,
  UpsertInput,
} from "../../../src/operations/mutation/types.js";
import { analyzeSemanticAdvisorInput } from "../../../src/operations/semantic-advisor/analyze-prose.js";
import { semanticInventoryContract } from "../../../src/operations/semantic-advisor/ingestion-boundary.js";

// The store is never queried: every test supplies its own lookup.
const PROLOG = {
  query: async () => {
    throw new Error("unexpected Prolog query");
  },
};

const TEXT = "Users must export reports as CSV.";
const LEDGER = {
  semantic_text: TEXT,
  semantic_inventory_version: "kibi.semantic-inventory.v1",
  semantic_source_field: "semantic_text",
  semantic_source_hash: "a".repeat(64),
  semantic_inventory: [{ claim_key: "CLAIM-0123456789ABCDEF" }],
  logic_claims: ["CLAIM-0123456789ABCDEF"],
};

function lookupOf(stored: Record<string, unknown> | undefined) {
  const calls: string[] = [];
  const lookup: StoredEntityLookup = {
    exists: async () => {
      calls.push("exists");
      return stored !== undefined;
    },
    entity: async () => {
      calls.push("entity");
      return stored;
    },
  };
  return { lookup, calls };
}

function req(properties: Record<string, unknown>, type = "req"): UpsertInput {
  return { type, id: "REQ-1", properties } as UpsertInput;
}

function staged(entity: Record<string, unknown>): StagedUpsertState {
  return { entities: new Map([["REQ-1", entity]]), relationships: [] };
}

async function merged(
  input: UpsertInput,
  stored: Record<string, unknown> | undefined,
  plan?: StagedUpsertState,
) {
  const { lookup, calls } = lookupOf(stored);
  const result = await withStoredRequirementSemantics(
    input,
    PROLOG,
    plan,
    lookup,
  );
  return { same: result === input, properties: result.properties, calls };
}

describe("withStoredRequirementSemantics", () => {
  test("merges exactly the stored ledger fields it holds", async () => {
    const stored = { id: "REQ-1", type: "req", title: "T", ...LEDGER };
    expect(await merged(req({ status: "open" }), stored)).toStrictEqual({
      same: false,
      properties: { ...LEDGER, status: "open" },
      calls: ["entity"],
    });
  });

  test("leaves other entity types alone without a lookup", async () => {
    const stored = { id: "REQ-1", type: "req", ...LEDGER };
    expect(
      await merged(req({ status: "open" }, "scenario"), stored),
    ).toStrictEqual({ same: true, properties: { status: "open" }, calls: [] });
  });

  test("reads a planned entity only when it is a requirement", async () => {
    const plannedTest = { id: "REQ-1", type: "test", ...LEDGER };
    expect(
      await merged(req({ status: "open" }), undefined, staged(plannedTest)),
    ).toStrictEqual({ same: true, properties: { status: "open" }, calls: [] });
    const plannedReq = { id: "REQ-1", type: "req", ...LEDGER };
    expect(
      (await merged(req({ status: "open" }), undefined, staged(plannedReq)))
        .properties,
    ).toStrictEqual({ ...LEDGER, status: "open" });
  });

  test("keeps only a recorded ledger", async () => {
    for (const stored of [
      { type: "req", ...LEDGER, semantic_inventory: "none" },
      { type: "req", ...LEDGER, semantic_inventory_version: undefined },
    ]) {
      expect((await merged(req({ status: "open" }), stored)).same).toBe(true);
    }
  });

  test("a payload with any ledger field is validated as given", async () => {
    const stored = { id: "REQ-1", type: "req", ...LEDGER };
    for (const properties of [
      { status: "open", semantic_text: TEXT },
      { logic_claims: [] },
    ]) {
      expect(await merged(req(properties), stored)).toStrictEqual({
        same: true,
        properties,
        calls: [],
      });
    }
    expect(
      (await merged(req({ status: "open", x_semantic_: 1 }), stored))
        .properties,
    ).toStrictEqual({ ...LEDGER, status: "open", x_semantic_: 1 });
  });

  test("an unchanged title keeps the stored ledger", async () => {
    const stored = { id: "REQ-1", type: "req", title: "T", ...LEDGER };
    expect(
      (await merged(req({ title: "T" }), stored)).properties,
    ).toStrictEqual({ ...LEDGER, title: "T" });
  });

  test("a changed title is prose unless the ledger reads semantic_text", async () => {
    const rename = req({ title: "U", status: "open" });
    expect(
      (await merged(rename, { type: "req", title: "T", ...LEDGER })).properties,
    ).toStrictEqual({ ...LEDGER, title: "U", status: "open" });
    for (const stored of [
      { type: "req", title: "T", ...LEDGER, semantic_source_field: "title" },
      { type: "req", title: "T", ...LEDGER, semantic_text: "" },
    ]) {
      expect((await merged(rename, stored)).same).toBe(true);
    }
    // A title the payload leaves out is no change either.
    expect(
      (
        await merged(req({ status: "open" }), {
          type: "req",
          title: "T",
          ...LEDGER,
          semantic_source_field: "title",
        })
      ).properties,
    ).toStrictEqual({
      ...LEDGER,
      semantic_source_field: "title",
      status: "open",
    });
    // A title the payload repeats is no change, whatever the source.
    expect(
      (
        await merged(req({ title: "T" }), {
          type: "req",
          title: "T",
          ...LEDGER,
          semantic_source_field: "title",
        })
      ).properties,
    ).toStrictEqual({ ...LEDGER, semantic_source_field: "title", title: "T" });
  });

  test("a changed text_ref is prose unless the ledger reads semantic_text", async () => {
    const change = req({ text_ref: "spec:other" });
    expect(
      (
        await merged(change, {
          type: "req",
          ...LEDGER,
          semantic_source_field: "text_ref",
        })
      ).same,
    ).toBe(true);
    expect(
      (await merged(change, { type: "req", ...LEDGER, semantic_text: "" }))
        .same,
    ).toBe(true);
    expect(
      (await merged(change, { type: "req", ...LEDGER })).properties,
    ).toStrictEqual({ ...LEDGER, text_ref: "spec:other" });
  });
});

const CURRENT = {
  id: "REQ-1",
  type: "req",
  title: TEXT,
  status: "open",
  semantic_text: TEXT,
};
const CHANGED = "Users must export reports as JSON.";

function contractFor(text: string) {
  const payload = {
    type: "req",
    id: "REQ-1",
    properties: { title: text, status: "open", semantic_text: text },
  };
  const { receipt } = analyzeSemanticAdvisorInput({
    payload: { ...payload, relationships: [] },
  });
  return semanticInventoryContract(payload, receipt);
}

async function boundary(
  input: UpsertInput,
  stored: Record<string, unknown> | undefined,
  keeps?: (hash: string) => boolean,
) {
  const { lookup, calls } = lookupOf(stored);
  const seen: string[] = [];
  const withKeeps: StoredEntityLookup = keeps
    ? {
        ...lookup,
        keepsSemanticBaseline: (hash) => {
          seen.push(hash);
          return keeps(hash);
        },
      }
    : lookup;
  try {
    await assertStoredRequirementBoundary(
      input,
      [],
      PROLOG,
      undefined,
      withKeeps,
    );
    return { result: "ok", calls, seen: seen.length };
  } catch (error) {
    const typed = error as { code: string; message: string };
    return {
      result: { code: typed.code, message: typed.message },
      calls,
      seen: seen.length,
    };
  }
}

function refusal(errors: string) {
  return {
    code: "INCOMPLETE_PROPOSITIONS",
    message: `Proposition-complete ingestion failed: REQ-1 would be written as a current requirement without a complete proposition inventory (${errors}). Run kb_model mode analyze (CLI: kibi model) with id 'REQ-1' and its complete semantic_text, then send the returned inventory contract (semantic_inventory, semantic_inventory_version, semantic_source_field, semantic_source_hash, logic_claims) in this kb_upsert, or retire the requirement through a superseding one instead.`,
  };
}

describe("assertStoredRequirementBoundary", () => {
  test("refuses changed prose without an inventory", async () => {
    const outcome = await boundary(req({ semantic_text: CHANGED }), CURRENT);
    const message = (outcome.result as { message: string }).message;
    const errors = message.slice(
      message.indexOf("inventory (") + "inventory (".length,
      message.indexOf("). Run kb_model"),
    );
    expect(errors).toStartWith(
      "semantic_inventory_version must be 'kibi.semantic-inventory.v1'; semantic_source_field must be",
    );
    expect(outcome).toStrictEqual({
      result: refusal(errors),
      calls: ["entity"],
      seen: 0,
    });
  });

  test("accepts a write that keeps the legacy prose", async () => {
    expect(await boundary(req({ status: "open" }), CURRENT)).toStrictEqual({
      result: "ok",
      calls: ["entity"],
      seen: 0,
    });
  });

  test("accepts a complete inventory without consulting the baseline", async () => {
    expect(
      await boundary(
        req({ semantic_text: CHANGED, ...contractFor(CHANGED) }),
        CURRENT,
        () => false,
      ),
    ).toStrictEqual({ result: "ok", calls: ["entity"], seen: 0 });
  });

  test("skips other entity types and unknown requirements", async () => {
    expect(
      await boundary(req({ semantic_text: CHANGED }, "scenario"), CURRENT),
    ).toStrictEqual({ result: "ok", calls: [], seen: 0 });
    expect(
      await boundary(req({ semantic_text: CHANGED }), undefined),
    ).toStrictEqual({ result: "ok", calls: ["entity"], seen: 0 });
  });

  test("a recorded baseline keeps a write that advertises no contract", async () => {
    expect(
      await boundary(req({ semantic_text: CHANGED }), CURRENT, () => true),
    ).toStrictEqual({ result: "ok", calls: ["entity"], seen: 1 });
    expect(
      (await boundary(req({ semantic_text: CHANGED }), CURRENT, () => false))
        .seen,
    ).toBe(1);
  });

  test("any advertised contract field bypasses the baseline", async () => {
    for (const field of [
      { semantic_inventory_version: "kibi.semantic-inventory.v1" },
      { semantic_source_hash: "b".repeat(64) },
      { semantic_inventory: [] },
    ]) {
      const outcome = await boundary(
        req({ semantic_text: CHANGED, ...field }),
        CURRENT,
        () => true,
      );
      expect(outcome.seen).toBe(0);
      expect((outcome.result as { code: string }).code).toBe(
        "INCOMPLETE_PROPOSITIONS",
      );
      expect((outcome.result as { message: string }).message).toStartWith(
        "Proposition-complete ingestion failed: REQ-1 would be written",
      );
    }
  });
});
