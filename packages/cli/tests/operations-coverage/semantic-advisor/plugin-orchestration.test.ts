import { describe, expect, spyOn, test } from "bun:test";
import type { OntologyPackV1, SemanticClassifierV1 } from "kibi-plugin-sdk";
import * as prose from "../../../src/operations/semantic-advisor/analyze-prose.js";
import { analyzeSemanticAdvisorInput } from "../../../src/operations/semantic-advisor/analyze-prose.js";
import {
  analyzeSemanticAdvisorInputWithPlugins,
  applyClassificationRouting,
  applyOntologyMatchSuggestions,
  composeSemanticClassificationForOperation,
  stripSyncBuiltinOntologySuggestions,
} from "../../../src/operations/semantic-advisor/plugin-orchestration.js";
import type { SemanticAdvisorAnalysisResult } from "../../../src/operations/semantic-advisor/types.js";
import type { StampedOntologyCandidate } from "../../../src/plugins/compose-ontology-packs.js";
import type { ComposedSemanticClassifierResult } from "../../../src/plugins/compose-semantic-classifier.js";
import type { CapabilityRegistry } from "../../../src/plugins/registry.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";

const stamp = (pluginId: string, mode: string) => ({
  pluginId,
  pluginVersion: "1",
  capability: "x",
  mode,
  external: mode !== "builtin",
  network: false,
  metered: false,
});
function binding<T>(pluginId: string, mode: string, capability: T) {
  return {
    pluginId,
    pluginVersion: "1",
    packageName: mode === "builtin" ? null : `${pluginId}-pkg`,
    mode,
    permissions: { network: false, metered: false, secrets: [] },
    external: mode !== "builtin",
    capability,
    stamp: stamp(pluginId, mode === "builtin" ? "augment" : mode),
  };
}
const pack = (id: string, match: OntologyPackV1["match"]): OntologyPackV1 => ({
  id,
  schemas: () => [
    {
      schemaId: `${id}.holds`,
      predicateName: "holds",
      argumentNames: ["subject"],
      argumentTypes: ["entity"],
    },
  ],
  match,
});
const quiet: SemanticClassifierV1 = {
  id: "builtin",
  classify: () => ({ decisions: [] }),
};
function registry(
  options: {
    plugins?: number;
    classifier?: SemanticClassifierV1;
    shadowPack?: OntologyPackV1;
  } = {},
): CapabilityRegistry {
  return {
    getProjectConfig: async () => ({
      plugins: Array.from({ length: options.plugins ?? 1 }, () => ({
        package: "p",
      })),
    }),
    resolveSemanticClassifiers: async () => ({
      builtin: binding("builtin", "builtin", options.classifier ?? quiet),
      replace: null,
      augment: [],
      shadow: [],
    }),
    resolveOntologyPacks: async () => ({
      builtin: binding(
        "builtin",
        "builtin",
        pack("builtin", () => []),
      ),
      replace: null,
      augment: [],
      shadow: options.shadowPack
        ? [binding("shadow", "shadow", options.shadowPack)]
        : [],
    }),
  } as unknown as CapabilityRegistry;
}

const input = (text: string) => ({
  payload: {
    type: "req",
    id: "REQ-1",
    properties: { title: "REQ-1", status: "open", semantic_text: text },
    relationships: [],
  },
});
const TEXT = "Checkout requires payment authorization before submission.";

describe("analyzeSemanticAdvisorInputWithPlugins", () => {
  test("returns the plain analysis when no plugin is configured", async () => {
    const result = await analyzeSemanticAdvisorInputWithPlugins(input(TEXT), {
      ensurePlugins: async () => registry({ plugins: 0 }),
      operationName: "kb_semantic_advisor",
    });
    expect(result.classification).toBeNull();
    expect(result.stamps).toStrictEqual([]);
  });

  test("collects shadow ontology matches once each", async () => {
    const shadowPack = pack("shadow", () => [
      {
        schemaId: "shadow.holds",
        predicateName: "holds",
        polarity: "assert",
        arguments: ["checkout"],
        confidence: 0.5,
        evidence: "Checkout",
      },
    ]);
    const result = await analyzeSemanticAdvisorInputWithPlugins(
      input(`${TEXT} Checkout must log every payment attempt.`),
      {
        ensurePlugins: async () => registry({ shadowPack }),
        operationName: "kb_semantic_advisor",
      },
    );
    expect(
      result.ontologyShadowMatches.map((row) => row.schemaId),
    ).toStrictEqual(["shadow.holds"]);
  });
});

