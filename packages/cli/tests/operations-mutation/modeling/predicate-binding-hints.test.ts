import { describe, expect, test } from "bun:test";
import {
  buildBindingHints,
  describeBindingHints,
  unnamedParticipantArguments,
} from "../../../src/operations/modeling/predicate-binding-hints.js";
import type {
  BindingProvenance,
  PredicateSuggestion,
} from "../../../src/operations/modeling/predicate-types.js";

type SchemaInput = {
  names: string[];
  types: string[];
  examples?: string[];
  constants?: Record<string, string[]>;
  descriptions?: string[];
};

function candidate(
  schema: SchemaInput,
  args: string[],
  unbound: string[],
  provenance: Record<string, BindingProvenance> = {},
  extra: Partial<PredicateSuggestion> = {},
): PredicateSuggestion {
  return {
    predicate_args: args,
    unbound_arguments: unbound,
    binding_provenance_by_argument: provenance,
    subject_key: null,
    subject_pairing: "not_required",
    schema: {
      predicate_name: "can",
      argument_names: schema.names,
      argument_types: schema.types,
      examples: schema.examples ?? [],
      ...(schema.constants ? { argument_constants: schema.constants } : {}),
      ...(schema.descriptions
        ? { argument_descriptions: schema.descriptions }
        : {}),
    },
    ...extra,
  } as unknown as PredicateSuggestion;
}

const guidance = (type: string) =>
  `The claim names no ${type}. Bind the participant the claim names (a noun of at most 3 words), never the requirement's subject key; if the claim names no ${type}, this schema does not fit the claim: record_ontology_gap instead.`;

describe("buildBindingHints subject_key", () => {
  test("asks for a constrained subject when the schema names none", () => {
    const subjects = ["a", "b", "c", "d", "e", "f"];
    expect(
      buildBindingHints(
        candidate(
          { names: ["actor"], types: ["actor"] },
          ["x"],
          ["subject_key"],
          {},
          {
            subject_key: "s.k",
          },
        ),
        "text",
        subjects,
      ),
    ).toStrictEqual([
      {
        argument: "subject_key",
        position: -1,
        type: "subject_key",
        description:
          "The subject the predicate fact is about; recorded as its subject_key because the schema names no subject argument.",
        examples: ["a", "b", "c", "d", "e"],
        currentValue: "s.k",
        provenance: "placeholder",
        reason:
          "The can schema does not name the requirement's subject, so kb_check pairs the predicate with the subject fact only through subject_key. Pass subjectHint with one of the subjects the requirement constrains.",
      },
    ]);
    const [hint] = buildBindingHints(
      candidate({ names: ["actor"], types: ["actor"] }, ["x"], ["subject_key"]),
      "text",
    );
    expect(hint?.currentValue).toBe("");
    expect(hint?.examples).toStrictEqual([]);
  });

  test("treats subject_key as a plain argument when the schema names a subject", () => {
    const [hint] = buildBindingHints(
      candidate(
        { names: ["subject"], types: ["entity"] },
        ["x"],
        ["subject_key"],
      ),
      "text",
    );
    expect(hint?.position).toBe(-1);
    expect(hint?.type).toBe("unknown");
    expect(hint?.currentValue).toBe("");
  });
});

