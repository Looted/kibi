import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as prose from "../../../src/operations/semantic-advisor/analyze-prose.js";
import {
  analyzeSemanticAdvisorInputWithPlugins,
  applyClassificationRouting,
  applyOntologyMatchSuggestions,
  composeOntologyCatalogForOperation,
  composeSemanticClassificationForOperation,
  stripSyncBuiltinOntologySuggestions,
} from "../../../src/operations/semantic-advisor/plugin-orchestration.js";
import type {
  SemanticAdvisorAnalysisResult,
  SemanticAdvisorInput,
} from "../../../src/operations/semantic-advisor/types.js";
import * as ontologyPacks from "../../../src/plugins/compose-ontology-packs.js";
import type { StampedOntologyCandidate } from "../../../src/plugins/compose-ontology-packs.js";
import * as classifier from "../../../src/plugins/compose-semantic-classifier.js";
import type { ComposedSemanticClassifierResult } from "../../../src/plugins/compose-semantic-classifier.js";
import * as allowlist from "../../../src/plugins/external-allowlist.js";
import type { CapabilityRegistry } from "../../../src/plugins/registry.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";

const spies: { mockRestore: () => void }[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
});
function track<T extends { mockRestore: () => void }>(spy: T): T {
  spies.push(spy);
  return spy;
}

type Row = Record<string, unknown>;

const proposition = (claimKey: string, text: string, extra: Row = {}) => ({
  claim_key: claimKey,
  claim_text: text,
  role: "normative",
  status: "missing",
  ...extra,
});

const suggestion = (
  claimKey: string,
  kind: string,
  tool = "kb_model_requirement",
  extra: Row = {},
) => ({
  kind,
  claim_key: claimKey,
  claim_text: `text ${claimKey}`,
  confidence: 0.5,
  evidence: "e",
  rationale: `why ${claimKey}.`,
  suggested_next_tool: tool,
  applyPlan: [],
  ...extra,
});

function analysis(
  receipt: Row = {},
  warnings: string[] = ["w"],
): SemanticAdvisorAnalysisResult {
  return {
    receipt: {
      logic_readiness: "unresolved",
      candidate_lane: "none",
      summary: "Summary.",
      suggested_next_tools: ["kb_check"],
      propositions: [
        proposition("k1", "Checkout requires payment."),
        proposition("k2", "Refunds take three days."),
      ],
      suggestions: [],
      ...receipt,
    },
    warnings,
  } as unknown as SemanticAdvisorAnalysisResult;
}

const receiptOf = (result: SemanticAdvisorAnalysisResult) =>
  result.receipt as unknown as Row;

const match = (extra: Row = {}): StampedOntologyCandidate =>
  ({
    schemaId: "pack.holds",
    predicateName: "holds",
    polarity: "assert",
    arguments: ["a", "b"],
    confidence: 0.7,
    evidence: "zzz",
    claimKey: "none",
    packId: "pack",
    stamp: {},
    ...extra,
  }) as unknown as StampedOntologyCandidate;

const gap = (claimKey: string, text: string, extra: Row = {}) => ({
  kind: "ontology_gap",
  claim_key: claimKey,
  claim_text: text,
  confidence: 0.7,
  evidence: "zzz",
  rationale:
    "Ontology pack 'pack' matched holds; review via kb_model (mode predicates) before mutation.",
  suggested_next_tool: "kb_suggest_predicates",
  recommendedPredicateSchema: {
    predicate_name: "holds",
    argument_names: ["arg0", "arg1"],
    argument_types: ["string", "string"],
  },
  applyPlan: [],
  ...extra,
});

describe("stripSyncBuiltinOntologySuggestions", () => {
  test("an analysis without predicate suggestions is returned as it is", () => {
    const plain = analysis({ suggestions: [suggestion("k1", "rule")] });
    expect(stripSyncBuiltinOntologySuggestions(plain)).toBe(plain);
  });

  test("predicate suggestions are dropped with a warning", () => {
    const rule = suggestion("k1", "rule");
    const result = stripSyncBuiltinOntologySuggestions(
      analysis({
        suggestions: [suggestion("k2", "predicate"), rule],
      }),
    );
    expect(result).toStrictEqual(
      analysis({ suggestions: [rule] }, [
        "w",
        "Builtin ontology predicate suggestions cleared for replace-mode ontology pack.",
      ]),
    );
  });
});

