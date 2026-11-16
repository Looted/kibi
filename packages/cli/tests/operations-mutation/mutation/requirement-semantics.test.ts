import { describe, expect, test } from "bun:test";
import {
  assertStoredRequirementBoundary,
  withServerSemanticInventory,
  withStoredRequirementSemantics,
} from "../../../src/operations/mutation/requirement-semantics.js";
import type { StoredEntityLookup } from "../../../src/operations/mutation/stored-entity.js";
import type {
  StagedUpsertState,
  UpsertInput,
} from "../../../src/operations/mutation/types.js";
import { isPartialSemanticInventory } from "../../../src/operations/mutation/validation.js";
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
    message: `Proposition-complete ingestion failed: REQ-1 would be written as a current requirement without a complete proposition inventory (${errors}). Leave semantic_inventory_version, semantic_source_field, semantic_source_hash and logic_claims out of this kb_upsert so Kibi derives them from the prose, sending semantic_inventory entries ({claim_key, status, subjects}) only for the claims you classify, or retire the requirement through a superseding one instead.`,
  };
}

describe("assertStoredRequirementBoundary", () => {
  test("refuses changed prose without an inventory", async () => {
    const outcome = await boundary(req({ semantic_text: CHANGED }), CURRENT);
    const message = (outcome.result as { message: string }).message;
    const errors = message.slice(
      message.indexOf("inventory (") + "inventory (".length,
      message.indexOf("). Leave semantic_inventory_version"),
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

describe("withServerSemanticInventory", () => {
  const NEW_TEXT =
    "Users must export reports as CSV. Exports must finish within a minute.";
  const claims = analyzeSemanticAdvisorInput({
    payload: {
      type: "req",
      id: "REQ-1",
      properties: { semantic_text: NEW_TEXT },
      relationships: [],
    },
  }).receipt.propositions;

  test("fills in a requirement that sends no inventory field", async () => {
    const input = req({
      title: "Export",
      status: "open",
      semantic_text: NEW_TEXT,
    });
    const { lookup } = lookupOf(undefined);
    const result = await withServerSemanticInventory(
      input,
      input,
      [],
      PROLOG,
      undefined,
      lookup,
    );
    expect(result.applied?.map((entry) => entry.claim_key)).toEqual(
      claims.map((claim) => claim.claim_key),
    );
    // Nobody classified the claims: they are recorded missing, and the
    // advisor's own reading is only a hint in the result.
    expect(result.applied?.map((entry) => entry.status)).toEqual([
      "missing",
      "missing",
    ]);
    expect(result.applied?.map((entry) => entry.advisor_status)).toEqual(
      claims.map((claim) =>
        claim.status === "ambiguous" || claim.status === "ontology_gap"
          ? claim.status
          : undefined,
      ),
    );
    expect(result.applied?.some((entry) => entry.advisor_status)).toBe(true);
    expect(result.input.properties).toMatchObject({
      semantic_inventory_version: "kibi.semantic-inventory.v1",
      semantic_source_field: "semantic_text",
    });
  });

  test("keeps the stored status and subjects of a claim the prose still states", async () => {
    const [first] = claims;
    const stored = {
      id: "REQ-1",
      type: "req",
      title: "Export",
      semantic_text: TEXT,
      semantic_inventory: [
        {
          claim_key: first?.claim_key,
          status: "ontology_gap",
          subjects: ["SUBJ-report"],
        },
      ],
    };
    const input = req({ semantic_text: NEW_TEXT, status: "open" });
    const { lookup } = lookupOf(stored);
    const result = await withServerSemanticInventory(
      input,
      input,
      [],
      PROLOG,
      undefined,
      lookup,
    );
    const inventory = result.input.properties?.semantic_inventory as Record<
      string,
      unknown
    >[];
    expect(
      inventory.find((entry) => entry.claim_key === first?.claim_key),
    ).toMatchObject({ status: "ontology_gap", subjects: ["SUBJ-report"] });
  });

  test("takes the status and subjects the payload's own entries give", async () => {
    const [first, second] = claims;
    const input = req({
      semantic_text: NEW_TEXT,
      status: "open",
      semantic_inventory: [
        {
          claim_key: first?.claim_key,
          status: "ontology_gap",
          subjects: ["SUBJ-export"],
        },
      ],
    });
    const { lookup } = lookupOf(undefined);
    const result = await withServerSemanticInventory(
      input,
      input,
      [],
      PROLOG,
      undefined,
      lookup,
    );
    const inventory = result.input.properties?.semantic_inventory as Record<
      string,
      unknown
    >[];
    expect(inventory).toHaveLength(2);
    expect(
      inventory.find((entry) => entry.claim_key === first?.claim_key),
    ).toMatchObject({ status: "ontology_gap", subjects: ["SUBJ-export"] });
    expect(
      inventory.find((entry) => entry.claim_key === second?.claim_key)?.status,
    ).not.toBe("modeled");
  });

  test("refuses an entry for a claim the prose does not state", async () => {
    const input = req({
      semantic_text: NEW_TEXT,
      status: "open",
      semantic_inventory: [
        { claim_key: "CLAIM-0000000000000000", status: "missing" },
      ],
    });
    const { lookup } = lookupOf(undefined);
    await expect(
      withServerSemanticInventory(input, input, [], PROLOG, undefined, lookup),
    ).rejects.toThrow("does not state");
  });

  test("judges a write that sends any inventory field exactly as sent", async () => {
    const input = req({
      semantic_text: NEW_TEXT,
      status: "open",
      semantic_source_field: "semantic_text",
    });
    const result = await withServerSemanticInventory(input, input, [], PROLOG);
    expect(result).toStrictEqual({ input });
  });

  test("leaves other entity types and complete inventories alone", async () => {
    const fact = req({ title: "x" }, "fact");
    expect(
      await withServerSemanticInventory(fact, fact, [], PROLOG),
    ).toStrictEqual({ input: fact });
    const properties = { status: "open", semantic_text: NEW_TEXT };
    const semantic = analyzeSemanticAdvisorInput({
      payload: { type: "req", id: "REQ-1", properties, relationships: [] },
    });
    const complete = req({
      ...properties,
      ...semanticInventoryContract(
        { type: "req", id: "REQ-1", properties },
        semantic.receipt,
      ),
    });
    const sent = req(properties);
    expect(
      await withServerSemanticInventory(sent, complete, [], PROLOG),
    ).toStrictEqual({ input: complete });
  });
});

describe("withServerSemanticInventory decisions", () => {
  const MIXED =
    "Users must keep 12 active sessions. Admins must keep one session. Users must export reports as CSV. For example, a monthly sales report. This is nice to have.";
  const NEW_TEXT =
    "Users must export reports as CSV. Exports must finish within a minute.";
  const keysOf = (text: string) =>
    analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-1",
        properties: { semantic_text: text },
        relationships: [],
      },
    }).receipt.propositions.map((p) => p.claim_key);
  const [EXPORT_CSV, FINISH] = keysOf(NEW_TEXT) as [string, string];

  async function fill(
    input: UpsertInput,
    options: {
      stored?: Record<string, unknown>;
      relationships?: { type: string; from: string; to: string }[];
      plan?: StagedUpsertState;
      prolog?: { query: (goal: string) => Promise<unknown> };
    } = {},
  ) {
    const { lookup } = lookupOf(options.stored);
    return withServerSemanticInventory(
      input,
      input,
      options.relationships ?? [],
      (options.prolog ?? PROLOG) as never,
      options.plan,
      lookup,
    );
  }
  const statuses = (result: { applied?: readonly { status: string }[] }) =>
    result.applied?.map((entry) => entry.status);
  const open = (properties: Record<string, unknown>) =>
    req({ status: "open", ...properties });
  const plan = (entities: Record<string, Record<string, unknown>>) =>
    ({
      entities: new Map(Object.entries(entities)),
      relationships: [],
    }) as StagedUpsertState;

  test("reports the advisor's reading only for an unclassified claim", async () => {
    const result = await fill(open({ semantic_text: MIXED }));
    expect(result.applied?.map(({ claim_key, ...rest }) => rest)).toStrictEqual(
      [
        {
          role: "normative",
          status: "missing",
          claim_text: "Users must keep 12 active sessions",
          advisor_status: "ambiguous",
        },
        {
          role: "normative",
          status: "missing",
          claim_text: "Admins must keep one session",
          advisor_status: "ambiguous",
        },
        {
          role: "normative",
          status: "missing",
          claim_text: "Users must export reports as CSV",
          advisor_status: "ontology_gap",
        },
        {
          role: "example",
          status: "nonlogical",
          claim_text: "For example, a monthly sales report",
        },
        {
          role: "descriptive",
          status: "missing",
          claim_text: "This is nice to have",
        },
      ],
    );
    const [ambiguous] = keysOf(MIXED);
    const classified = await fill(
      open({
        semantic_text: MIXED,
        semantic_inventory: [{ claim_key: ambiguous, status: "ontology_gap" }],
      }),
    );
    expect(Object.hasOwn(classified.applied?.[0] ?? {}, "advisor_status")).toBe(
      false,
    );
    const inventory = classified.input.properties
      ?.semantic_inventory as object[];
    expect(inventory.some((entry) => Object.hasOwn(entry, "subjects"))).toBe(
      false,
    );
  });

  for (const type of [
    "requires_property",
    "requires_predicate",
    "requires_rule",
  ]) {
    test(`a ${type} link to a planned fact models its claim`, async () => {
      const result = await fill(open({ semantic_text: NEW_TEXT }), {
        relationships: [{ type, from: "REQ-1", to: "FACT-csv" }],
        plan: plan({ "FACT-csv": { type: "fact", claim_key: EXPORT_CSV } }),
      });
      expect(statuses(result)).toStrictEqual(["modeled", "missing"]);
    });
  }

  test("only the requirement's own grounding links to facts model a claim", async () => {
    const result = await fill(open({ semantic_text: NEW_TEXT }), {
      relationships: [
        { type: "requires_property", from: "REQ-2", to: "FACT-csv" },
        { type: "relates_to", from: "REQ-1", to: "FACT-csv" },
        { type: "requires_property", from: "REQ-1", to: "REQ-other" },
        { type: "requires_property", from: "REQ-1", to: "FACT-blank" },
      ],
      plan: plan({
        "FACT-csv": { type: "fact", claim_key: EXPORT_CSV },
        "REQ-other": { type: "req", claim_key: FINISH },
        "FACT-blank": { type: "fact" },
      }),
    });
    expect(statuses(result)).toStrictEqual(["missing", "missing"]);
  });

  test("a stored fact models its claim, a target not stored grounds none", async () => {
    const goals: string[] = [];
    const prolog = {
      query: async (goal: string) => {
        goals.push(goal);
        if (goal.includes("'FACT-stored', fact"))
          return { success: true, bindings: { ClaimKey: `'${FINISH}'` } };
        return { success: false, bindings: {} };
      },
    };
    const result = await fill(open({ semantic_text: NEW_TEXT }), {
      relationships: [
        { type: "requires_property", from: "REQ-1", to: "FACT-stored" },
        { type: "requires_property", from: "REQ-1", to: "FACT-absent" },
      ],
      prolog,
    });
    expect(statuses(result)).toStrictEqual(["missing", "modeled"]);
    expect(goals.some((goal) => goal.includes("FACT-absent"))).toBe(true);
  });

  test("a stored modeled status without a grounding link is missing", async () => {
    const result = await fill(open({ semantic_text: NEW_TEXT }), {
      stored: {
        semantic_text: NEW_TEXT,
        semantic_inventory: [
          "not an entry",
          { claim_key: EXPORT_CSV, status: "modeled" },
          { claim_key: FINISH, status: "ontology_gap" },
        ],
      },
    });
    expect(statuses(result)).toStrictEqual(["missing", "ontology_gap"]);
  });

  test("a context claim keeps the advisor's status", async () => {
    const result = await fill(
      open({
        semantic_text:
          "Reports must usually be exported quickly. We chose CSV because auditors want it. Users prefer dark themes.",
      }),
    );
    expect(
      result.applied?.map((entry) => [entry.role, entry.status]),
    ).toStrictEqual([
      ["normative", "missing"],
      ["rationale", "nonlogical"],
      ["subjective", "nonlogical"],
    ]);
  });

  test("a non-array inventory is judged as sent; a non-record entry is skipped", async () => {
    const odd = open({ semantic_text: NEW_TEXT, semantic_inventory: "all" });
    expect(await fill(odd)).toStrictEqual({ input: odd });
    const junk = await fill(
      open({ semantic_text: NEW_TEXT, semantic_inventory: ["junk"] }),
    );
    expect(statuses(junk)).toStrictEqual(["missing", "missing"]);
  });

  test("a stored ledger that completes the write leaves it alone", async () => {
    const properties = { status: "open", semantic_text: NEW_TEXT };
    const contract = semanticInventoryContract(
      { type: "req", id: "REQ-1", properties },
      analyzeSemanticAdvisorInput({
        payload: { type: "req", id: "REQ-1", properties, relationships: [] },
      }).receipt,
    );
    const input = open({ semantic_text: NEW_TEXT });
    expect(
      await fill(input, { stored: { ...properties, ...contract } }),
    ).toStrictEqual({ input });
  });

  test("a stored source that leaves no prose to check leaves the write alone", async () => {
    const input = open({ semantic_text: NEW_TEXT });
    expect(
      await fill(input, {
        stored: { semantic_source_field: "text_ref", text_ref: "" },
      }),
    ).toStrictEqual({ input });
  });

  test("the ledger is derived from the stored prose under the payload, without stored ledger fields", async () => {
    // The stored text_ref ledger is replaced: the stored semantic_text is read.
    const result = await fill(open({ text_ref: "Users must keep a log." }), {
      stored: {
        semantic_text: NEW_TEXT,
        semantic_source_field: "text_ref",
        text_ref: "Users must keep a log.",
      },
    });
    expect(result.applied?.map((entry) => entry.claim_key)).toStrictEqual([
      EXPORT_CSV,
      FINISH,
    ]);
    expect(result.input.properties?.semantic_source_field).toBe(
      "semantic_text",
    );
  });

  test("stored clauses split the prose only while it is unchanged", async () => {
    const clauses = [NEW_TEXT];
    const same = await fill(open({ semantic_text: NEW_TEXT }), {
      stored: { semantic_text: NEW_TEXT, semantic_clauses: clauses },
    });
    const changed = await fill(open({ semantic_text: `${NEW_TEXT} ` }), {
      stored: { semantic_text: NEW_TEXT, semantic_clauses: clauses },
    });
    const own = await fill(
      open({
        semantic_text: NEW_TEXT,
        semantic_clauses: [
          "Users must export reports as CSV.",
          "Exports must finish within a minute.",
        ],
      }),
      { stored: { semantic_text: NEW_TEXT, semantic_clauses: clauses } },
    );
    expect(same.applied).toHaveLength(1);
    expect(same.input.properties?.semantic_clauses).toStrictEqual(clauses);
    expect(changed.applied).toHaveLength(2);
    expect(own.applied).toHaveLength(2);
  });

  test("an entry for an unstated claim is refused with its issue", async () => {
    const error = await fill(
      open({
        semantic_text: NEW_TEXT,
        semantic_inventory: [
          { claim_key: "CLAIM-0000000000000000" },
          { claim_key: "CLAIM-1111111111111111" },
        ],
      }),
    ).catch((caught: unknown) => caught);
    expect(error).toMatchObject({
      code: "INCOMPLETE_PROPOSITIONS",
      issues: [
        {
          rule: "semantic_inventory_unstated_claim",
          field: "semantic_inventory",
        },
      ],
      message:
        "Proposition-complete ingestion failed: semantic_inventory names claim key(s) CLAIM-0000000000000000, CLAIM-1111111111111111 that the prose of REQ-1 does not state, so the entries were written for other prose. Send semantic_inventory entries only for the claim keys kb_model mode analyze returns for the current prose, or omit semantic_inventory to have Kibi derive it.",
    });
  });
});

describe("isPartialSemanticInventory", () => {
  const KEY = "CLAIM-0123456789ABCDEF";
  test("accepts entries that give a claim key, a status and subjects", () => {
    expect(
      isPartialSemanticInventory([
        { claim_key: KEY, status: "ontology_gap", subjects: ["report"] },
        { claim_key: KEY, status: "ambiguous" },
      ]),
    ).toBe(true);
  });

  test("refuses anything else, which is validated as a full entry", () => {
    for (const value of [
      undefined,
      [],
      {},
      [{ claim_key: KEY }],
      [{ claim_key: "CLAIM-1", status: "missing" }],
      [{ claim_key: KEY, status: "bogus" }],
      [{ claim_key: KEY, status: "missing", subjects: [""] }],
      [{ claim_key: KEY, status: "missing", claim_text: "Users export." }],
      [{ claim_key: KEY, status: "missing" }, null],
    ])
      expect(isPartialSemanticInventory(value)).toBe(false);
  });
});
