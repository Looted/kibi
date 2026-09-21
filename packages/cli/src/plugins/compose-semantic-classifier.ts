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

import {
  type PluginMode,
  type PluginProviderStamp,
  PluginValidationError,
  type SemanticClassificationDecision,
  type SemanticClassifierInput,
  type SemanticClassifierResult,
  type SemanticClassifierV1,
  validateSemanticClassifierResult,
} from "kibi-plugin-sdk";

import { allowsExternalSemanticClassifier } from "./external-allowlist.js";
import type {
  CapabilityModeResolution,
  CapabilityProviderBinding,
} from "./registry.js";

// implements REQ-capability-plugin-activation-disclosure-v1
export type SemanticClassifierDiagnostic = Readonly<{
  pluginId: string;
  packageName: string | null;
  mode: PluginMode | "builtin";
  code: string;
  message: string;
  model?: string;
}>;

// implements REQ-capability-plugin-activation-disclosure-v1
export type ComposedSemanticClassifierResult = Readonly<{
  decisions: readonly SemanticClassificationDecision[];
  stamps: readonly PluginProviderStamp[];
  shadowComparisons: readonly {
    readonly stamp: PluginProviderStamp;
    readonly decisions: readonly SemanticClassificationDecision[];
  }[];
  fallbackUsed: boolean;
  diagnostics: readonly SemanticClassifierDiagnostic[];
}>;

type ClassifierAttempt =
  | { readonly ok: true; readonly result: SemanticClassifierResult }
  | { readonly ok: false; readonly diagnostic: SemanticClassifierDiagnostic };

function withFallback(
  stamp: PluginProviderStamp,
  fallbackUsed: boolean,
): PluginProviderStamp {
  return fallbackUsed ? { ...stamp, fallbackUsed: true } : stamp;
}

function isUnresolved(
  decision: SemanticClassificationDecision | undefined,
): boolean {
  if (!decision) return true;
  if (decision.lane === "none") return true;
  if (decision.ambiguity?.ambiguous === true) return true;
  return false;
}

function redactClassifierMessage(message: string): string {
  return message
    .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/(api[_-]?key\s*[:=]\s*)\S+/gi, "$1[redacted]")
    .slice(0, 300);
}

function diagnosticFromError(
  binding: CapabilityProviderBinding<SemanticClassifierV1>,
  error: unknown,
): SemanticClassifierDiagnostic {
  const message = redactClassifierMessage(
    error instanceof Error ? error.message : String(error),
  );
  let code = "unknown";
  let model: string | undefined;
  if (error instanceof PluginValidationError) {
    code = error.code;
  } else if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    code = (error as { code: string }).code;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "model" in error &&
    typeof (error as { model?: unknown }).model === "string"
  ) {
    model = (error as { model: string }).model;
  }
  return {
    pluginId: binding.pluginId,
    packageName: binding.packageName,
    mode: binding.mode,
    code,
    message,
    ...(model !== undefined ? { model } : {}),
  };
}

async function runClassifier(
  binding: CapabilityProviderBinding<SemanticClassifierV1>,
  input: SemanticClassifierInput,
): Promise<ClassifierAttempt> {
  try {
    const raw = await binding.capability.classify(input);
    return {
      ok: true,
      result: validateSemanticClassifierResult(raw, {
        expectedClaimKeys: input.propositions.map(
          (proposition) => proposition.claimKey,
        ),
      }),
    };
  } catch (error) {
    return { ok: false, diagnostic: diagnosticFromError(binding, error) };
  }
}

function fillMissingDecisions(
  input: SemanticClassifierInput,
  decisions: readonly SemanticClassificationDecision[],
  builtin: SemanticClassifierResult | null,
): SemanticClassificationDecision[] {
  const byKey = new Map(
    decisions.map((decision) => [decision.claimKey, decision]),
  );
  const builtinByKey = new Map(
    (builtin?.decisions ?? []).map((decision) => [decision.claimKey, decision]),
  );
  return input.propositions.map((proposition) => {
    const existing = byKey.get(proposition.claimKey);
    if (existing) return existing;
    const fallback = builtinByKey.get(proposition.claimKey);
    if (fallback) return fallback;
    return {
      claimKey: proposition.claimKey,
      lane: "none" as const,
      confidence: 0,
    };
  });
}