describe("applyOntologyMatchSuggestions", () => {
  test("a modeled analysis, or no matches outside replace mode, is unchanged", () => {
    const modeled = analysis({ logic_readiness: "modeled" });
    expect(applyOntologyMatchSuggestions(modeled, [match()])).toBe(modeled);
    expect(
      applyOntologyMatchSuggestions(modeled, [match()], { replaced: true }),
    ).toBe(modeled);
    const plain = analysis();
    expect(applyOntologyMatchSuggestions(plain, [])).toBe(plain);
    expect(applyOntologyMatchSuggestions(plain, [], { replaced: false })).toBe(
      plain,
    );
  });

  test("replace mode with no matches still settles the suggested tools", () => {
    const result = applyOntologyMatchSuggestions(
      analysis({
        suggested_next_tools: ["kb_check", "kb_model_requirement"],
        suggestions: [
          suggestion("k1", "rule", "kb_suggest_predicates"),
          suggestion("k2", "strict_property"),
        ],
      }),
      [],
      { replaced: true },
    );
    expect(receiptOf(result).suggested_next_tools).toStrictEqual([
      "kb_check",
      "kb_model_requirement",
      "kb_suggest_predicates",
    ]);
    expect(result.warnings).toStrictEqual(["w"]);
  });

  test("a match goes to its own claim, else the claim quoting its evidence, else the first claim", () => {
    const result = applyOntologyMatchSuggestions(analysis(), [
      match({ claimKey: "k2", evidence: "Checkout" }),
    ]);
    expect(receiptOf(result).suggestions).toStrictEqual([
      gap("k2", "Refunds take three days.", { evidence: "Checkout" }),
    ]);
    expect(receiptOf(result).suggested_next_tools).toStrictEqual([
      "kb_check",
      "kb_suggest_predicates",
    ]);
    expect(
      receiptOf(
        applyOntologyMatchSuggestions(analysis(), [
          match({ claimKey: "gone", evidence: "three days" }),
        ]),
      ).suggestions,
    ).toStrictEqual([
      gap("k2", "Refunds take three days.", { evidence: "three days" }),
    ]);
    expect(
      receiptOf(
        applyOntologyMatchSuggestions(analysis(), [
          match({ rationale: "Given.", arguments: [] }),
        ]),
      ).suggestions,
    ).toStrictEqual([
      gap("k1", "Checkout requires payment.", {
        rationale: "Given.",
        recommendedPredicateSchema: {
          predicate_name: "holds",
          argument_names: [],
          argument_types: [],
        },
      }),
    ]);
    expect(
      receiptOf(
        applyOntologyMatchSuggestions(analysis({ propositions: [] }), [
          match(),
        ]),
      ).suggestions,
    ).toStrictEqual([]);
  });

  test("outside replace mode a match only fills a claim without a suggestion", () => {
    const existing = suggestion("k1", "predicate", "kb_suggest_predicates");
    const result = applyOntologyMatchSuggestions(
      analysis({ suggestions: [existing] }),
      [
        match({ claimKey: "k1" }),
        match({ claimKey: "k2" }),
        match({ claimKey: "k2", predicateName: "other" }),
      ],
    );
    expect(receiptOf(result).suggestions).toStrictEqual([
      existing,
      gap("k2", "Refunds take three days."),
    ]);
  });

  test("replace mode overrides predicate and ontology suggestions in place, never host ones", () => {
    const strict = suggestion("k1", "strict_property");
    const predicate = suggestion("k2", "predicate", "kb_suggest_predicates");
    const ontology = suggestion("k3", "ontology_gap", "kb_suggest_predicates");
    const rule = suggestion("k4", "rule", "kb_suggest_predicates");
    const ambiguity = suggestion("k5", "ambiguity_observation");
    const propositions = ["k1", "k2", "k3", "k4", "k5", "k6"].map((key) =>
      proposition(key, `Claim ${key}.`),
    );
    const result = applyOntologyMatchSuggestions(
      analysis({
        propositions,
        suggestions: [strict, predicate, ontology, rule, ambiguity],
      }),
      ["k1", "k2", "k3", "k4", "k5", "k6", "k6"].map((claimKey, index) =>
        match({ claimKey, confidence: index }),
      ),
      { replaced: true },
    );
    expect(receiptOf(result).suggestions).toStrictEqual([
      strict,
      gap("k2", "Claim k2.", { confidence: 1 }),
      gap("k3", "Claim k3.", { confidence: 2 }),
      rule,
      ambiguity,
      gap("k6", "Claim k6.", { confidence: 6 }),
    ]);
  });

  test("an override replaces the suggestion of the same claim and kind", () => {
    const result = applyOntologyMatchSuggestions(
      analysis({
        suggestions: [
          suggestion("k2", "rule"),
          suggestion("k0", "predicate"),
          suggestion("k1", "rule"),
          suggestion("k1", "predicate"),
        ],
      }),
      [match({ claimKey: "k1" })],
      { replaced: true },
    );
    expect(receiptOf(result).suggestions).toStrictEqual([
      suggestion("k2", "rule"),
      suggestion("k0", "predicate"),
      suggestion("k1", "rule"),
      gap("k1", "Checkout requires payment."),
    ]);
  });
});