describe("analyzeSemanticAdvisorInputWithPlugins on a modeled requirement", () => {
  test("skips the classifier and still applies ontology matches", async () => {
    const modeled = analysis({ logic_readiness: "modeled" });
    const spy = spyOn(prose, "analyzeSemanticAdvisorInput").mockReturnValue(
      modeled,
    );
    try {
      const result = await analyzeSemanticAdvisorInputWithPlugins(input(TEXT), {
        ensurePlugins: async () => registry(),
        operationName: "kb_semantic_advisor",
      });
      expect(result.classification).toBeNull();
      expect(result.analysis.receipt).toStrictEqual(modeled.receipt);
    } finally {
      spy.mockRestore();
    }
  });
});

describe("composeSemanticClassificationForOperation", () => {
  test("needs plugins, an allowlisted operation and a configured plugin", async () => {
    const propositions = { propositions: [{ claimKey: "c1", statement: "x" }] };
    expect(
      await composeSemanticClassificationForOperation(
        undefined,
        "kb_semantic_advisor",
        propositions,
      ),
    ).toBeNull();
    const context = (plugins: number) =>
      ({
        ensurePlugins: async () => registry({ plugins }),
      }) as unknown as OperationContext;
    expect(
      await composeSemanticClassificationForOperation(
        context(1),
        "kb_check",
        propositions,
      ),
    ).toBeNull();
    expect(
      await composeSemanticClassificationForOperation(
        context(0),
        "kb_semantic_advisor",
        propositions,
      ),
    ).toBeNull();
    const composed = await composeSemanticClassificationForOperation(
      context(1),
      "kb_semantic_advisor",
      propositions,
    );
    expect(composed?.fallbackUsed).toBe(false);
  });
});

/** A hand-built analysis with two unresolved claims and no suggestions. */
function analysis(
  overrides: Partial<SemanticAdvisorAnalysisResult["receipt"]> = {},
): SemanticAdvisorAnalysisResult {
  return {
    receipt: {
      ...analyzeSemanticAdvisorInput(input("The editor must autosave."))
        .receipt,
      logic_readiness: "unresolved",
      candidate_lane: "none",
      summary: "Summary.",
      suggestions: [],
      suggested_next_tools: [],
      propositions: [
        {
          claim_key: "c1",
          claim_text: "The editor must autosave.",
          role: "normative",
          status: "missing",
          span: { start: 0, end: 1 },
        },
        {
          claim_key: "c2",
          claim_text: "The editor must lint.",
          role: "normative",
          status: "missing",
          span: { start: 0, end: 1 },
        },
      ],
      ...overrides,
    } as SemanticAdvisorAnalysisResult["receipt"],
    warnings: [],
  };
}
const classification = (
  decisions: ComposedSemanticClassifierResult["decisions"],
  extra: Partial<ComposedSemanticClassifierResult> = {},
) =>
  ({
    decisions,
    stamps: [],
    diagnostics: [],
    fallbackUsed: false,
    shadowComparisons: [],
    ...extra,
  }) as unknown as ComposedSemanticClassifierResult;

describe("applyClassificationRouting", () => {
  test("keeps a modeled receipt and reports classifier failures", () => {
    const modeled = analysis({ logic_readiness: "modeled" });
    const result = applyClassificationRouting(
      modeled,
      classification([], {
        fallbackUsed: true,
        diagnostics: [
          { pluginId: "p1", code: "timeout", message: "slow", model: "m1" },
          { pluginId: "p2", code: "error", message: "bad" },
        ] as unknown as ComposedSemanticClassifierResult["diagnostics"],
      }),
    );
    expect(result.receipt).toStrictEqual(modeled.receipt);
    expect(result.warnings).toStrictEqual([
      "Semantic classifier fell back to the builtin provider after an external classifier failure.",
      "Semantic classifier 'p1' failed (timeout model=m1): slow",
      "Semantic classifier 'p2' failed (error): bad",
    ]);
    const plain = applyClassificationRouting(modeled, classification([]));
    expect(plain.warnings).toStrictEqual([]);
  });

  test("routes rule, review and ambiguous claims", () => {
    const result = applyClassificationRouting(
      analysis(),
      classification(
        [
          { claimKey: "c1", lane: "rule", confidence: 0.6 },
          {
            claimKey: "c2",
            lane: "strict_property",
            confidence: 0.4,
            ambiguity: { ambiguous: true },
          },
          { claimKey: "c3", lane: "predicate", confidence: 0.4 },
        ] as ComposedSemanticClassifierResult["decisions"],
        {
          fallbackUsed: true,
          diagnostics: [
            { pluginId: "p1", code: "timeout", message: "slow" },
          ] as unknown as ComposedSemanticClassifierResult["diagnostics"],
        },
      ),
      [],
      { classifierReplaced: true },
    );
    expect(result.receipt.candidate_lane).toBe("strict_property");
    expect(result.receipt.propositions[1]?.status).toBe("ambiguous");
    expect(result.receipt.propositions[1]?.reason).toBe(
      "Classifier marked this claim as ambiguous; review before grounding.",
    );
    expect(
      result.receipt.suggestions.map((row) => [row.claim_key, row.kind]),
    ).toStrictEqual([
      ["c1", "ontology_gap"],
      ["c2", "ambiguity_observation"],
    ]);
    expect(result.receipt.suggestions[0]?.evidence).toBe("rule");
    expect(result.warnings).toStrictEqual([
      "Semantic classifier fell back to the builtin provider after an external classifier failure.",
      "Semantic classifier 'p1' failed (timeout): slow",
    ]);
  });

  test("an abstaining replace classifier starts from no lane", () => {
    const result = applyClassificationRouting(
      analysis({ candidate_lane: "rule" }),
      classification([
        { claimKey: "c1", lane: "none", confidence: 0 },
      ] as ComposedSemanticClassifierResult["decisions"]),
      [],
      { classifierReplaced: true },
    );
    expect(result.receipt.candidate_lane).toBe("none");
    expect(result.receipt.summary).toBe("Summary.");
  });
});