describe("buildBindingHints arguments", () => {
  test("lists constants, examples and the description", () => {
    const schema = {
      names: ["actor", "action"],
      types: ["actor", "verb"],
      examples: [
        "can(admin, read)",
        "can(guest, [write, x])",
        "noargs",
        "can(a, read)",
      ],
      constants: { action: ["read", "write"] },
      descriptions: ["who", ""],
    };
    const hints = buildBindingHints(
      candidate(schema, ["admin", "delete"], ["action", "actor"], {
        action: "inferred",
        actor: "explicit",
      }),
      "admins delete",
      ["s.k"],
    );
    expect(hints).toStrictEqual([
      {
        argument: "action",
        position: 1,
        type: "verb",
        allowedValues: ["read", "write"],
        examples: ["read", "write", "[write, x]"],
        currentValue: "delete",
        provenance: "inferred",
        reason:
          'The value "delete" was inferred and does not appear in the claim text; confirm it or pass the exact value.',
      },
      {
        argument: "actor",
        position: 0,
        type: "actor",
        description: "who",
        examples: ["admin", "guest", "a"],
        currentValue: "admin",
        provenance: "explicit",
        reason: 'The value "admin" needs review.',
      },
    ]);
  });

  test("offers constrained subjects for subject-like arguments only", () => {
    const subjects = ["s.one", "s.two"];
    const examples = [
      "p(e1, x)",
      "p(e2, x)",
      "p(e3, x)",
      "p(e4, x)",
      "p(e1, y)",
    ];
    const subject = buildBindingHints(
      candidate(
        { names: ["subject", "other"], types: ["entity", "entity"], examples },
        [],
        ["subject", "other"],
      ),
      "t",
      subjects,
    );
    expect(subject[0]?.examples).toStrictEqual([
      "s.one",
      "s.two",
      "e1",
      "e2",
      "e3",
    ]);
    expect(subject[1]?.examples).toStrictEqual(["x", "y"]);
    const entity = buildBindingHints(
      candidate(
        { names: ["thing", "actor"], types: ["entity", "actor"], examples },
        [],
        ["thing", "actor"],
      ),
      "t",
      subjects,
    );
    expect(entity[0]?.examples).toStrictEqual([
      "s.one",
      "s.two",
      "e1",
      "e2",
      "e3",
    ]);
    expect(entity[1]?.examples).toStrictEqual(["x", "y"]);
    expect(entity[0]?.currentValue).toBe("");
    expect(entity[0]?.provenance).toBe("placeholder");
    expect(entity[0]?.type).toBe("entity");
  });

  test("explains an unpaired subject only when its binding applies", () => {
    const schema = { names: ["subject"], types: ["entity"] };
    const [paired] = buildBindingHints(
      candidate(
        schema,
        ["billing"],
        ["subject"],
        { subject: "extracted" },
        {
          subject_pairing: "unpaired",
        },
      ),
      "billing",
      ["a.b", "c.d"],
    );
    expect(paired?.reason).toBe(
      'The value "billing" is not a subject the requirement constrains (a.b, c.d), so kb_check would not pair the predicate with the subject fact. Bind one of them.',
    );
    const [inferred] = buildBindingHints(
      candidate(
        schema,
        ["billing"],
        ["subject"],
        { subject: "inferred" },
        {
          subject_pairing: "unpaired",
        },
      ),
      "x",
    );
    expect(inferred?.reason).toStartWith('The value "billing" was inferred');
    const [missing] = buildBindingHints(
      candidate(
        schema,
        ["billing"],
        ["subject"],
        {},
        { subject_pairing: "unpaired" },
      ),
      "x",
    );
    expect(missing?.reason).toBe('The value "billing" needs review.');
    const [other] = buildBindingHints(
      candidate(
        { names: ["thing"], types: ["entity"] },
        ["billing"],
        ["thing"],
        {
          thing: "extracted",
        },
        { subject_pairing: "unpaired" },
      ),
      "x",
    );
    expect(other?.reason).toBe('The value "billing" needs review.');
    const [pairedSubject] = buildBindingHints(
      candidate(
        schema,
        ["billing"],
        ["subject"],
        { subject: "extracted" },
        { subject_pairing: "paired" },
      ),
      "x",
      ["billing"],
    );
    expect(pairedSubject?.reason).toBe('The value "billing" needs review.');
  });

  test("names each reason a value is not a binding", () => {
    const reason = (
      type: string,
      value: string,
      requirementSubjects: string[] = [],
      constants?: Record<string, string[]>,
    ) =>
      buildBindingHints(
        candidate(
          {
            names: ["arg"],
            types: [type],
            ...(constants ? { constants } : {}),
          },
          [value],
          ["arg"],
        ),
        "claim",
        requirementSubjects,
      )[0]?.reason;
    expect(reason("actor", "the")).toBe(
      'The value "the" is not a binding: "the" is a stop word.',
    );
    expect(reason("actor", "arg")).toBe(
      'The value "arg" is not a binding: it repeats the argument name arg and the claim does not name it.',
    );
    expect(reason("role", "billing", ["billing"])).toBe(
      `The value "billing" is not a binding: "billing" is the requirement's subject key billing, which the predicate fact already carries as its subject_key, so it names no role. ${guidance("role")}`,
    );
    expect(reason("owner", "one two three four")).toBe(
      `The value "one two three four" is not a binding: it is a 4-word clause of the claim, not a short name for this owner. Bind a noun of at most 3 words. ${guidance("owner")}`,
    );
    expect(reason("entity", "one two three four")).toBe(
      `The value "one two three four" is not a binding: it is a 4-word clause of the claim, not a short name for this entity. Bind a noun of at most 3 words, or the requirement's subject key.`,
    );
    expect(reason("actor", "  ")).toBe(guidance("actor"));
    expect(reason("actor", "unknown")).toBe(guidance("actor"));
    expect(reason("verb", "")).toBe(
      "The claim text names no value for this argument.",
    );
    expect(reason("verb", "resource")).toBe(
      "The claim text names no value for this argument.",
    );
    expect(reason("verb", "delete", [], { arg: ["read"] })).toBe(
      `The value "delete" is not one of this argument's declared constants.`,
    );
    expect(reason("verb", "delete")).toBe('The value "delete" needs review.');
  });

  test("reads prototype-named arguments as plain arguments", () => {
    const [hint] = buildBindingHints(
      candidate(
        { names: ["constructor"], types: ["verb"] },
        ["delete"],
        ["constructor"],
      ),
      "x",
    );
    expect(hint).toStrictEqual({
      argument: "constructor",
      position: 0,
      type: "verb",
      examples: [],
      currentValue: "delete",
      provenance: "placeholder",
      reason: 'The value "delete" needs review.',
    });
  });

  test("parses only well-formed example calls", () => {
    const examples = (example: string) =>
      buildBindingHints(
        candidate(
          { names: ["a", "b"], types: ["verb", "verb"], examples: [example] },
          [],
          ["a", "b"],
        ),
        "x",
      ).map((hint) => hint.examples);
    expect(examples("p(x(1, 2), [y, z])")).toStrictEqual([
      ["x(1, 2)"],
      ["[y, z]"],
    ]);
    expect(examples("p( x ,y )")).toStrictEqual([["x"], ["y"]]);
    expect(examples("p(,y)")).toStrictEqual([["y"], []]);
    expect(examples("p()")).toStrictEqual([[], []]);
    expect(examples(")x(")).toStrictEqual([[], []]);
    expect(examples("p(x")).toStrictEqual([[], []]);
    expect(examples("p)x(y")).toStrictEqual([[], []]);
    expect(examples("p([a, b], c)")).toStrictEqual([["[a, b]"], ["c"]]);
    expect(examples("p(c(d, e), f)")).toStrictEqual([["c(d, e)"], ["f"]]);
  });
});