const decision = (claimKey: string, lane: string, extra: Row = {}) => ({
  claimKey,
  lane,
  confidence: 0.6,
  ...extra,
});

function classification(
  decisions: Row[],
  extra: Partial<Record<keyof ComposedSemanticClassifierResult, unknown>> = {},
): ComposedSemanticClassifierResult {
  return {
    decisions,
    stamps: [],
    shadowComparisons: [],
    fallbackUsed: false,
    diagnostics: [],
    ...extra,
  } as unknown as ComposedSemanticClassifierResult;
}

const FALLBACK =
  "Semantic classifier fell back to the builtin provider after an external classifier failure.";
const PREDICATE_REVIEW =
  "Classifier recommends predicate/ontology review; unresolved claims remain unresolved until grounded.";
const ABSTAINED =
  "Replace semantic classifier abstained; sync analyze-prose candidate lane was not retained.";

describe("applyClassificationRouting", () => {
  test("a modeled analysis keeps its receipt and gains only the classifier warnings", () => {
    const modeled = analysis({
      logic_readiness: "modeled",
      candidate_lane: "strict_property",
    });
    const result = applyClassificationRouting(
      modeled,
      classification([decision("k1", "predicate")], {
        fallbackUsed: true,
        diagnostics: [
          { pluginId: "p", code: "timeout", message: "slow" },
          { pluginId: "q", code: "error", model: "m1", message: "bad" },
        ],
      }),
      [match()],
      { replaced: true, classifierReplaced: true },
    );
    expect(result).toStrictEqual({
      receipt: modeled.receipt,
      warnings: [
        "w",
        FALLBACK,
        "Semantic classifier 'p' failed (timeout): slow",
        "Semantic classifier 'q' failed (error model=m1): bad",
      ],
    });
  });

  test("decisions route claims without grounding them", () => {
    const result = applyClassificationRouting(
      analysis({
        propositions: [
          proposition("k1", "One."),
          proposition("k2", "Two.", { reason: "Own reason." }),
          proposition("k3", "Three.", { status: "ambiguous" }),
          proposition("k4", "Four."),
          proposition("k5", "Five."),
        ],
      }),
      classification([
        decision("k1", "rule", { ambiguity: { ambiguous: true } }),
        decision("k2", "observation_review", {
          ambiguity: { ambiguous: true },
        }),
        decision("k3", "strict_property", { ambiguity: { ambiguous: false } }),
        decision("k4", "none", { ambiguity: { ambiguous: true } }),
        decision("k5", "predicate"),
        decision("gone", "rule"),
      ]),
    );
    expect(receiptOf(result).propositions).toStrictEqual([
      proposition("k1", "One.", {
        status: "ambiguous",
        reason:
          "Classifier marked this claim as ambiguous; review before grounding.",
      }),
      proposition("k2", "Two.", { status: "ambiguous", reason: "Own reason." }),
      proposition("k3", "Three.", { status: "ambiguous" }),
      proposition("k4", "Four."),
      proposition("k5", "Five."),
    ]);
  });

  test("an ambiguous claim that is not missing keeps its status", () => {
    const result = applyClassificationRouting(
      analysis({
        propositions: [proposition("k1", "One.", { status: "ontology_gap" })],
      }),
      classification([
        decision("k1", "rule", { ambiguity: { ambiguous: true } }),
      ]),
    );
    expect((receiptOf(result).propositions as Row[])[0]?.status).toBe(
      "ontology_gap",
    );
  });

  test("claims without a suggestion get an advisory one for their lane", () => {
    const propositions = ["k1", "k2", "k3", "k4", "k5", "k6"].map((key) =>
      proposition(key, `Claim ${key}.`),
    );
    const result = applyClassificationRouting(
      analysis({ propositions }),
      classification([
        decision("k1", "predicate", {
          signals: ["normative_modal", "conditional"],
        }),
        decision("k2", "rule", { signals: [] }),
        decision("k3", "observation_review"),
        decision("k4", "strict_property", {
          ambiguity: { ambiguous: true },
          signals: ["s", "t"],
        }),
        decision("k5", "strict_property"),
        decision("k6", "none", { ambiguity: { ambiguous: true } }),
        decision("k1", "rule"),
        decision("k3", "observation_review"),
      ]),
    );
    const routed = {
      kind: "ontology_gap",
      rationale:
        "Classifier recommends predicate/ontology modeling; the claim remains unresolved until grounded via kb_suggest_predicates.",
      suggested_next_tool: "kb_suggest_predicates",
      recommendedPredicateSchema: null,
      applyPlan: [],
    };
    const review = {
      kind: "ambiguity_observation",
      rationale:
        "Classifier flagged this claim for review before assertive modeling.",
      ambiguity: ["needs_review"],
      suggested_next_tool: "kb_model_requirement",
      applyPlan: [],
    };
    const advisory = (template: Row, key: string, evidence: string) => {
      const { applyPlan, ...rest } = template;
      return {
        kind: rest.kind,
        claim_key: key,
        claim_text: `Claim ${key}.`,
        confidence: 0.6,
        evidence,
        ...rest,
        applyPlan,
      };
    };
    expect(receiptOf(result).suggestions).toStrictEqual([
      advisory(routed, "k1", "normative_modal, conditional"),
      advisory(routed, "k2", "rule"),
      advisory(review, "k3", "observation_review"),
      advisory(review, "k4", "s, t"),
    ]);
  });

  test("an existing suggestion is re-routed when the lane lifts it, never removed", () => {
    const keys = ["k1", "k2", "k3", "k4", "k5", "k6", "k7", "k8"];
    const existing = [
      suggestion("k1", "ambiguity_observation"),
      suggestion("k2", "ontology_gap", "kb_model_requirement"),
      suggestion("k3", "rule"),
      suggestion("k4", "strict_property"),
      suggestion("k5", "ambiguity_observation", "kb_suggest_predicates"),
      suggestion("k6", "rule"),
      suggestion("k7", "ambiguity_observation"),
      suggestion("k8", "predicate", "kb_suggest_predicates"),
    ];
    const result = applyClassificationRouting(
      analysis({
        propositions: keys.map((key) => proposition(key, `Claim ${key}.`)),
        suggestions: existing,
      }),
      classification([
        decision("k1", "rule"),
        decision("k2", "predicate"),
        decision("k3", "predicate"),
        decision("k4", "predicate"),
        decision("k5", "predicate"),
        decision("k6", "rule"),
        decision("k7", "observation_review"),
        decision("k8", "strict_property"),
        decision("k1", "strict_property"),
        decision("k3", "rule"),
      ]),
    );
    const rerouted = (row: Row, lane: string, tool: string) => ({
      ...row,
      suggested_next_tool: tool,
      rationale: `${row.rationale} Classifier lane '${lane}' recommends ${tool}.`,
    });
    const k1 = rerouted(existing[0] as Row, "rule", "kb_suggest_predicates");
    expect(receiptOf(result).suggestions).toStrictEqual([
      rerouted(k1, "strict_property", "kb_model_requirement"),
      rerouted(existing[1] as Row, "predicate", "kb_suggest_predicates"),
      rerouted(existing[2] as Row, "predicate", "kb_suggest_predicates"),
      existing[3],
      existing[4],
      existing[5],
      existing[6],
      existing[7],
    ]);
  });

  test("a re-route replaces the suggestion of the same claim and kind", () => {
    const result = applyClassificationRouting(
      analysis({
        suggestions: [
          suggestion("k2", "ambiguity_observation"),
          suggestion("k0", "ontology_gap"),
          suggestion("k1", "rule"),
          suggestion("k1", "ontology_gap"),
        ],
      }),
      classification([decision("k1", "rule")]),
    );
    expect(receiptOf(result).suggestions).toStrictEqual([
      suggestion("k2", "ambiguity_observation"),
      suggestion("k0", "ontology_gap"),
      suggestion("k1", "rule"),
      suggestion("k1", "ontology_gap", "kb_suggest_predicates", {
        rationale:
          "why k1. Classifier lane 'rule' recommends kb_suggest_predicates.",
      }),
    ]);
  });

  test.each([
    [["observation_review"], "none", "observation_review"],
    [["rule", "observation_review"], "none", "rule"],
    [["predicate", "rule"], "none", "predicate"],
    [["rule", "strict_property", "predicate"], "none", "strict_property"],
    [["observation_review"], "rule", "rule"],
    [["rule"], "rule", "rule"],
    [["predicate"], "rule", "predicate"],
    [["none"], "observation_review", "observation_review"],
    [[], "predicate", "predicate"],
    [["predicate", "strict_property"], "none", "strict_property"],
    [["observation_review", "rule"], "none", "rule"],
  ] as const)("lanes %j over %s give %s", (lanes, current, expected) => {
    const result = applyClassificationRouting(
      analysis({ candidate_lane: current }),
      classification(lanes.map((lane) => decision("gone", lane))),
    );
    expect(receiptOf(result).candidate_lane).toBe(expected);
  });

  test("the summary, tools and warnings follow the candidate lane", () => {
    const result = applyClassificationRouting(
      analysis({
        suggested_next_tools: ["kb_check", "kb_suggest_predicates"],
        suggestions: [suggestion("k2", "strict_property")],
      }),
      classification([decision("k1", "rule")], { fallbackUsed: true }),
    );
    expect(receiptOf(result).summary).toBe(
      "Summary. Classifier routing: rule → kb_suggest_predicates.",
    );
    expect(receiptOf(result).suggested_next_tools).toStrictEqual([
      "kb_check",
      "kb_suggest_predicates",
      "kb_model_requirement",
    ]);
    expect(result.warnings).toStrictEqual(["w", FALLBACK, PREDICATE_REVIEW]);

    const strict = applyClassificationRouting(
      analysis(),
      classification([decision("gone", "strict_property")]),
    );
    expect(receiptOf(strict).summary).toBe(
      "Summary. Classifier routing: strict_property → kb_model_requirement.",
    );
    expect(receiptOf(strict).suggested_next_tools).toStrictEqual([
      "kb_check",
      "kb_model_requirement",
    ]);
    expect(strict.warnings).toStrictEqual(["w"]);

    const predicate = applyClassificationRouting(
      analysis(),
      classification([decision("gone", "predicate")]),
    );
    expect(predicate.warnings).toStrictEqual(["w", PREDICATE_REVIEW]);

    const quiet = applyClassificationRouting(analysis(), classification([]));
    expect(receiptOf(quiet).summary).toBe("Summary.");
    expect(receiptOf(quiet).suggested_next_tools).toStrictEqual(["kb_check"]);
    expect(quiet.warnings).toStrictEqual(["w"]);
  });

  test("a replace classifier owns the candidate lane, and its abstention is reported", () => {
    const sync = analysis({ candidate_lane: "rule" });
    const abstained = applyClassificationRouting(
      sync,
      classification([decision("k1", "none")]),
      [],
      { classifierReplaced: true },
    );
    expect(receiptOf(abstained).candidate_lane).toBe("none");
    expect(abstained.warnings).toStrictEqual(["w", ABSTAINED]);
    expect(
      applyClassificationRouting(sync, classification([]), [], {
        classifierReplaced: true,
      }).warnings,
    ).toStrictEqual(["w", ABSTAINED]);
    const decided = applyClassificationRouting(
      sync,
      classification([
        decision("k1", "none"),
        decision("k1", "observation_review"),
      ]),
      [],
      { classifierReplaced: true },
    );
    expect(receiptOf(decided).candidate_lane).toBe("observation_review");
    expect(decided.warnings).toStrictEqual(["w"]);
    const kept = applyClassificationRouting(sync, classification([]), [], {
      classifierReplaced: false,
    });
    expect(receiptOf(kept).candidate_lane).toBe("rule");
    expect(kept.warnings).toStrictEqual(["w", PREDICATE_REVIEW]);
  });

  test("ontology matches apply after routing, in the requested mode", () => {
    const predicate = suggestion("k1", "predicate", "kb_suggest_predicates");
    const routed = (replaced?: boolean) =>
      receiptOf(
        applyClassificationRouting(
          analysis({ suggestions: [predicate] }),
          classification([]),
          [match({ claimKey: "k1" })],
          replaced === undefined ? {} : { replaced },
        ),
      ).suggestions;
    expect(routed(true)).toStrictEqual([
      gap("k1", "Checkout requires payment."),
    ]);
    expect(routed(false)).toStrictEqual([predicate]);
    expect(routed()).toStrictEqual([predicate]);
    expect(
      receiptOf(applyClassificationRouting(analysis(), classification([])))
        .suggestions,
    ).toStrictEqual([]);
  });
});

