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
  SemanticClassifierInput,
} from "kibi-plugin-sdk";

import {
  composeOntologyCatalog,
  composeOntologyMatches,
  type ComposedOntologyCatalog,
  type StampedOntologyCandidate,
} from "../../plugins/compose-ontology-packs.js";
import {
  composeSemanticClassification,
  type ComposedSemanticClassifierResult,
} from "../../plugins/compose-semantic-classifier.js";
import { allowsExternalSemanticClassifier } from "../../plugins/external-allowlist.js";
import type { CapabilityRegistry } from "../../plugins/registry.js";
import type { OperationContext } from "../../public/operations/runtime-types.js";
import { analyzeSemanticAdvisorInput } from "./analyze-prose.js";
import type {
  SemanticAdvisorAnalysisResult,
  SemanticAdvisorInput,
  SemanticAdvisorLane,
} from "./types.js";

// implements REQ-capability-plugin-activation-disclosure-v1
export type SemanticPluginOrchestrationResult = Readonly<{
  analysis: SemanticAdvisorAnalysisResult;
  classification: ComposedSemanticClassifierResult | null;
  ontologyCatalog: ComposedOntologyCatalog | null;
  ontologyMatches: readonly StampedOntologyCandidate[];
  stamps: readonly PluginProviderStamp[];
}>;

function hasConfiguredPlugins(registry: CapabilityRegistry): Promise<boolean> {
  return registry.getProjectConfig().then((config) => {
    return (config.plugins?.length ?? 0) > 0;
  });
}

/**
 * Async orchestration for allowlisted semantic operations.
 * Maintenance paths must keep calling sync `analyzeSemanticAdvisorInput`.
 */
// implements REQ-capability-plugin-activation-disclosure-v1
export async function analyzeSemanticAdvisorInputWithPlugins(
  input: SemanticAdvisorInput,
  options: Readonly<{
    ensurePlugins?: () => Promise<CapabilityRegistry>;
    operationName: string;
  }>,
): Promise<SemanticPluginOrchestrationResult> {
  const analysis = analyzeSemanticAdvisorInput(input);
  if (!options.ensurePlugins) {
    return {
      analysis,
      classification: null,
      ontologyCatalog: null,
      ontologyMatches: [],
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
      stamps: [],
    };
  }

  const stamps: PluginProviderStamp[] = [];
  let classification: ComposedSemanticClassifierResult | null = null;
  let ontologyCatalog: ComposedOntologyCatalog | null = null;
  let ontologyMatches: readonly StampedOntologyCandidate[] = [];
  let nextAnalysis = analysis;

  if (allowsExternalSemanticClassifier(options.operationName)) {
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

    const nextLane = laneFromClassification(
      analysis.receipt.candidate_lane,
      classification,
    );
    const extraWarnings = classification.fallbackUsed
      ? [
          "Semantic classifier fell back to the builtin provider after an external classifier failure.",
        ]
      : [];
    if (nextLane !== analysis.receipt.candidate_lane || extraWarnings.length > 0) {
      nextAnalysis = {
        receipt: {
          ...analysis.receipt,
          candidate_lane: nextLane,
        },
        warnings: [...analysis.warnings, ...extraWarnings],
      };
    }
  }

  const packResolution = await registry.resolveOntologyPacks();
  ontologyCatalog = composeOntologyCatalog(packResolution);
  stamps.push(...ontologyCatalog.stamps);
  const contexts: OntologyMatchContext[] = nextAnalysis.receipt.propositions.map(
    (proposition) => ({
      claimKey: proposition.claim_key,
      statement: proposition.claim_text,
      role: proposition.role,
    }),
  );
  const seen = new Set<string>();
  const collected: StampedOntologyCandidate[] = [];
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
  }
  ontologyMatches = collected;

  return {
    analysis: nextAnalysis,
    classification,
    ontologyCatalog,
    ontologyMatches,
    stamps,
  };
}

function laneFromClassification(
  current: SemanticAdvisorLane,
  classification: ComposedSemanticClassifierResult,
): SemanticAdvisorLane {
  // Suggestion-derived lanes stay authoritative; only lift unresolved none.
  if (current !== "none") return current;
  const decision = classification.decisions.find(
    (entry) => entry.lane !== "none",
  );
  if (!decision) return current;
  return decision.lane;
}

/**
 * Run allowlisted semantic classifier composition without re-running advisor
 * analysis (used by kb_model_requirement).
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

/**
 * Resolve composed ontology schemas when external packs are configured.
 * Sync maintenance paths should call createBuiltinOntologyPack() directly.
 */
// implements REQ-capability-plugin-activation-disclosure-v1
export async function composeOntologyCatalogForOperation(
  context: OperationContext | undefined,
): Promise<ComposedOntologyCatalog | null> {
  if (!context?.ensurePlugins) return null;
  const registry = await context.ensurePlugins();
  if (!(await hasConfiguredPlugins(registry))) return null;
  const resolution = await registry.resolveOntologyPacks();
  return composeOntologyCatalog(resolution);
}
