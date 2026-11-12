/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import type {
  OntologyMatchContext,
  PluginProviderStamp,
  SemanticClassificationDecision,
  SemanticClassifierInput,
  SemanticLane,
} from "kibi-plugin-sdk";

import {
  type ComposedOntologyCatalog,
  type StampedOntologyCandidate,
  composeOntologyCatalog,
  composeOntologyMatches,
} from "../../plugins/compose-ontology-packs.js";
import {
  type ComposedSemanticClassifierResult,
  composeSemanticClassification,
} from "../../plugins/compose-semantic-classifier.js";
import { allowsExternalSemanticClassifier } from "../../plugins/external-allowlist.js";
import type { CapabilityRegistry } from "../../plugins/registry.js";
import type { OperationContext } from "../../public/operations/runtime-types.js";
import { analyzeSemanticAdvisorInput } from "./analyze-prose.js";
import type {
  SemanticAdvisorAnalysisResult,
  SemanticAdvisorInput,
  SemanticAdvisorLane,
  SemanticAdvisorReceipt,
  SemanticModelingSuggestion,
  SemanticProposition,
} from "./types.js";

export type SemanticPluginOrchestrationResult = Readonly<{
  analysis: SemanticAdvisorAnalysisResult;
  classification: ComposedSemanticClassifierResult | null;
  ontologyCatalog: ComposedOntologyCatalog | null;
  ontologyMatches: readonly StampedOntologyCandidate[];
  ontologyShadowMatches: readonly StampedOntologyCandidate[];
  stamps: readonly PluginProviderStamp[];
}>;

function hasConfiguredPlugins(registry: CapabilityRegistry): Promise<boolean> {
  return registry.getProjectConfig().then((config) => {
    return (config.plugins?.length ?? 0) > 0;
  });
}

/** The lanes from weakest to strongest. */
const LANE_ORDER: readonly SemanticAdvisorLane[] = [
  "none",
  "observation_review",
  "rule",
  "predicate",
  "strict_property",
];

function laneRank(lane: SemanticLane | SemanticAdvisorLane): number {
  return LANE_ORDER.indexOf(lane);
}

function toolForLane(lane: SemanticAdvisorLane): string {
  return lane === "predicate" || lane === "rule"
    ? "kb_suggest_predicates"
    : "kb_model_requirement";
}

/**
 * Drop sync-path builtin ontology `predicate` suggestions.
 *
 * `analyzeSemanticAdvisorInput` always consults the builtin pack for
 * maintenance-safe deterministic matching. When a replace ontology pack is
 * active, those suggestions must not survive into the public receipt —
 * including when the replace pack abstains with a valid empty match set.
 */
export function stripSyncBuiltinOntologySuggestions(
  analysis: SemanticAdvisorAnalysisResult,
): SemanticAdvisorAnalysisResult {
  const suggestions = analysis.receipt.suggestions.filter(
    (suggestion) => suggestion.kind !== "predicate",
  );
  if (suggestions.length === analysis.receipt.suggestions.length) {
    return analysis;
  }
  return {
    ...analysis,
    receipt: {
      ...analysis.receipt,
      suggestions,
    },
    warnings: [
      ...analysis.warnings,
      "Builtin ontology predicate suggestions cleared for replace-mode ontology pack.",
    ],
  };
}

/**
 * Host-construct advisory modeling suggestions from validated ontology matches.
 *
 * When `replaced` is true, matches replace any remaining claim-keyed
 * suggestion for the matched claim (after sync builtin predicates were
 * stripped). When false (augment/builtin), matches only fill claims that
 * lack a suggestion.
 */
