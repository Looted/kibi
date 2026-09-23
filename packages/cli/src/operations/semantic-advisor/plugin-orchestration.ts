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

// implements REQ-capability-plugin-activation-disclosure-v1
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

const ASSERTIVE_ROLES = new Set([
  "normative",
  "definition",
  "condition",
  "exception",
]);

function isAssertiveUnresolved(proposition: SemanticProposition): boolean {
  return (
    ASSERTIVE_ROLES.has(proposition.role) &&
    ["missing", "ambiguous", "ontology_gap"].includes(proposition.status)
  );
}

function laneRank(lane: SemanticLane | SemanticAdvisorLane): number {
  switch (lane) {
    case "strict_property":
      return 4;
    case "predicate":
      return 3;
    case "rule":
      return 2;
    case "observation_review":
      return 1;
    default:
      return 0;
  }
}

function toolForLane(lane: SemanticAdvisorLane): string {
  switch (lane) {
    case "strict_property":
      return "kb_model_requirement";
    case "predicate":
    case "rule":
      return "kb_suggest_predicates";
    case "observation_review":
      return "kb_model_requirement";
    default:
      return "kb_model_requirement";
  }
}

/**
 * Drop sync-path builtin ontology `predicate` suggestions.
 *
 * `analyzeSemanticAdvisorInput` always consults the builtin pack for
 * maintenance-safe deterministic matching. When a replace ontology pack is
 * active, those suggestions must not survive into the public receipt —
 * including when the replace pack abstains with a valid empty match set.
 */