describe("unnamedParticipantArguments", () => {
  const schema = {
    names: ["actor", "action", "role"],
    types: ["actor", "verb", "Role"],
    examples: ["can(admin_user, read, viewer)"],
    constants: { role: ["viewer", "editor"] },
  };
  const unnamed = (args: string[], text: string, subjects: string[] = []) =>
    unnamedParticipantArguments(
      candidate(schema, args, ["actor", "action", "role", "subject_key"]),
      text,
      subjects,
    );

  test("flags participants the claim does not name", () => {
    expect(unnamed(["", "x", "unknown"], "Nothing is said")).toStrictEqual([
      "actor",
      "role",
    ]);
    expect(
      unnamed(["billing", "x", "guest"], "Nothing", ["billing"]),
    ).toStrictEqual(["actor"]);
    expect(
      unnamed(["Discarding a draft while offline", "x", "guest"], "Nothing"),
    ).toStrictEqual(["actor"]);
  });

  test("keeps named participants and non-activity clauses", () => {
    expect(unnamed(["guest", "x", "guest"], "Nothing")).toStrictEqual([]);
    expect(
      unnamed(["Administrators who were granted", "x", "g"], "Nothing"),
    ).toStrictEqual([]);
    expect(unnamed(["bring a b c d", "x", "g"], "Nothing")).toStrictEqual([
      "actor",
    ]);
    expect(unnamed(["ring a b c d", "x", "g"], "Nothing")).toStrictEqual([]);
    expect(unnamed(["sing a b c d", "x", "g"], "Nothing")).toStrictEqual([]);
    expect(unnamed(["-bring a b c", "x", "g"], "Nothing")).toStrictEqual([
      "actor",
    ]);
  });

  test("a constant or example the claim names counts as a participant", () => {
    expect(
      unnamed(["", "x", ""], "Admin users and Editors may read"),
    ).toStrictEqual([]);
    expect(unnamed(["", "x", ""], "admin-user and viewers")).toStrictEqual([]);
    expect(unnamed(["", "x", ""], "ADMIN USERS, VIEWERES")).toStrictEqual([]);
    expect(unnamed(["", "x", ""], "ADMIN USERS, VIEWERSS")).toStrictEqual([
      "role",
    ]);
    expect(unnamed(["", "x", ""], "superadmin_user and preview")).toStrictEqual(
      ["actor", "role"],
    );
    expect(unnamed(["", "x", ""], "admin_userx and viewerz")).toStrictEqual([
      "actor",
      "role",
    ]);
  });

  test("matches values that start or end with symbols", () => {
    const symbols = {
      names: ["actor"],
      types: ["actor"],
      examples: ["p(c++)", "p(...)", "p(svc(ci))"],
    };
    const check = (text: string) =>
      unnamedParticipantArguments(candidate(symbols, [""], ["actor"]), text);
    expect(check("uses c++ daily")).toStrictEqual([]);
    expect(check("uses svc(ci) daily")).toStrictEqual([]);
    expect(check("uses c daily")).toStrictEqual(["actor"]);
    expect(check("uses ... daily")).toStrictEqual(["actor"]);
  });
});