export function applyOntologyMatchSuggestions(
  analysis: SemanticAdvisorAnalysisResult,
  ontologyMatches: readonly StampedOntologyCandidate[],
  options: Readonly<{ replaced?: boolean }> = {},
): SemanticAdvisorAnalysisResult {
  if (analysis.receipt.logic_readiness === "modeled") {
    return analysis;
  }
  if (ontologyMatches.length === 0 && !options.replaced) {
    return analysis;
  }

  const propositions = analysis.receipt.propositions;
  const suggestions: SemanticModelingSuggestion[] = [
    ...analysis.receipt.suggestions,
  ];
  const suggestionByClaim = new Map(
    suggestions.map((suggestion) => [suggestion.claim_key, suggestion]),
  );

  for (const match of ontologyMatches) {
    // The match's own claim, else the claim quoting its evidence, else the
    // first claim.
    const proposition =
      propositions.find(
        (proposition) => proposition.claim_key === match.claimKey,
      ) ??
      propositions.find((proposition) =>
        proposition.claim_text.includes(match.evidence),
      ) ??
      propositions[0];
    if (!proposition) continue;
    const claimKey = proposition.claim_key;
    const existing = suggestionByClaim.get(claimKey);
    // Only replace mode overrides a suggestion, and it preserves
    // strict/rule/ambiguity host suggestions.
    if (
      existing &&
      (!options.replaced ||
        (existing.kind !== "predicate" && existing.kind !== "ontology_gap"))
    )
      continue;

    const advisory: SemanticModelingSuggestion = {
      kind: "ontology_gap",
      claim_key: claimKey,
      claim_text: proposition.claim_text,
      confidence: match.confidence,
      evidence: match.evidence,
      rationale:
        match.rationale ??
        `Ontology pack '${match.packId}' matched ${match.predicateName}; review via kb_model (mode predicates) before mutation.`,
      suggested_next_tool: "kb_suggest_predicates",
      recommendedPredicateSchema: {
        predicate_name: match.predicateName,
        argument_names: match.arguments.map((_, index) => `arg${index}`),
        argument_types: match.arguments.map(() => "string"),
      },
      applyPlan: [],
    };

    if (existing) {
      const index = suggestions.findIndex(
        (entry) =>
          entry.claim_key === existing.claim_key &&
          entry.kind === existing.kind,
      );
      // existing is always one of suggestions: the map only holds entries
      // of that list.
      suggestions[index] = advisory;
    } else {
      suggestions.push(advisory);
    }
    suggestionByClaim.set(claimKey, advisory);
  }

  const tools = [
    ...new Set([
      ...analysis.receipt.suggested_next_tools,
      ...suggestions.map((suggestion) => suggestion.suggested_next_tool),
    ]),
  ];

  return {
    ...analysis,
    receipt: {
      ...analysis.receipt,
      suggestions,
      suggested_next_tools: tools,
    },
  };
}

/**
 * Apply host-validated classifier decisions as a bounded routing seam.
 *
 * Plugins may influence per-proposition routing, candidate lane, suggested
 * next tools, and advisory ambiguity metadata. They must not delete
 * propositions, erase assertive unresolved obligations, downgrade modeled
 * completeness, manufacture typed grounding, or invent mutation/proof.
 */
