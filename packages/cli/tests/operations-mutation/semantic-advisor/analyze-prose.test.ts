import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import * as builtin from "kibi-plugin-builtin";
import * as ir from "../../../src/logic/ir.js";
import {
  SEMANTIC_ADVISOR_VERSION,
  analyzeSemanticAdvisorInput,
  claimDimension,
  stringLogicClaims,
} from "../../../src/operations/semantic-advisor/analyze-prose.js";
import { semanticClaimKey } from "../../../src/operations/semantic-advisor/clauses.js";
import * as conditional from "../../../src/operations/semantic-advisor/conditional-rules.js";
import type { SemanticAdvisorInput } from "../../../src/operations/semantic-advisor/types.js";
import {
  CASES,
  MODELING_CASES,
  analyzeCapturing,
} from "./analyze-prose.corpus.js";

const spies: { mockRestore: () => void }[] = [];
function track<T extends { mockRestore: () => void }>(spy: T): T {
  spies.push(spy);
  return spy;
}
afterEach(() => {
  for (const spy of spies.splice(0).reverse()) spy.mockRestore();
});

type Capture = {
  signals: unknown[];
  modeled: boolean;
  suggestions: Record<string, unknown>[];
  propositions: Record<string, unknown>[];
  interpretations: Record<string, unknown>[];
  shadow: { kind: string; represented: boolean }[];
  warnings: string[];
};
const capture = (input: SemanticAdvisorInput) =>
  analyzeCapturing(input) as Capture;

const GOLDEN = JSON.parse(
  readFileSync(path.join(import.meta.dir, "analyze-prose.golden.json"), "utf8"),
) as Record<string, unknown>;

describe("analysis of each advisor input", () => {
  test("pins one analysis per corpus input", () => {
    expect(Object.keys(GOLDEN)).toEqual(Object.keys(CASES));
  });

  for (const [name, input] of Object.entries(CASES)) {
    test(name, () => {
      expect(analyzeCapturing(input)).toEqual(GOLDEN[name]);
    });
  }
});

describe("deciding that a requirement is already modeled", () => {
  const EXPECTED: Record<string, boolean> = {
    "modeled by predicate and rule": true,
    "modeled by predicates": true,
    "modeled by rules": true,
    "modeled by strict properties": true,
    "property grounding without its subject": false,
    "one grounding too many": false,
    "one grounding too few": false,
    "a claim not modeled": false,
    "an extra modeled claim": false,
    "a modeled claim of other prose": false,
    "a claim not declared": false,
    "malformed groundings and inventory": true,
    "groundings and inventory that are not lists": false,
    "context prose with a grounding": false,
  };

  test("lists every modeling case", () => {
    expect(Object.keys(MODELING_CASES)).toEqual(Object.keys(EXPECTED));
  });

  for (const [name, input] of Object.entries(MODELING_CASES)) {
    test(name, () => {
      const result = capture(input);
      expect(result.modeled).toBe(EXPECTED[name] as boolean);
      if (result.modeled) expect(result.suggestions).toEqual([]);
    });
  }
});

describe("exported helpers", () => {
  test("names the advisor version", () => {
    expect(SEMANTIC_ADVISOR_VERSION).toBe("semantic-advisor-v2");
  });

  test("keeps only the string entries of a logic_claims value", () => {
    expect(stringLogicClaims(["A", 1, null, "B"])).toEqual(["A", "B"]);
    expect(stringLogicClaims("A")).toEqual([]);
    expect(stringLogicClaims(undefined)).toEqual([]);
  });

  test("names the first quantifier or bound of a clause", () => {
    const bound = (quantifier: string) => ({ quantifier, rewrites: ["bound"] });
    const collection = (quantifier: string) => ({
      quantifier,
      rewrites: ["rule", "count", "set"],
    });
    for (const [text, dimension] of [
      ["No more than 3", bound("no_more_than")],
      ["at least two", bound("at_least")],
      ["AT MOST one", bound("at_most")],
      ["exactly 2", bound("exactly")],
      ["each user", collection("each")],
      ["Every row", collection("every")],
      ["all rows, exactly", collection("all")],
      ["only some any", undefined],
      ["Eachother", undefined],
      ["allow", undefined],
    ] as const) {
      expect([text, claimDimension(text)] as unknown[]).toEqual([
        text,
        dimension,
      ]);
    }
  });
});

