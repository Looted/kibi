import { describe, expect, test } from "bun:test";
import { KbRejection } from "../../../src/cli-errors.js";
import { assertPredicateArgumentVocabulary } from "../../../src/operations/mutation/predicate-vocabulary-guard.js";
import { fail, ok, scriptedProlog } from "../fake-prolog.js";

const SUFFIX =
  ". Use a declared constant, or extend the schema's argument_constants when the value is genuinely new.";

const storedSchema = (id: string, constants: string, aliases = "{}") =>
  `['${id}','fact',[argument_names=[actor,action],argument_constants=${JSON.stringify(constants)},argument_aliases=${JSON.stringify(aliases)}]]`;

const STORED = `[${storedSchema(
  "FACT-s",
  '{"action":["read","write"]}',
  '{"action":{"rd":"read"}}',
)}]`;

const fact = (args: unknown, extra: Record<string, unknown> = {}) => ({
  type: "fact",
  fact_kind: "predicate",
  predicate_name: " can ",
  predicate_args: args,
  ...extra,
});

async function rejection(promise: Promise<void>): Promise<KbRejection> {
  try {
    await promise;
  } catch (error) {
    return error as KbRejection;
  }
  throw new Error("expected a rejection");
}

describe("assertPredicateArgumentVocabulary", () => {
  test("skips non-predicate facts, unnamed predicates and empty arguments", async () => {
    for (const entity of [
      fact(["a"], { type: "req" }),
      fact(["a"], { fact_kind: "predicate_schema" }),
      fact(["a"], { predicate_name: "  " }),
      fact(["a"], { predicate_name: 3 }),
      fact([]),
      fact([1, 2]),
      fact("a"),
    ]) {
      const fake = scriptedProlog([fail("must not query")]);
      await expect(
        assertPredicateArgumentVocabulary(fake.prolog, entity),
      ).resolves.toBeUndefined();
      expect(fake.goals).toStrictEqual([]);
    }
  });

  test("queries schemas by name, namespace and arity", async () => {
    const fake = scriptedProlog([ok()]);
    await assertPredicateArgumentVocabulary(
      fake.prolog,
      fact(["admin", 7, "read"], { predicate_namespace: " Billing " }),
    );
    expect(fake.goals).toStrictEqual([
      "findall([Id,'fact',Props], (kb:predicate_schema(Id, Namespace, Name, Arity, _Names, _Types), Name == can, Namespace == 'Billing', Arity =:= 2, kb_entity(Id, 'fact', Props)), Results)",
    ]);
    const fallback = scriptedProlog([ok()]);
    await assertPredicateArgumentVocabulary(
      fallback.prolog,
      fact(["admin"], { predicate_namespace: " " }),
    );
    expect(fallback.goals[0]).toContain("Namespace == default,");
  });

  test("reports a failed schema lookup", async () => {
    await expect(
      assertPredicateArgumentVocabulary(
        scriptedProlog([fail("down")]).prolog,
        fact(["a", "b"]),
      ),
    ).rejects.toThrow(/^Predicate schema lookup failed: down$/);
    await expect(
      assertPredicateArgumentVocabulary(
        scriptedProlog([fail()]).prolog,
        fact(["a", "b"]),
      ),
    ).rejects.toThrow(/^Predicate schema lookup failed: unknown error$/);
  });

  test("rejects aliases and undeclared values of a stored schema", async () => {
    const error = await rejection(
      assertPredicateArgumentVocabulary(
        scriptedProlog([ok({ Results: STORED })]).prolog,
        fact(["admin", "rd"]),
      ),
    );
    expect(error).toBeInstanceOf(KbRejection);
    expect(error.code).toBe("ENTITY_VALIDATION_FAILED");
    expect(error.message).toBe(
      `Entity validation failed: argument action uses alias rd; use the declared constant read (FACT-s)${SUFFIX}`,
    );
    expect(
      (
        await rejection(
          assertPredicateArgumentVocabulary(
            scriptedProlog([ok({ Results: STORED })]).prolog,
            fact(["admin", "delete"]),
          ),
        )
      ).message,
    ).toBe(
      `Entity validation failed: argument action value delete is not declared by FACT-s; allowed: read, write${SUFFIX}`,
    );
    await expect(
      assertPredicateArgumentVocabulary(
        scriptedProlog([ok({ Results: STORED })]).prolog,
        fact(["admin", "write"]),
      ),
    ).resolves.toBeUndefined();
  });

  test("a schema without argument names declares nothing", async () => {
    await expect(
      assertPredicateArgumentVocabulary(
        scriptedProlog([
          ok({
            // Constants keyed by any name still need argument_names to apply.
            Results: `[['FACT-n','fact',[argument_constants="{\\"action\\":[\\"read\\"],\\"Stryker was here\\":[\\"x\\"]}"]]]`,
          }),
        ]).prolog,
        fact(["admin", "delete"]),
      ),
    ).resolves.toBeUndefined();
  });

  test("staged schemas replace stored ones and count as declared", async () => {
    const planned = {
      type: "fact",
      fact_kind: "predicate_schema",
      predicate_name: "can",
      predicate_arity: "2",
      argument_names: ["actor", "action"],
      argument_constants: { action: ["read", "delete"] },
    };
    const staged = {
      entities: new Map<string, Record<string, unknown>>([
        ["FACT-s", { ...planned, id: "FACT-s" }],
        [
          "FACT-other-ns",
          { ...planned, id: "FACT-other-ns", predicate_namespace: "x" },
        ],
        [
          "FACT-other-name",
          { ...planned, id: "FACT-other-name", predicate_name: "may" },
        ],
        [
          "FACT-other-arity",
          { ...planned, id: "FACT-other-arity", predicate_arity: 3 },
        ],
        [
          "FACT-other-kind",
          { ...planned, id: "FACT-other-kind", fact_kind: "predicate" },
        ],
        ["FACT-other-type", { ...planned, id: "FACT-other-type", type: "req" }],
      ]),
    };
    await expect(
      assertPredicateArgumentVocabulary(
        scriptedProlog([ok({ Results: STORED })]).prolog,
        fact(["admin", "delete"]),
        staged,
      ),
    ).resolves.toBeUndefined();
    expect(
      (
        await rejection(
          assertPredicateArgumentVocabulary(
            scriptedProlog([ok({ Results: STORED })]).prolog,
            fact(["admin", "write"]),
            staged,
          ),
        )
      ).message,
    ).toBe(
      `Entity validation failed: argument action value write is not declared by FACT-s; allowed: read, delete${SUFFIX}`,
    );
    const namespaced = {
      entities: new Map([
        ["FACT-ns", { ...planned, id: "FACT-ns", predicate_namespace: " x " }],
      ]),
    };
    expect(
      (
        await rejection(
          assertPredicateArgumentVocabulary(
            scriptedProlog([ok()]).prolog,
            fact(["admin", "write"], { predicate_namespace: "x" }),
            namespaced,
          ),
        )
      ).message,
    ).toBe(
      `Entity validation failed: argument action value write is not declared by FACT-ns; allowed: read, delete${SUFFIX}`,
    );
  });

  test("joins every problem across schemas", async () => {
    const results = `[${storedSchema("FACT-a", '{"action":["read"]}')},${storedSchema(
      "FACT-b",
      '{"actor":["user"],"action":["read"]}',
    )}]`;
    expect(
      (
        await rejection(
          assertPredicateArgumentVocabulary(
            scriptedProlog([ok({ Results: results })]).prolog,
            fact(["admin", "delete"]),
          ),
        )
      ).message,
    ).toBe(
      `Entity validation failed: argument action value delete is not declared by FACT-a; allowed: read; argument actor value admin is not declared by FACT-b; allowed: user; argument action value delete is not declared by FACT-b; allowed: read${SUFFIX}`,
    );
  });
});