/**
 * Compose semantic classifiers according to replace / augment / shadow modes.
 *
 * External providers are skipped unless `operationName` is on the allowlist
 * (`kb_semantic_advisor`, `kb_compile_intent`).
 */
// implements REQ-capability-plugin-activation-disclosure-v1
export async function composeSemanticClassification(
  resolution: CapabilityModeResolution<SemanticClassifierV1>,
  input: SemanticClassifierInput,
  options: Readonly<{ operationName: string }>,
): Promise<ComposedSemanticClassifierResult> {
  const allowExternal = allowsExternalSemanticClassifier(options.operationName);
  const stamps: PluginProviderStamp[] = [];
  const diagnostics: SemanticClassifierDiagnostic[] = [];
  const shadowComparisons: Array<{
    readonly stamp: PluginProviderStamp;
    readonly decisions: readonly SemanticClassificationDecision[];
  }> = [];
  let fallbackUsed = false;
  let decisions: SemanticClassificationDecision[] = [];

  if (allowExternal && resolution.replace) {
    const replaced = await runClassifier(resolution.replace, input);
    if (replaced.ok) {
      // Replace success: missing decisions get conservative `none`, not builtin
      // fill. Valid empty decisions[] is abstention (same as ontology replace).
      decisions = fillMissingDecisions(input, replaced.result.decisions, null);
      stamps.push(resolution.replace.stamp);
    } else {
      diagnostics.push(replaced.diagnostic);
      const builtinResult = await runClassifier(resolution.builtin, input);
      if (builtinResult.ok) {
        decisions = [...builtinResult.result.decisions];
        stamps.push(withFallback(resolution.builtin.stamp, true));
      } else {
        diagnostics.push(builtinResult.diagnostic);
        decisions = [];
      }
      fallbackUsed = true;
    }
  } else {
    const builtinResult = await runClassifier(resolution.builtin, input);
    if (builtinResult.ok) {
      decisions = [...builtinResult.result.decisions];
      stamps.push(resolution.builtin.stamp);
    } else {
      diagnostics.push(builtinResult.diagnostic);
      decisions = [];
    }

    if (allowExternal) {
      for (const augment of resolution.augment) {
        const unresolvedKeys = new Set(
          input.propositions
            .filter((proposition) => {
              const current = decisions.find(
                (decision) => decision.claimKey === proposition.claimKey,
              );
              return isUnresolved(current);
            })
            .map((proposition) => proposition.claimKey),
        );
        if (unresolvedKeys.size === 0) break;

        const subset: SemanticClassifierInput = {
          propositions: input.propositions.filter((proposition) =>
            unresolvedKeys.has(proposition.claimKey),
          ),
        };
        const augmentResult = await runClassifier(augment, subset);
        if (!augmentResult.ok) {
          diagnostics.push(augmentResult.diagnostic);
          continue;
        }
        stamps.push(augment.stamp);
        const byKey = new Map(
          decisions.map((decision) => [decision.claimKey, decision]),
        );
        for (const decision of augmentResult.result.decisions) {
          if (!unresolvedKeys.has(decision.claimKey)) continue;
          if (decision.lane === "none") continue;
          byKey.set(decision.claimKey, decision);
        }
        decisions = fillMissingDecisions(
          input,
          [...byKey.values()],
          builtinResult.ok ? builtinResult.result : null,
        );
      }
    }
  }

  decisions = fillMissingDecisions(input, decisions, null);

  if (allowExternal) {
    for (const shadow of resolution.shadow) {
      const shadowResult = await runClassifier(shadow, input);
      if (!shadowResult.ok) {
        diagnostics.push(shadowResult.diagnostic);
        continue;
      }
      stamps.push(shadow.stamp);
      shadowComparisons.push({
        stamp: shadow.stamp,
        decisions: shadowResult.result.decisions,
      });
    }
  }

  return {
    decisions,
    stamps,
    shadowComparisons,
    fallbackUsed,
    diagnostics,
  };
}