describe("supplied clauses", () => {
  const input = (clauses: string[]): SemanticAdvisorInput => ({
    payload: {
      type: "req",
      id: "REQ-X",
      properties: { title: "T", semantic_text: "Users must log in." },
    },
    clauses,
  });

  test("refuses clauses that are not fragments of the prose", () => {
    expect(() =>
      analyzeSemanticAdvisorInput(input(["Users must log out"])),
    ).toThrow(expect.objectContaining({ code: "VALIDATION_FAILED" }));
    expect(() =>
      analyzeSemanticAdvisorInput(input(["Users must log out"])),
    ).toThrow(
      'Semantic advisor clauses must be verbatim fragments of the requirement prose (the intent or semantic_text); this clause does not occur in it: "Users must log out". Copy each clause from the prose unchanged (whitespace may differ), or omit clauses to let Kibi split the prose.',
    );
    expect(() =>
      analyzeSemanticAdvisorInput(
        input([
          "Users must log in",
          "Users must log out",
          "Admins must log in",
        ]),
      ),
    ).toThrow(
      'these clauses do not occur in it: "Users must log out", "Admins must log in". Copy',
    );
  });
});

describe("shadow cues", () => {
  const ALL =
    "Users must not log in before noon if an account is blocked unless each station has 12 sessions because of policy, as allowed.";
  const KEY = semanticClaimKey(ALL);

  function interpretAs(models: unknown[]) {
    track(
      spyOn(ir, "validateLogicIr").mockImplementation(((model: {
        __invalid?: boolean;
        __none?: boolean;
      }) =>
        model.__invalid
          ? { valid: false, errors: [], warnings: [], normalized: model }
          : {
              valid: true,
              errors: [],
              warnings: [],
              normalized: model.__none ? undefined : model,
              semanticKey: `SEM-${JSON.stringify(model).length}`,
              renderedProlog: "p.",
              ruleHash: "h",
            }) as never),
    );
    return capture({
      payload: {
        type: "req",
        id: "REQ-X",
        properties: { title: "T", status: "open", semantic_text: ALL },
      },
      interpretations: models.map((model) => ({
        claim_key: KEY,
        claim_text: ALL.slice(0, -1),
        ir: model as never,
      })),
    }).shadow;
  }
  const deep = (node: unknown) => ({ head: { args: [{ wrap: [node] }] } });
  const MODELS: Record<string, unknown[]> = {
    none: [],
    empty: [{}],
    invalid: [{ __invalid: true, modality: "deny" }],
    unnormalized: [{ __none: true }],
    deny: [{ modality: "deny" }],
    forbid: [{ modality: "forbid" }],
    permit: [{ modality: "permit" }],
    not: [deep({ kind: "not" })],
    negative: [deep({ polarity: "negative" })],
    rule: [{ kind: "rule", body: {} }],
    ruleNoBody: [{ kind: "rule" }],
    bodyNoRule: [{ kind: "atom", body: {} }],
    temporal: [deep({ kind: "temporal" })],
    exceptions: [{ exceptions: [{}] }],
    noExceptions: [{ exceptions: [] }],
    validFrom: [{ validFrom: "2020" }],
    validTo: [{ validTo: "2030" }],
    duration: [deep({ kind: "duration" })],
    variables: [{ variables: ["X"] }],
    noVariables: [{ variables: [] }],
    count: [deep({ kind: "count" })],
    compare: [deep({ kind: "compare" })],
    all: [deep({ kind: "all" })],
    any: [deep({ kind: "any" })],
    number: [deep({ kind: "number" })],
    secondOnly: [
      {},
      {
        modality: "deny",
        exceptions: [{}],
        variables: ["X"],
        kind: "rule",
        body: {},
      },
    ],
  };
  const REPRESENTED: Record<string, string[]> = {
    none: [],
    empty: ["modal"],
    invalid: [],
    unnormalized: [],
    deny: ["modal", "polarity", "negation_scope"],
    forbid: ["modal", "polarity", "negation_scope"],
    permit: ["modal", "polarity"],
    not: ["modal", "polarity", "exception", "negation_scope"],
    negative: ["modal", "polarity", "negation_scope"],
    rule: ["modal", "conditional", "directionality"],
    ruleNoBody: ["modal"],
    bodyNoRule: ["modal"],
    temporal: ["modal", "prerequisite", "temporal"],
    exceptions: ["modal", "exception"],
    noExceptions: ["modal"],
    validFrom: ["modal", "temporal"],
    validTo: ["modal", "temporal"],
    duration: ["modal", "temporal"],
    variables: ["modal", "quantifier"],
    noVariables: ["modal"],
    count: ["modal", "quantifier", "numeric"],
    compare: ["modal", "quantifier", "numeric"],
    all: ["modal", "quantifier"],
    any: ["modal", "quantifier"],
    number: ["modal", "numeric"],
    secondOnly: [
      "modal",
      "polarity",
      "conditional",
      "exception",
      "quantifier",
      "negation_scope",
      "directionality",
    ],
  };

  test("finds every cue in prose that has them all", () => {
    expect(interpretAs([]).map(({ kind }) => kind)).toEqual([
      "modal",
      "polarity",
      "passive_voice",
      "nominalization",
      "conditional",
      "causal",
      "prerequisite",
      "exception",
      "temporal",
      "quantifier",
      "numeric",
      "negation_scope",
      "directionality",
    ]);
  });

  for (const [name, models] of Object.entries(MODELS)) {
    test(`marks the cues a ${name} interpretation represents`, () => {
      const shadow = interpretAs(models);
      expect(
        shadow.filter((cue) => cue.represented).map(({ kind }) => kind),
      ).toEqual(REPRESENTED[name] as string[]);
      expect(shadow).toHaveLength(13);
    });
  }

  test("reads each cue from the prose as written", () => {
    for (const [text, kinds] of [
      ["Accounts are  blocked.", ["passive_voice"]],
      ["The station opens.", ["nominalization"]],
      [
        "Exports run only after review.",
        ["prerequisite", "temporal", "quantifier"],
      ],
      ["Tokens expire.", ["temporal"]],
      ["Keep 12 copies.", ["numeric"]],
      ["Users can't log in.", ["modal", "negation_scope"]],
      ["Nothing here.", []],
      ["Ops prohibited so that logs stay.", ["polarity", "causal"]],
      ["Within a day, all of them.", ["temporal", "quantifier"]],
      [
        "Provided that X, it applies whenever Y apart from Z.",
        ["conditional", "exception"],
      ],
      ["Keep ten copies at least.", ["quantifier", "numeric"]],
    ] as const) {
      const shadow = capture({
        payload: { type: "test", id: "X", properties: { semantic_text: text } },
      }).shadow;
      expect([text, shadow.map(({ kind }) => kind)]).toEqual([
        text,
        [...kinds],
      ]);
      expect(shadow.every(({ represented }) => !represented)).toBe(true);
    }
  });
});