describe("describeBindingHints", () => {
  test("summarizes each hint", () => {
    const base = {
      position: 0,
      currentValue: "",
      provenance: "placeholder" as const,
      reason: "",
    };
    expect(
      describeBindingHints([
        {
          ...base,
          argument: "a",
          type: "t",
          allowedValues: ["x", "y"],
          examples: ["z"],
        },
        { ...base, argument: "b", type: "u", examples: ["p", "q"] },
        { ...base, argument: "c", type: "v", examples: [] },
      ]),
    ).toBe(
      "a (t, one of x, y); b (u, e.g. p, q); c (v, no example in the schema)",
    );
    expect(describeBindingHints([])).toBe("");
  });
});

describe("unnamedParticipantArguments edge cases", () => {
  const actor = { names: ["actor"], types: ["actor"] };

  test("reads example arguments only from a call with both parentheses", () => {
    const examples = ["plain", "zed, q)", "(wyx, q", "x(vee)"];
    const flagged = (text: string) =>
      unnamedParticipantArguments(
        candidate({ ...actor, examples }, [""], ["actor"]),
        text,
      );
    expect(flagged("plai zed wyx")).toStrictEqual(["actor"]);
    expect(flagged("vee")).toStrictEqual([]);
  });

  test("a known value's repeated separators count once", () => {
    expect(
      unnamedParticipantArguments(
        candidate(
          { ...actor, constants: { actor: ["guest__user"] } },
          [""],
          ["actor"],
        ),
        "A guest user",
      ),
    ).toStrictEqual([]);
  });

  test("a value is no subject key without requirement subjects", () => {
    expect(
      unnamedParticipantArguments(
        candidate(actor, ["Stryker was here"], ["actor"]),
        "Nothing",
      ),
    ).toStrictEqual([]);
  });

  test("only participant arguments are judged", () => {
    expect(
      unnamedParticipantArguments(
        candidate(
          { names: ["subject"], types: ["entity"] },
          ["unknown"],
          ["subject"],
        ),
        "Nothing",
      ),
    ).toStrictEqual([]);
  });

  test("a missing or blank value names no participant", () => {
    expect(
      unnamedParticipantArguments(candidate(actor, [], ["actor"]), "Nothing"),
    ).toStrictEqual(["actor"]);
    expect(
      unnamedParticipantArguments(
        candidate(actor, ["  "], ["actor"]),
        "Nothing",
      ),
    ).toStrictEqual(["actor"]);
  });

  test("a short gerund phrase is a name, not a clause", () => {
    expect(
      unnamedParticipantArguments(
        candidate(actor, ["Discarding drafts"], ["actor"]),
        "Nothing",
      ),
    ).toStrictEqual([]);
  });

  test("without constants or examples nothing in the claim names it", () => {
    expect(
      unnamedParticipantArguments(
        candidate(actor, [""], ["actor"]),
        "Stryker was here",
      ),
    ).toStrictEqual(["actor"]);
  });

  test("examples without a value at this position are skipped", () => {
    expect(
      unnamedParticipantArguments(
        candidate(
          {
            names: ["action", "actor"],
            types: ["verb", "actor"],
            examples: ["p(read)"],
          },
          ["read", ""],
          ["actor"],
        ),
        "read it",
      ),
    ).toStrictEqual(["actor"]);
  });
});