const INPUT = { payload: { type: "req" } } as unknown as SemanticAdvisorInput;

function registry(plugins: readonly unknown[] | "absent" = [{ package: "p" }]) {
  const calls: string[] = [];
  const value = {
    getProjectConfig: async () => {
      calls.push("config");
      return plugins === "absent" ? {} : { plugins };
    },
    resolveSemanticClassifiers: async () => {
      calls.push("classifiers");
      return "CLASSIFIERS";
    },
    resolveOntologyPacks: async () => {
      calls.push("packs");
      return "PACKS";
    },
  } as unknown as CapabilityRegistry;
  return { value, calls };
}

const stamp = (id: string, mode = "augment") => ({ pluginId: id, mode });

function catalog(replaced: boolean, stamps = [stamp("pack")]) {
  return {
    schemas: [],
    stamps,
    ownership: new Map(),
    replaced,
    diagnostics: [],
  };
}

describe("analyzeSemanticAdvisorInputWithPlugins", () => {
  function analyzed(result: SemanticAdvisorAnalysisResult = analysis()) {
    return track(
      spyOn(prose, "analyzeSemanticAdvisorInput").mockImplementation(
        () => result,
      ),
    );
  }
  const plain = (result: SemanticAdvisorAnalysisResult) => ({
    analysis: result,
    classification: null,
    ontologyCatalog: null,
    ontologyMatches: [],
    ontologyShadowMatches: [],
    stamps: [],
  });

  test("without plugins, an allowed operation or a configured plugin, the analysis is plain", async () => {
    const base = analysis();
    const spy = analyzed(base);
    expect(
      await analyzeSemanticAdvisorInputWithPlugins(INPUT, {
        operationName: "kb_semantic_advisor",
      }),
    ).toStrictEqual(plain(base));
    expect(spy.mock.calls[0]?.[0]).toBe(INPUT);
    const { value, calls } = registry();
    expect(
      await analyzeSemanticAdvisorInputWithPlugins(INPUT, {
        ensurePlugins: async () => value,
        operationName: "kb_check",
      }),
    ).toStrictEqual(plain(base));
    expect(calls).toStrictEqual([]);
    for (const plugins of [[], "absent"] as const) {
      const empty = registry(plugins);
      expect(
        await analyzeSemanticAdvisorInputWithPlugins(INPUT, {
          ensurePlugins: async () => empty.value,
          operationName: "kb_semantic_advisor",
        }),
      ).toStrictEqual(plain(base));
      expect(empty.calls).toStrictEqual(["config"]);
    }
  });

  test("classifies unresolved claims, collects each ontology match once and routes them", async () => {
    analyzed(
      analysis({
        propositions: [
          proposition("k1", "Checkout requires payment."),
          proposition("k2", "Refunds take three days."),
        ],
      }),
    );
    const composed = classification([decision("k1", "predicate")], {
      stamps: [stamp("classifier", "replace")],
    });
    const classify = track(
      spyOn(classifier, "composeSemanticClassification").mockImplementation(
        async () => composed,
      ),
    );
    track(
      spyOn(ontologyPacks, "composeOntologyCatalog").mockImplementation(
        () => catalog(false) as never,
      ),
    );
    const a = match({ claimKey: "k1", arguments: ["x"] });
    const b = match({ claimKey: "k2", arguments: ["y"] });
    const negated = match({
      claimKey: "k2",
      polarity: "negate",
      arguments: ["x"],
    });
    const joined = match({ claimKey: "k2", arguments: ["x", "y"] });
    const glued = match({ claimKey: "k2", arguments: ["xy"] });
    const other = match({
      claimKey: "k2",
      schemaId: "pack.other",
      arguments: ["x"],
    });
    const matches = track(
      spyOn(ontologyPacks, "composeOntologyMatches").mockImplementation(
        (_resolution, context) =>
          (context.claimKey === "k1"
            ? { canonical: [a, a, joined], shadow: [b] }
            : {
                canonical: [
                  match({ claimKey: "k2", arguments: ["x"] }),
                  negated,
                  other,
                  glued,
                  b,
                ],
                shadow: [b, a],
              }) as never,
      ),
    );
    const { value, calls } = registry();
    const result = await analyzeSemanticAdvisorInputWithPlugins(INPUT, {
      ensurePlugins: async () => value,
      operationName: "kb_semantic_advisor",
    });
    expect(calls).toStrictEqual(["config", "classifiers", "packs"]);
    const contexts = [
      {
        claimKey: "k1",
        statement: "Checkout requires payment.",
        role: "normative",
      },
      {
        claimKey: "k2",
        statement: "Refunds take three days.",
        role: "normative",
      },
    ];
    expect(classify.mock.calls[0]).toStrictEqual([
      "CLASSIFIERS",
      { propositions: contexts },
      { operationName: "kb_semantic_advisor" },
    ] as never);
    expect(matches.mock.calls).toStrictEqual([
      ["PACKS", contexts[0]],
      ["PACKS", contexts[1]],
    ] as never);
    expect(result.classification).toBe(composed);
    expect(result.ontologyCatalog).toStrictEqual(catalog(false) as never);
    expect(result.ontologyMatches).toStrictEqual([
      a,
      joined,
      negated,
      other,
      glued,
      b,
    ]);
    expect(result.ontologyShadowMatches).toStrictEqual([b, a]);
    expect(result.stamps).toStrictEqual([
      stamp("classifier", "replace"),
      stamp("pack"),
    ] as never);
    // A replace classifier owns the lane; the predicate lane wins.
    expect(receiptOf(result.analysis).candidate_lane).toBe("predicate");
  });

  test("a replace classifier that fell back does not own the lane", async () => {
    analyzed(analysis({ candidate_lane: "rule" }));
    for (const [extra, lane] of [
      [{ stamps: [stamp("c", "replace")], fallbackUsed: true }, "rule"],
      [{ stamps: [stamp("c", "augment")] }, "rule"],
      [{ stamps: [stamp("c", "augment"), stamp("d", "replace")] }, "none"],
    ] as const) {
      const classify = track(
        spyOn(classifier, "composeSemanticClassification").mockImplementation(
          async () => classification([], extra),
        ),
      );
      track(
        spyOn(ontologyPacks, "composeOntologyCatalog").mockImplementation(
          () => catalog(false) as never,
        ),
      );
      track(
        spyOn(ontologyPacks, "composeOntologyMatches").mockImplementation(
          () => ({ canonical: [], shadow: [] }) as never,
        ),
      );
      const result = await analyzeSemanticAdvisorInputWithPlugins(INPUT, {
        ensurePlugins: async () => registry().value,
        operationName: "kb_semantic_advisor",
      });
      expect(receiptOf(result.analysis).candidate_lane).toBe(lane);
      expect(classify).toHaveBeenCalledTimes(1);
      for (const spy of spies.splice(1)) spy.mockRestore();
    }
  });

  test("a modeled analysis is not classified; replace packs clear builtin predicates", async () => {
    const predicate = suggestion("k1", "predicate", "kb_suggest_predicates");
    analyzed(
      analysis({
        logic_readiness: "unresolved",
        suggestions: [predicate],
      }),
    );
    for (const spy of spies.splice(0)) spy.mockRestore();
    analyzed(
      analysis({ logic_readiness: "modeled", suggestions: [predicate] }),
    );
    const classify = track(spyOn(classifier, "composeSemanticClassification"));
    track(
      spyOn(ontologyPacks, "composeOntologyCatalog").mockImplementation(
        () => catalog(true, []) as never,
      ),
    );
    track(
      spyOn(ontologyPacks, "composeOntologyMatches").mockImplementation(
        () => ({ canonical: [], shadow: [] }) as never,
      ),
    );
    const { value, calls } = registry();
    const result = await analyzeSemanticAdvisorInputWithPlugins(INPUT, {
      ensurePlugins: async () => value,
      operationName: "kb_semantic_advisor",
    });
    expect(classify).not.toHaveBeenCalled();
    expect(calls).toStrictEqual(["config", "packs"]);
    expect(result.classification).toBeNull();
    expect(result.stamps).toStrictEqual([]);
    expect(receiptOf(result.analysis).suggestions).toStrictEqual([]);
    expect(result.analysis.warnings).toStrictEqual([
      "w",
      "Builtin ontology predicate suggestions cleared for replace-mode ontology pack.",
    ]);
  });

  test("without classification, matches fill claims in the catalog's mode", async () => {
    const predicate = suggestion("k1", "predicate", "kb_suggest_predicates");
    const run = async (replaced: boolean) => {
      for (const spy of spies.splice(0)) spy.mockRestore();
      analyzed(
        analysis({ logic_readiness: "modeled", suggestions: [predicate] }),
      );
      track(
        spyOn(ontologyPacks, "composeOntologyCatalog").mockImplementation(
          () => catalog(replaced) as never,
        ),
      );
      track(
        spyOn(ontologyPacks, "composeOntologyMatches").mockImplementation(
          (_resolution, context) =>
            ({
              canonical: [match({ claimKey: context.claimKey })],
              shadow: [],
            }) as never,
        ),
      );
      const result = await analyzeSemanticAdvisorInputWithPlugins(INPUT, {
        ensurePlugins: async () => registry().value,
        operationName: "kb_semantic_advisor",
      });
      return result.analysis;
    };
    // A modeled analysis keeps its suggestions either way.
    expect(receiptOf(await run(false)).suggestions).toStrictEqual([predicate]);
    expect(receiptOf(await run(true)).suggestions).toStrictEqual([]);
  });

  test("unresolved claims without classification decisions still get ontology matches", async () => {
    analyzed(analysis());
    track(
      spyOn(classifier, "composeSemanticClassification").mockImplementation(
        async () => classification([]),
      ),
    );
    track(
      spyOn(ontologyPacks, "composeOntologyCatalog").mockImplementation(
        () => catalog(true) as never,
      ),
    );
    track(
      spyOn(ontologyPacks, "composeOntologyMatches").mockImplementation(
        (_resolution, context) =>
          ({
            canonical:
              context.claimKey === "k1" ? [match({ claimKey: "k1" })] : [],
            shadow: [],
          }) as never,
      ),
    );
    const result = await analyzeSemanticAdvisorInputWithPlugins(INPUT, {
      ensurePlugins: async () => registry().value,
      operationName: "kb_semantic_advisor",
    });
    expect(receiptOf(result.analysis).suggestions).toStrictEqual([
      gap("k1", "Checkout requires payment."),
    ]);
  });
});