const LOGS = "The system must retain audit logs.";
const LOGS_KEY = semanticClaimKey(LOGS);
const logs = (
  interpretations?: SemanticAdvisorInput["interpretations"],
): SemanticAdvisorInput => ({
  payload: {
    type: "req",
    id: "REQ-X",
    properties: { title: "T", status: "open", semantic_text: LOGS },
  },
  ...(interpretations ? { interpretations } : {}),
});
const hostRule = (count = 1) =>
  Array.from({ length: count }, () => ({
    claim_key: LOGS_KEY,
    claim_text: "The system must retain audit logs",
    ir: {} as never,
  }));

describe("host interpretations the validator reports on", () => {
  const validation = (result: Record<string, unknown>) =>
    track(
      spyOn(ir, "validateLogicIr").mockReturnValue({
        valid: true,
        errors: [],
        warnings: [],
        normalized: { kind: "rule" },
        semanticKey: "SEM-1",
        renderedProlog: "p.",
        ruleHash: "h",
        ...result,
      } as never),
    );
  const kinds = (input: SemanticAdvisorInput) =>
    capture(input).suggestions.map(({ kind }) => kind);

  test("suggests a rule only for a valid, normalized, keyed and rendered interpretation", () => {
    validation({});
    expect(kinds(logs(hostRule()))).toEqual(["ontology_gap", "rule"]);
    for (const missing of [
      { valid: false },
      { normalized: undefined },
      { semanticKey: undefined },
      { renderedProlog: undefined },
    ]) {
      for (const spy of spies.splice(0)) spy.mockRestore();
      validation(missing);
      expect([missing, kinds(logs(hostRule()))]).toEqual([
        missing,
        ["ontology_gap"],
      ]);
    }
  });

  test("reports the validator's findings and leaves an unkeyed interpretation unresolved", () => {
    validation({
      valid: false,
      errors: ["bad ir"],
      warnings: ["odd ir"],
      normalized: undefined,
      semanticKey: undefined,
      renderedProlog: undefined,
    });
    const rejected = capture(logs(hostRule()));
    expect(rejected.interpretations).toStrictEqual([
      {
        claim_key: LOGS_KEY,
        valid: false,
        confidence: 0.5,
        errors: ["bad ir"],
        warnings: ["odd ir"],
      },
    ]);
    for (const spy of spies.splice(0)) spy.mockRestore();

    validation({ semanticKey: undefined });
    const unkeyed = capture(logs(hostRule(2)));
    expect(unkeyed.interpretations[0]).toStrictEqual({
      claim_key: LOGS_KEY,
      normalized_ir: { kind: "rule" },
      valid: true,
      confidence: 0.5,
      errors: [],
      warnings: [],
      rendered_prolog: "p.",
    });
    expect(unkeyed.propositions[0]?.status).toBe("ontology_gap");
    expect(unkeyed.warnings).toEqual(["receipt warning"]);
  });
});

