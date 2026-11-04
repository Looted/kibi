import { describe, expect, test } from "bun:test";
import {
  applyArgumentRewrites,
  predicateArgumentConformance,
  predicateCanonicalKey,
  predicateVocabularyErrors,
  predicateVocabularyFromEntity,
} from "../../../src/operations/modeling/predicate-vocabulary.js";

describe("predicateVocabularyFromEntity", () => {
  test("reads objects and JSON strings, dropping malformed entries", () => {
    expect(
      predicateVocabularyFromEntity({
        argument_constants: {
          action: ["read", "write", "read", "", 3],
          empty: [],
          blanks: [""],
          notList: "read",
        },
        argument_aliases: JSON.stringify({
          action: { rd: "read", bad: 1, none: "" },
          dropped: { x: 2 },
          notMap: "x",
          list: ["a"],
        }),
      }),
    ).toStrictEqual({
      constants: { action: ["read", "write"] },
      aliases: { action: { rd: "read" } },
    });
  });

  test("treats missing, unparsable and non-object fields as empty", () => {
    for (const value of [undefined, "{", "[1]", "null", 5, ["a"]]) {
      expect(
        predicateVocabularyFromEntity({
          argument_constants: value,
          argument_aliases: value,
        }),
      ).toStrictEqual({ constants: {}, aliases: {} });
    }
  });

  test("parses only strings as JSON", () => {
    // A list holding a JSON object string stays a list, not that object.
    expect(
      predicateVocabularyFromEntity({
        argument_constants: ['{"x":["a"]}'],
        argument_aliases: ['{"x":{"b":"a"}}'],
      }),
    ).toStrictEqual({ constants: {}, aliases: {} });
  });

  test("keeps prototype-like argument names as own keys", () => {
    const vocabulary = predicateVocabularyFromEntity({
      argument_constants: '{"__proto__":["a"]}',
      argument_aliases: '{"__proto__":{"b":"a"}}',
    });
    expect(Object.keys(vocabulary.constants)).toStrictEqual(["__proto__"]);
    expect(Object.keys(vocabulary.aliases)).toStrictEqual(["__proto__"]);
    expect(
      predicateArgumentConformance(["__proto__"], ["b"], vocabulary),
    ).toStrictEqual({
      rewrites: [{ index: 0, argumentName: "__proto__", from: "b", to: "a" }],
      undeclared: [],
    });
  });
});

describe("predicateVocabularyErrors", () => {
  const schema = (extra: Record<string, unknown>) => ({
    fact_kind: "predicate_schema",
    argument_names: ["actor", "action", 7],
    ...extra,
  });

  test("is empty without a vocabulary", () => {
    expect(predicateVocabularyErrors({ fact_kind: "predicate" })).toStrictEqual(
      [],
    );
  });

  test("only allows a vocabulary on predicate schemas", () => {
    for (const field of ["argument_constants", "argument_aliases"]) {
      expect(
        predicateVocabularyErrors({ fact_kind: "predicate", [field]: {} }),
      ).toStrictEqual([
        "argument_constants and argument_aliases are only valid on fact_kind predicate_schema",
      ]);
    }
  });

  test("accepts a well-formed vocabulary", () => {
    expect(
      predicateVocabularyErrors(
        schema({
          argument_constants: { action: ["read", "write"] },
          argument_aliases: '{"action":{"rd":"read"}}',
        }),
      ),
    ).toStrictEqual([]);
  });

  test("rejects malformed top-level fields", () => {
    expect(
      predicateVocabularyErrors(
        schema({ argument_constants: ["a"], argument_aliases: "x" }),
      ),
    ).toStrictEqual([
      "argument_constants must map argument names to constant lists",
      "argument_aliases must map argument names to alias-to-constant objects",
    ]);
  });

  test("rejects unknown names and malformed constant lists", () => {
    expect(
      predicateVocabularyErrors(
        schema({
          argument_names: "actor",
          argument_constants: { other: ["a"] },
        }),
      ),
    ).toStrictEqual([
      "argument_constants.other is not one of argument_names ()",
    ]);
    expect(
      predicateVocabularyErrors(
        schema({
          argument_constants: {
            other: "a",
            actor: [],
            action: ["a", ""],
            "7": [3],
          },
        }),
      ),
    ).toStrictEqual([
      "argument_constants.7 is not one of argument_names (actor, action)",
      "argument_constants.7 must be a non-empty list of non-empty strings",
      "argument_constants.other is not one of argument_names (actor, action)",
      "argument_constants.other must be a non-empty list of non-empty strings",
      "argument_constants.actor must be a non-empty list of non-empty strings",
      "argument_constants.action must be a non-empty list of non-empty strings",
    ]);
  });

  test("checks every alias against the declared constants", () => {
    expect(
      predicateVocabularyErrors(
        schema({
          argument_constants: { action: ["read", "write"] },
          argument_aliases: {
            other: { a: "read" },
            actor: { a: "b" },
            action: { rd: "rd", wr: 5, read: "write" },
          },
        }),
      ),
    ).toStrictEqual([
      "argument_aliases.other is not one of argument_names (actor, action)",
      "argument_aliases.actor requires argument_constants.actor to declare the canonical constants",
      "argument_aliases.action.rd must name a declared constant of action",
      "argument_aliases.action.wr must name a declared constant of action",
      "argument_aliases.action.read shadows a declared constant; remove the alias",
    ]);
    expect(
      predicateVocabularyErrors(
        schema({
          argument_constants: { action: ["read"] },
          argument_aliases: { action: "rd" },
        }),
      ),
    ).toStrictEqual([
      "argument_aliases.action must map alias spellings to constants",
    ]);
  });

  test("does not read Object.prototype members as constants", () => {
    expect(
      predicateVocabularyErrors({
        fact_kind: "predicate_schema",
        argument_names: ["toString"],
        argument_aliases: { toString: { a: "b" } },
      }),
    ).toStrictEqual([
      "argument_aliases.toString requires argument_constants.toString to declare the canonical constants",
    ]);
  });
});

