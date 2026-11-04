import { afterEach, describe, expect, test } from "bun:test";
import {
  formatUpsertError,
  parseUpsertChangeKinds,
} from "../../../src/operations/mutation/contradictions.js";
import { assertFirmDecisionUnchanged } from "../../../src/operations/mutation/firm-decision-guard.js";
import { resolveUpsertOrigin } from "../../../src/operations/mutation/origin.js";
import { assertPredicateArgumentVocabulary } from "../../../src/operations/mutation/predicate-vocabulary-guard.js";
import { validateSupersedesSourceHistory } from "../../../src/operations/mutation/relationships.js";
import { storedEntityLookup } from "../../../src/operations/mutation/stored-entity.js";
import {
  validateFactModelingShape,
  valueFieldHint,
} from "../../../src/operations/mutation/strict-fact.js";
import {
  assertAuthoredWriteCompiles,
  authoredEntityLookup,
} from "../../../src/operations/mutation/uncompiled-source.js";
import { validateUpsertInput } from "../../../src/operations/mutation/validation.js";
import { scratch } from "../helpers.js";

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

const now = new Date("2026-09-05T00:00:00.000Z");
const staged = (entities: Record<string, Record<string, unknown>>) => ({
  entities: new Map(Object.entries(entities)),
  relationships: [],
});

describe("predicate argument vocabulary", () => {
  const predicate = {
    type: "fact",
    fact_kind: "predicate",
    predicate_name: "can",
    predicate_args: ["admin", "delete"],
  };

  test("reports a failed schema lookup", async () => {
    const failing = (error?: string) => ({
      query: async () => ({ success: false, bindings: {}, error }),
    });
    await expect(
      assertPredicateArgumentVocabulary(failing("down"), predicate),
    ).rejects.toThrow("Predicate schema lookup failed: down");
    await expect(
      assertPredicateArgumentVocabulary(failing(), predicate),
    ).rejects.toThrow("Predicate schema lookup failed: unknown error");
  });

  test("checks the arguments against a schema an earlier step writes", async () => {
    const schema = (fields: Record<string, unknown>) => ({
      id: "FACT-schema",
      type: "fact",
      fact_kind: "predicate_schema",
      predicate_name: "can",
      predicate_arity: 2,
      argument_names: ["role", "action"],
      argument_constants: { role: ["owner"] },
      ...fields,
    });
    const empty = { query: async () => ({ success: true, bindings: {} }) };
    await expect(
      assertPredicateArgumentVocabulary(
        empty,
        predicate,
        staged({
          "FACT-schema": schema({}),
          "FACT-other": schema({ predicate_namespace: "billing" }),
          "FACT-arity": schema({ predicate_arity: 3 }),
          "FACT-name": schema({ predicate_name: "may" }),
          "FACT-kind": schema({ fact_kind: "predicate" }),
          "REQ-1": { id: "REQ-1", type: "req" },
        }),
      ),
    ).rejects.toThrow(
      "Entity validation failed: argument role value admin is not declared by FACT-schema; allowed: owner.",
    );
  });
});

describe("origin of an upsert", () => {
  const input = (origin?: unknown) =>
    ({
      type: "req",
      id: "REQ-1",
      properties: { title: "R", ...(origin === undefined ? {} : { origin }) },
    }) as never;

  test("stamps a supplied origin with the write time unless it has one", async () => {
    expect(
      (await resolveUpsertOrigin(input({ kind: "human" }), undefined, now))
        .properties.origin,
    ).toStrictEqual({ kind: "human", recorded_at: now.toISOString() });
    const stamped = input({ kind: "human", recorded_at: "2026-01-01" });
    expect(await resolveUpsertOrigin(stamped, undefined, now)).toBe(stamped);
    const malformed = input("human");
    expect(await resolveUpsertOrigin(malformed, undefined, now)).toBe(
      malformed,
    );
  });

  test("keeps the origin an earlier step recorded", async () => {
    const prolog = { query: async () => ({ success: true, bindings: {} }) };
    const origin = { kind: "human", recorded_at: "2026-01-01T00:00:00.000Z" };
    expect(
      (
        await resolveUpsertOrigin(
          input(),
          prolog,
          now,
          staged({ "REQ-1": { id: "REQ-1", origin } }),
        )
      ).properties.origin,
    ).toStrictEqual(origin);
    const plain = input();
    expect(
      await resolveUpsertOrigin(
        plain,
        prolog,
        now,
        staged({ "REQ-1": { id: "REQ-1" } }),
      ),
    ).toBe(plain);
  });
});

describe("upsert commit results", () => {
  test("refuse a batch that reports too few changes", () => {
    expect(() =>
      parseUpsertChangeKinds({ ChangeKinds: "[created]" }, 2),
    ).toThrow("Upsert batch completed without 2 created/updated result(s)");
  });

  test("explain a contradiction that names no conflict", () => {
    expect(
      formatUpsertError("REQ-1", "failed (stage=commit)", {
        code: "contradiction",
        message: "",
      } as never),
    ).toBe(
      "Contradiction detected for entity REQ-1: This requirement conflicts with existing requirements. Add a supersedes relationship to the conflicting requirement, or deprecate the old requirement before creating the new one. (stage=commit)",
    );
  });
});