export function applyClassificationRouting(
  analysis: SemanticAdvisorAnalysisResult,
  classification: ComposedSemanticClassifierResult,
  ontologyMatches: readonly StampedOntologyCandidate[] = [],
  options: Readonly<{
    replaced?: boolean;
    /** True when a replace semantic classifier succeeded (not builtin fallback). */
    classifierReplaced?: boolean;
  }> = {},
): SemanticAdvisorAnalysisResult {
  const receipt = analysis.receipt;
  const warnings = [
    ...analysis.warnings,
    ...(classification.fallbackUsed
      ? [
          "Semantic classifier fell back to the builtin provider after an external classifier failure.",
        ]
      : []),
    ...classification.diagnostics.map((diagnostic) => {
      const model = diagnostic.model ? ` model=${diagnostic.model}` : "";
      return `Semantic classifier '${diagnostic.pluginId}' failed (${diagnostic.code}${model}): ${diagnostic.message}`;
    }),
  ];
  // Never downgrade semantic completeness via plugin classification.
  if (receipt.logic_readiness === "modeled") return { receipt, warnings };

  const byClaim = new Map(
    classification.decisions.map((decision) => [decision.claimKey, decision]),
  );
  const classifierReplaced = options.classifierReplaced === true;

  const propositions = receipt.propositions.map((proposition) => {
    const decision = byClaim.get(proposition.claim_key);
    // `none` never changes a claim, so it cannot erase an assertive
    // unresolved obligation.
    if (!decision || decision.lane === "none") return proposition;

    // A predicate lane routes toward predicate modeling without claiming
    // the claim is grounded, so only ambiguity changes the status.
    const ambiguous = decision.ambiguity?.ambiguous === true;
    const status =
      ambiguous && proposition.status === "missing"
        ? "ambiguous"
        : proposition.status;
    return {
      ...proposition,
      status,
      ...(ambiguous
        ? {
            reason:
              proposition.reason ??
              "Classifier marked this claim as ambiguous; review before grounding.",
          }
        : {}),
    };
  });

  const suggestionByClaim = new Map(
    receipt.suggestions.map((suggestion) => [suggestion.claim_key, suggestion]),
  );
  const suggestions: SemanticModelingSuggestion[] = [...receipt.suggestions];

  for (const decision of classification.decisions) {
    if (decision.lane === "none") continue;
    const proposition = propositions.find(
      (entry) => entry.claim_key === decision.claimKey,
    );
    if (!proposition) continue;
    const existing = suggestionByClaim.get(decision.claimKey);
    const nextTool = toolForLane(decision.lane);
    if (existing) {
      // Re-route suggested tool when classifier lifts the lane; never remove.
      if (
        existing.suggested_next_tool !== nextTool &&
        (existing.kind === "ambiguity_observation" ||
          existing.kind === "ontology_gap" ||
          (decision.lane === "predicate" &&
            existing.kind !== "strict_property"))
      ) {
        const updated = {
          ...existing,
          suggested_next_tool: nextTool,
          rationale: `${existing.rationale} Classifier lane '${decision.lane}' recommends ${nextTool}.`,
        } as SemanticModelingSuggestion;
        const index = suggestions.findIndex(
          (entry) =>
            entry.claim_key === existing.claim_key &&
            entry.kind === existing.kind,
        );
        // existing is always one of suggestions: the map only holds entries
        // of that list.
        suggestions[index] = updated;
        suggestionByClaim.set(decision.claimKey, updated);
      }
      continue;
    }

    // Host-authored advisory suggestion from classifier routing only.
    if (decision.lane === "predicate" || decision.lane === "rule") {
      const advisory: SemanticModelingSuggestion = {
        kind: "ontology_gap",
        claim_key: decision.claimKey,
        claim_text: proposition.claim_text,
        confidence: decision.confidence,
        evidence: decision.signals?.join(", ") || decision.lane,
        rationale:
          "Classifier recommends predicate/ontology modeling; the claim remains unresolved until grounded via kb_suggest_predicates.",
        suggested_next_tool: "kb_suggest_predicates",
        recommendedPredicateSchema: null,
        applyPlan: [],
      };
      suggestions.push(advisory);
      suggestionByClaim.set(decision.claimKey, advisory);
    } else if (
      decision.lane === "observation_review" ||
      decision.ambiguity?.ambiguous === true
    ) {
      const advisory: SemanticModelingSuggestion = {
        kind: "ambiguity_observation",
        claim_key: decision.claimKey,
        claim_text: proposition.claim_text,
        confidence: decision.confidence,
        evidence: decision.signals?.join(", ") || decision.lane,
        rationale:
          "Classifier flagged this claim for review before assertive modeling.",
        ambiguity: ["needs_review"],
        suggested_next_tool: "kb_model_requirement",
        applyPlan: [],
      };
      suggestions.push(advisory);
      suggestionByClaim.set(decision.claimKey, advisory);
    }
  }

  // Replace mode owns the candidate lane. Start from none so a valid empty
  // decisions[] abstention does not inherit sync analyze-prose routing.
  const candidateLane = LANE_ORDER[
    Math.max(
      laneRank(classifierReplaced ? "none" : receipt.candidate_lane),
      ...classification.decisions.map((decision) => laneRank(decision.lane)),
    )
  ] as SemanticAdvisorLane;

  const tools = [
    ...new Set([
      ...receipt.suggested_next_tools,
      ...suggestions.map((suggestion) => suggestion.suggested_next_tool),
      ...(candidateLane !== "none" ? [toolForLane(candidateLane)] : []),
    ]),
  ];

  const nextReceipt: SemanticAdvisorReceipt = {
    ...receipt,
    candidate_lane: candidateLane,
    propositions,
    suggestions,
    suggested_next_tools: tools,
    summary:
      candidateLane === "none"
        ? receipt.summary
        : `${receipt.summary} Classifier routing: ${candidateLane} → ${toolForLane(candidateLane)}.`,
  };

  if (
    classifierReplaced &&
    classification.decisions.every((decision) => decision.lane === "none")
  ) {
    warnings.push(
      "Replace semantic classifier abstained; sync analyze-prose candidate lane was not retained.",
    );
  }
  if (candidateLane === "predicate" || candidateLane === "rule") {
    warnings.push(
      "Classifier recommends predicate/ontology review; unresolved claims remain unresolved until grounded.",
    );
  }

  // Ontology matches apply after classifier routing so replace can override.
  return applyOntologyMatchSuggestions(
    { receipt: nextReceipt, warnings },
    ontologyMatches,
    { replaced: options.replaced === true },
  );
}

/**
 * Async orchestration for allowlisted semantic operations.
 * Maintenance paths must keep calling sync `analyzeSemanticAdvisorInput`.
 */