describe("stripSyncBuiltinOntologySuggestions", () => {
  test("returns an analysis without predicate suggestions unchanged", () => {
    const plain = analysis();
    expect(stripSyncBuiltinOntologySuggestions(plain)).toBe(plain);
  });
});

describe("applyOntologyMatchSuggestions", () => {
  const match = (
    fields: Partial<StampedOntologyCandidate>,
  ): StampedOntologyCandidate =>
    ({
      schemaId: "pack.holds",
      predicateName: "holds",
      polarity: "assert",
      arguments: ["editor"],
      confidence: 0.7,
      evidence: "",
      claimKey: "",
      packId: "pack",
      stamp: stamp("pack", "replace"),
      ...fields,
    }) as StampedOntologyCandidate;

  test("keeps a modeled receipt", () => {
    const modeled = analysis({ logic_readiness: "modeled" });
    expect(applyOntologyMatchSuggestions(modeled, [match({})])).toBe(modeled);
  });

  test("replaces an ontology gap and falls back to the first claim", () => {
    const base = analysis({
      suggestions: [
        {
          kind: "ontology_gap",
          claim_key: "c2",
          claim_text: "The editor must lint.",
          confidence: 0.2,
          evidence: "x",
          rationale: "old",
          suggested_next_tool: "kb_suggest_predicates",
          recommendedPredicateSchema: null,
          applyPlan: [],
        },
        {
          kind: "strict_property",
          claim_key: "c1",
          claim_text: "The editor must autosave.",
          confidence: 0.9,
          evidence: "autosave",
          rationale: "strict",
          suggested_next_tool: "kb_model_requirement",
          applyPlan: [],
        } as unknown as SemanticAdvisorAnalysisResult["receipt"]["suggestions"][number],
      ],
    });
    const result = applyOntologyMatchSuggestions(
      base,
      [
        match({ evidence: "lint", rationale: "linted" }),
        match({ evidence: "no such words" }),
      ],
      { replaced: true },
    );
    expect(
      result.receipt.suggestions.map((row) => [
        row.claim_key,
        row.kind,
        row.rationale,
      ]),
    ).toStrictEqual([
      ["c2", "ontology_gap", "linted"],
      ["c1", "strict_property", "strict"],
    ]);
  });

  test("replaces a predicate suggestion whose kind changed meanwhile", () => {
    const base = analysis({
      suggestions: [
        {
          kind: "predicate",
          claim_key: "c1",
          claim_text: "The editor must autosave.",
          confidence: 0.2,
          evidence: "x",
          rationale: "old",
          suggested_next_tool: "kb_suggest_predicates",
          applyPlan: [],
        } as unknown as SemanticAdvisorAnalysisResult["receipt"]["suggestions"][number],
      ],
    });
    const result = applyOntologyMatchSuggestions(
      base,
      [match({ claimKey: "c1" })],
      {
        replaced: true,
      },
    );
    expect(result.receipt.suggestions).toHaveLength(1);
    expect(result.receipt.suggestions[0]?.kind).toBe("ontology_gap");
    expect(result.receipt.suggestions[0]?.rationale).toBe(
      "Ontology pack 'pack' matched holds; review via kb_model (mode predicates) before mutation.",
    );
  });
});