describe("composition for an operation", () => {
  const context = (value?: CapabilityRegistry) =>
    (value === undefined
      ? {}
      : { ensurePlugins: async () => value }) as unknown as OperationContext;
  const INPUT_PROPOSITIONS = { propositions: [] };

  test("the classifier is composed only for an allowed operation with plugins", async () => {
    const classify = track(
      spyOn(classifier, "composeSemanticClassification").mockImplementation(
        async () => "COMPOSED" as never,
      ),
    );
    expect(
      await composeSemanticClassificationForOperation(
        undefined,
        "kb_semantic_advisor",
        INPUT_PROPOSITIONS,
      ),
    ).toBeNull();
    expect(
      await composeSemanticClassificationForOperation(
        context(),
        "kb_semantic_advisor",
        INPUT_PROPOSITIONS,
      ),
    ).toBeNull();
    const blocked = registry();
    expect(
      await composeSemanticClassificationForOperation(
        context(blocked.value),
        "kb_check",
        INPUT_PROPOSITIONS,
      ),
    ).toBeNull();
    expect(blocked.calls).toStrictEqual([]);
    expect(
      await composeSemanticClassificationForOperation(
        context(registry([]).value),
        "kb_semantic_advisor",
        INPUT_PROPOSITIONS,
      ),
    ).toBeNull();
    expect(
      await composeSemanticClassificationForOperation(
        context(registry().value),
        "kb_semantic_advisor",
        INPUT_PROPOSITIONS,
      ),
    ).toBe("COMPOSED" as never);
    expect(classify.mock.calls).toStrictEqual([
      [
        "CLASSIFIERS",
        INPUT_PROPOSITIONS,
        { operationName: "kb_semantic_advisor" },
      ],
    ] as never);
  });

  test("the ontology catalog is composed only for an allowed operation with plugins", async () => {
    const compose = track(
      spyOn(ontologyPacks, "composeOntologyCatalog").mockImplementation(
        () => "CATALOG" as never,
      ),
    );
    expect(
      await composeOntologyCatalogForOperation(
        undefined,
        "kb_semantic_advisor",
      ),
    ).toBeNull();
    expect(
      await composeOntologyCatalogForOperation(
        context(),
        "kb_semantic_advisor",
      ),
    ).toBeNull();
    const blocked = registry();
    expect(
      await composeOntologyCatalogForOperation(
        context(blocked.value),
        "kb_check",
      ),
    ).toBeNull();
    expect(blocked.calls).toStrictEqual([]);
    expect(
      await composeOntologyCatalogForOperation(
        context(registry([]).value),
        "kb_semantic_advisor",
      ),
    ).toBeNull();
    expect(
      await composeOntologyCatalogForOperation(
        context(registry().value),
        "kb_semantic_advisor",
      ),
    ).toBe("CATALOG" as never);
    expect(compose.mock.calls).toStrictEqual([["PACKS"]] as never);
  });

  test("the allowlist decides by operation name", async () => {
    const allowed = track(
      spyOn(allowlist, "allowsExternalSemanticClassifier").mockImplementation(
        () => false,
      ),
    );
    expect(
      await composeOntologyCatalogForOperation(
        context(registry().value),
        "kb_semantic_advisor",
      ),
    ).toBeNull();
    expect(allowed.mock.calls).toStrictEqual([["kb_semantic_advisor"]]);
  });
});