// implements REQ-capability-plugin-activation-disclosure-v1
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
// implements REQ-capability-plugin-activation-disclosure-v1
export function applyOntologyMatchSuggestions(
  analysis: SemanticAdvisorAnalysisResult,
  ontologyMatches: readonly StampedOntologyCandidate[],
  options: Readonly<{ replaced: boolean }> = { replaced: false },
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
    const claimKey =
      (match.claimKey &&
      propositions.some(
        (proposition) => proposition.claim_key === match.claimKey,
      )
        ? match.claimKey
        : undefined) ??
      propositions.find((proposition) =>
        proposition.claim_text.includes(match.evidence),
      )?.claim_key ??
      propositions.find((proposition) =>
        match.evidence.length > 0
          ? proposition.claim_text.includes(match.evidence)
          : false,
      )?.claim_key ??
      propositions[0]?.claim_key;
    if (!claimKey) continue;
    const proposition = propositions.find(
      (entry) => entry.claim_key === claimKey,
    );
    if (!proposition) continue;
    const existing = suggestionByClaim.get(claimKey);
    if (existing && !options.replaced) continue;
    if (
      existing &&
      options.replaced &&
      existing.kind !== "predicate" &&
      existing.kind !== "ontology_gap"
    ) {
      // Preserve strict/rule/ambiguity host suggestions under replace.
      continue;
    }

    const advisory: SemanticModelingSuggestion = {
      kind: "ontology_gap",
      claim_key: claimKey,
      claim_text: proposition.claim_text,
      confidence: match.confidence,
      evidence: match.evidence,
      rationale:
        match.rationale ??
        `Ontology pack '${match.packId}' matched ${match.predicateName}; review via kb_suggest_predicates before mutation.`,
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
      if (index >= 0) suggestions[index] = advisory;
      else suggestions.push(advisory);
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
// implements REQ-capability-plugin-activation-disclosure-v1
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
  if (receipt.logic_readiness === "modeled") {
    // Never downgrade semantic completeness via plugin classification.
    return {
      receipt: {
        ...receipt,
        // Still expose advisory plugin metadata without changing completeness.
      },
      warnings: [
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
      ],
    };
  }

  const byClaim = new Map(
    classification.decisions.map((decision) => [decision.claimKey, decision]),
  );
  const classifierReplaced = options.classifierReplaced === true;

  const propositions = receipt.propositions.map((proposition) => {
    const decision = byClaim.get(proposition.claim_key);
    if (!decision) return proposition;
    // `none` cannot erase an assertive unresolved obligation.
    if (decision.lane === "none" && isAssertiveUnresolved(proposition)) {
      return proposition;
    }
    if (decision.lane === "none") return proposition;

    let status = proposition.status;
    if (decision.ambiguity?.ambiguous === true && status === "missing") {
      status = "ambiguous";
    } else if (decision.lane === "predicate" && status === "missing") {
      // Route toward predicate modeling without claiming the claim is grounded.
      status = "missing";
    }
    return {
      ...proposition,
      status,
      ...(decision.ambiguity?.ambiguous === true
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
        laneRank(decision.lane) > 0 &&
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
        if (index >= 0) suggestions[index] = updated;
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
  let candidateLane: SemanticAdvisorLane = classifierReplaced
    ? "none"
    : receipt.candidate_lane;
  for (const decision of classification.decisions) {
    if (laneRank(decision.lane) > laneRank(candidateLane)) {
      candidateLane = decision.lane;
    }
  }

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

  const warnings = [...analysis.warnings];
  if (classification.fallbackUsed) {
    warnings.push(
      "Semantic classifier fell back to the builtin provider after an external classifier failure.",
    );
  }
  for (const diagnostic of classification.diagnostics) {
    const model = diagnostic.model ? ` model=${diagnostic.model}` : "";
    warnings.push(
      `Semantic classifier '${diagnostic.pluginId}' failed (${diagnostic.code}${model}): ${diagnostic.message}`,
    );
  }
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
// implements REQ-capability-plugin-activation-disclosure-v1, REQ-capability-plugin-observable-behavior-v1
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
  let classification: ComposedSemanticClassifierResult | null = null;
  let ontologyCatalog: ComposedOntologyCatalog | null = null;
  let ontologyMatches: readonly StampedOntologyCandidate[] = [];
  let ontologyShadowMatches: readonly StampedOntologyCandidate[] = [];
  let nextAnalysis = analysis;

  if (analysis.receipt.logic_readiness !== "modeled") {
    const propositions: SemanticClassifierInput["propositions"] =
      analysis.receipt.propositions.map((proposition) => ({
        claimKey: proposition.claim_key,
        statement: proposition.claim_text,
        role: proposition.role,
      }));
    const resolution = await registry.resolveSemanticClassifiers();
    classification = await composeSemanticClassification(
      resolution,
      { propositions },
      { operationName: options.operationName },
    );
    stamps.push(...classification.stamps);
  }

  const packResolution = await registry.resolveOntologyPacks();
  ontologyCatalog = composeOntologyCatalog(packResolution);
  stamps.push(...ontologyCatalog.stamps);
  const contexts: OntologyMatchContext[] =
    nextAnalysis.receipt.propositions.map((proposition) => ({
      claimKey: proposition.claim_key,
      statement: proposition.claim_text,
      role: proposition.role,
    }));
  const seen = new Set<string>();
  const collected: StampedOntologyCandidate[] = [];
  const shadowCollected: StampedOntologyCandidate[] = [];
  const shadowSeen = new Set<string>();
  for (const matchContext of contexts) {
    const matched = composeOntologyMatches(packResolution, matchContext);
    for (const candidate of matched.canonical) {
      const key = [
        candidate.schemaId,
        candidate.polarity,
        ...candidate.arguments,
      ].join("\0");
      if (seen.has(key)) continue;
      seen.add(key);
      collected.push(candidate);
    }
    for (const candidate of matched.shadow) {
      const key = [
        candidate.schemaId,
        candidate.polarity,
        ...candidate.arguments,
      ].join("\0");
      if (shadowSeen.has(key)) continue;
      shadowSeen.add(key);
      shadowCollected.push(candidate);
    }
  }
  ontologyMatches = collected;
  ontologyShadowMatches = shadowCollected;

  const replaced = ontologyCatalog?.replaced === true;
  // Replace mode must clear sync-path builtin predicate suggestions even when
  // the replace pack abstains with a valid empty match set.
  if (replaced) {
    nextAnalysis = stripSyncBuiltinOntologySuggestions(nextAnalysis);
  }

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
  } else {
    nextAnalysis = applyOntologyMatchSuggestions(
      nextAnalysis,
      ontologyMatches,
      {
        replaced,
      },
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
// implements REQ-capability-plugin-activation-disclosure-v1
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

// implements REQ-capability-plugin-activation-disclosure-v1
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