describe("entity validation messages", () => {
  const errorOf = (properties: Record<string, unknown>, type = "req") => {
    try {
      validateUpsertInput({ type, id: "REQ-1", properties } as never, now);
    } catch (error) {
      return (error as Error).message;
    }
    return "accepted";
  };

  test("names the types a type-restricted field belongs to", () => {
    expect(errorOf({ title: "R", status: "open", expects: ["x"] })).toContain(
      "expects",
    );
  });

  test("names an unknown nested property and an enum outside status", () => {
    expect(
      errorOf({
        title: "R",
        status: "open",
        origin: { kind: "human", by: "x" },
      }),
    ).toContain("unknown property 'by' (");
    expect(
      errorOf(
        { title: "R", status: "open", granularity_reason: "whim" },
        "symbol",
      ),
    ).toContain(
      "/granularity_reason: must be equal to one of the allowed values. Allowed values: config-artifact,",
    );
  });

  test("hints a set value and refuses vocabulary outside a schema", () => {
    expect(valueFieldHint(["a", "b"])).toBe(
      'Use value_type: "set" plus value_set: ["a","b"].',
    );
    expect(() =>
      validateFactModelingShape({
        type: "fact",
        fact_kind: "subject",
        subject_key: "user",
        argument_constants: { role: ["owner"] },
      }),
    ).toThrow(
      "Entity validation failed: argument_constants and argument_aliases are only valid on fact_kind predicate_schema",
    );
  });
});

describe("stored decisions and uncompiled sources", () => {
  test("refuses an unapproved change to a firm decision", async () => {
    const workspace = scratch({
      ".kb/requirements/REQ-firm.md": [
        "---",
        "id: REQ-firm",
        "title: Firm",
        "type: req",
        "status: open",
        "firmness: firm",
        "approval_ref: docs/decisions.md#firm",
        "---",
        "Orders must ship within two days.",
        "",
      ].join("\n"),
    });
    cleanups.push(workspace.cleanup);
    const lookup = {
      exists: async () => true,
      entity: async () => ({
        id: "REQ-firm",
        type: "req",
        source: ".kb/requirements/REQ-firm.md",
      }),
    };
    await expect(
      assertFirmDecisionUnchanged(
        {
          type: "req",
          id: "REQ-firm",
          properties: {},
          document: { body: "Orders must ship within five days.\n" },
        } as never,
        workspace.root,
        lookup,
      ),
    ).rejects.toThrow(
      "Entity validation failed: REQ-firm is a firm decision, so kb_upsert does not change its ",
    );
  });

  test("judges an uncompiled file by its last sync failure", () => {
    const source = {
      path: ".kb/requirements/REQ-u.md",
      absolute: "/ws/.kb/requirements/REQ-u.md",
      content:
        "---\nid: REQ-u\ntitle: U\ntype: req\nstatus: open\nlinks:\n  - REQ-v\n---\nBody.\n",
      stored: { id: "REQ-u", type: "req", title: "U", status: "open" },
      extractionError: null,
      syncFailure: undefined,
    };
    expect(
      authoredEntityLookup(source as never).keepsSemanticBaseline?.("h"),
    ).toBe(false);
    expect(
      assertAuthoredWriteCompiles(
        source as never,
        {
          type: "req",
          id: "REQ-u",
          properties: {},
        } as never,
        {
          id: "REQ-u",
          type: "req",
          title: "U",
          status: "open",
        },
      ),
    ).toStrictEqual([{ type: "relates_to", from: "REQ-u", to: "REQ-v" }]);
  });

  test("reads the source of a superseded entity an earlier step writes", async () => {
    const calls: string[] = [];
    await validateSupersedesSourceHistory(
      { query: async () => ({ success: true, bindings: {} }) } as never,
      { id: "REQ-new", type: "req", source: "docs/new.md" },
      [{ type: "supersedes", from: "REQ-new", to: "REQ-old" }],
      "/ws",
      {
        firstAdditionCommit: (_root: string, file: string) => {
          calls.push(file);
          return null;
        },
        isAncestor: () => null,
      } as never,
      staged({ "REQ-old": { id: "REQ-old", source: "docs/old.md" } }),
    );
    expect(calls).toContain("docs/old.md");
  });

  test("reads an entity that fails to load as absent", async () => {
    // The entity exists, but loading it fails.
    const prolog = {
      query: async (goal: string) =>
        goal.startsWith("once(kb_entity(")
          ? { success: true, bindings: {} }
          : { success: false, bindings: {}, error: "load failed" },
    };
    expect(
      await storedEntityLookup(prolog, "REQ-1", "req").entity(),
    ).toBeNull();
  });
});