export async function analyzeSemanticAdvisorInputWithPlugins(
  input: SemanticAdvisorInput,
  options: Readonly<{
    ensurePlugins?: () => Promise<CapabilityRegistry>;
    operationName: string;
  }>,
): Promise<SemanticPluginOrchestrationResult> {
  const analysis = analyzeSemanticAdvisorInput(input);
  if (
    !options.ensurePlugins ||
    !allowsExternalSemanticClassifier(options.operationName)
  ) {
    return {
      analysis,
      classification: null,
      ontologyCatalog: null,
      ontologyMatches: [],
      ontologyShadowMatches: [],
      stamps: [],
    };
  }

  const registry = await options.ensurePlugins();
  const configured = await hasConfiguredPlugins(registry);
  if (!configured) {
    return {
      analysis,
      classification: null,
      ontologyCatalog: null,
      ontologyMatches: [],
      ontologyShadowMatches: [],
      stamps: [],
    };
  }

  const stamps: PluginProviderStamp[] = [];
  // The claims as plugins see them.
  const contexts: OntologyMatchContext[] = analysis.receipt.propositions.map(
    (proposition) => ({
      claimKey: proposition.claim_key,
      statement: proposition.claim_text,
      role: proposition.role,
    }),
  );
  let classification: ComposedSemanticClassifierResult | null = null;
  if (analysis.receipt.logic_readiness !== "modeled") {
    const resolution = await registry.resolveSemanticClassifiers();
    classification = await composeSemanticClassification(
      resolution,
      { propositions: contexts },
      { operationName: options.operationName },
    );
    stamps.push(...classification.stamps);
  }

  const packResolution = await registry.resolveOntologyPacks();
  const ontologyCatalog = composeOntologyCatalog(packResolution);
  stamps.push(...ontologyCatalog.stamps);
  const ontologyMatches: StampedOntologyCandidate[] = [];
  const ontologyShadowMatches: StampedOntologyCandidate[] = [];
  const seen = new Set<string>();
  const shadowSeen = new Set<string>();
  // Each schema, polarity and argument list is kept once, in claim order.
  const collect = (
    candidates: readonly StampedOntologyCandidate[],
    keys: Set<string>,
    into: StampedOntologyCandidate[],
  ): void => {
    for (const candidate of candidates) {
      const key = [
        candidate.schemaId,
        candidate.polarity,
        ...candidate.arguments,
      ].join("\0");
      if (keys.has(key)) continue;
      keys.add(key);
      into.push(candidate);
    }
  };
  for (const matchContext of contexts) {
    const matched = composeOntologyMatches(packResolution, matchContext);
    collect(matched.canonical, seen, ontologyMatches);
    collect(matched.shadow, shadowSeen, ontologyShadowMatches);
  }

  const replaced = ontologyCatalog.replaced === true;
  // Replace mode must clear sync-path builtin predicate suggestions even when
  // the replace pack abstains with a valid empty match set.
  let nextAnalysis = replaced
    ? stripSyncBuiltinOntologySuggestions(analysis)
    : analysis;

  // Without a classification the analysis is modeled, and ontology matches
  // never change a modeled analysis.
  if (classification) {
    const classifierReplaced =
      !classification.fallbackUsed &&
      classification.stamps.some((stamp) => stamp.mode === "replace");
    nextAnalysis = applyClassificationRouting(
      nextAnalysis,
      classification,
      ontologyMatches,
      { replaced, classifierReplaced },
    );
  }

  return {
    analysis: nextAnalysis,
    classification,
    ontologyCatalog,
    ontologyMatches,
    ontologyShadowMatches,
    stamps,
  };
}

/**
 * Run allowlisted semantic classifier composition without re-running advisor
 * analysis.
 */
export async function composeSemanticClassificationForOperation(
  context: OperationContext | undefined,
  operationName: string,
  input: SemanticClassifierInput,
): Promise<ComposedSemanticClassifierResult | null> {
  if (!context?.ensurePlugins) return null;
  if (!allowsExternalSemanticClassifier(operationName)) return null;
  const registry = await context.ensurePlugins();
  if (!(await hasConfiguredPlugins(registry))) return null;
  const resolution = await registry.resolveSemanticClassifiers();
  return composeSemanticClassification(resolution, input, { operationName });
}

export async function composeOntologyCatalogForOperation(
  context: OperationContext | undefined,
  operationName: string,
): Promise<ComposedOntologyCatalog | null> {
  if (!context?.ensurePlugins) return null;
  if (!allowsExternalSemanticClassifier(operationName)) return null;
  const registry = await context.ensurePlugins();
  if (!(await hasConfiguredPlugins(registry))) return null;
  const resolution = await registry.resolveOntologyPacks();
  return composeOntologyCatalog(resolution);
}

export type { SemanticClassificationDecision };