describe("interpretations of one claim", () => {
  test("warns only when two keyed interpretations differ", () => {
    const keys = ["SEM-1", undefined, "SEM-1"];
    track(
      spyOn(ir, "validateLogicIr").mockImplementation(((model: {
        n: number;
      }) => ({
        valid: true,
        errors: [],
        warnings: [],
        normalized: { kind: "rule" },
        semanticKey: keys[model.n],
        renderedProlog: "p.",
        ruleHash: "h",
      })) as never),
    );
    const interpretations = hostRule(3).map((entry, n) => ({
      ...entry,
      ir: { n } as never,
    }));
    expect(capture(logs(interpretations)).warnings).toEqual([
      "receipt warning",
    ]);
  });
});

describe("conditional clauses", () => {
  test("keeps a conditional rule the validator rejects as an unresolved ontology gap", () => {
    track(
      spyOn(conditional, "detectConditionalRule").mockReturnValue({
        kind: "rule",
        ir: {},
        shape: "only_when",
        evidence: "conditional evidence",
      } as never),
    );
    const [suggestion] = capture(logs()).suggestions;
    expect(suggestion).toMatchObject({
      kind: "ontology_gap",
      evidence: "conditional evidence",
      confidence: 0.6,
      rationale:
        "The conditional clause did not produce a valid kibi.logic.v1 rule; supply a typed interpretation instead of an observation.",
    });
  });
});

describe("catalog predicates", () => {
  test("uses an empty rationale when the catalog gives none", () => {
    track(
      spyOn(builtin, "createBuiltinOntologyPack").mockReturnValue({
        match: () => [
          {
            evidence: "ev",
            predicateName: "retains",
            arguments: ["system", "logs"],
            polarity: "assert",
          },
        ],
      } as never),
    );
    expect(capture(logs()).suggestions[0]).toMatchObject({
      kind: "predicate",
      evidence: "ev",
      rationale: "",
    });
  });
});