describe("predicateArgumentConformance", () => {
  const vocabulary = {
    constants: { action: ["read", "write"], role: ["admin"] },
    aliases: { action: { rd: "read", gone: "delete" } },
  };

  test("reports aliases as rewrites and the rest as undeclared", () => {
    expect(
      predicateArgumentConformance(
        ["actor", "action", "role"],
        ["anyone", "rd", "guest", "extra"],
        vocabulary,
      ),
    ).toStrictEqual({
      rewrites: [{ index: 1, argumentName: "action", from: "rd", to: "read" }],
      undeclared: [
        { index: 2, argumentName: "role", value: "guest", allowed: ["admin"] },
      ],
    });
    expect(
      predicateArgumentConformance(
        ["action", "action"],
        ["gone", "write"],
        vocabulary,
      ),
    ).toStrictEqual({
      rewrites: [],
      undeclared: [
        {
          index: 0,
          argumentName: "action",
          value: "gone",
          allowed: ["read", "write"],
        },
      ],
    });
    expect(
      predicateArgumentConformance(["role"], ["rd"], vocabulary).undeclared,
    ).toHaveLength(1);
  });

  test("ignores arguments past the declared names", () => {
    expect(
      predicateArgumentConformance(["action"], ["read", "extra"], {
        constants: { action: ["read"], undefined: ["z"] },
        aliases: {},
      }),
    ).toStrictEqual({ rewrites: [], undeclared: [] });
  });

  test("leaves open and prototype-named arguments alone", () => {
    expect(
      predicateArgumentConformance(
        ["constructor", "action"],
        ["x", "constructor"],
        vocabulary,
      ),
    ).toStrictEqual({
      rewrites: [],
      undeclared: [
        {
          index: 1,
          argumentName: "action",
          value: "constructor",
          allowed: ["read", "write"],
        },
      ],
    });
  });
});

describe("rewrites and keys", () => {
  test("applyArgumentRewrites replaces aliased positions in a copy", () => {
    const args = ["a", "rd", "c"];
    const next = applyArgumentRewrites(args, [
      { index: 1, argumentName: "action", from: "rd", to: "read" },
    ]);
    expect(next).toStrictEqual(["a", "read", "c"]);
    expect(args).toStrictEqual(["a", "rd", "c"]);
    expect(applyArgumentRewrites(args, [])).not.toBe(args);
  });

  test("predicateCanonicalKey joins the arguments", () => {
    expect(predicateCanonicalKey("can", ["admin", "read"])).toBe(
      "can(admin,read)",
    );
    expect(predicateCanonicalKey("p", [])).toBe("p()");
  });
});
