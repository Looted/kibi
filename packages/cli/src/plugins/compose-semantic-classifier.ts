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

/** Bounded provenance copied onto advisor and compile-intent results. */
// implements REQ-capability-plugin-activation-disclosure-v1, REQ-capability-plugin-observable-behavior-v1
export function publicCapabilityStamp(stamp: PluginProviderStamp): {
  pluginId: string;
  pluginVersion: string;
  capability: string;
  mode: string;
  external: boolean;
  network: boolean;
  metered: boolean;
  fallbackUsed?: boolean;
  model?: string;
} {
  return {
    pluginId: stamp.pluginId,
    pluginVersion: stamp.pluginVersion,
    capability: stamp.capability,
    mode: stamp.mode,
    external: stamp.external,
    network: stamp.network,
    metered: stamp.metered,
    ...(stamp.fallbackUsed === true ? { fallbackUsed: true } : {}),
    ...(stamp.model !== undefined ? { model: stamp.model } : {}),
  };
}

// implements REQ-capability-plugin-activation-disclosure-v1
export function withFallback(
  stamp: PluginProviderStamp,
  fallbackUsed: boolean,
): PluginProviderStamp {
  return fallbackUsed ? { ...stamp, fallbackUsed: true } : stamp;
}

function isUnresolved(
  decision: SemanticClassificationDecision | undefined,
): boolean {
  return (
    decision === undefined ||
    decision.lane === "none" ||
    decision.ambiguity?.ambiguous === true
  );
}

/** Bound and redact provider error text before it reaches diagnostics. */
// implements REQ-capability-plugin-activation-disclosure-v1
export function redactClassifierMessage(message: string): string {
  return message
    .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/(api[_-]?key\s*[:=]\s*)\S+/gi, "$1[redacted]")
    .slice(0, 300);
}

/** Typed, redacted diagnostic for a failed provider call of any capability. */
// implements REQ-capability-plugin-activation-disclosure-v1
export function diagnosticFromError(
  binding: CapabilityProviderBinding<unknown>,
  error: unknown,
): SemanticClassifierDiagnostic {
  const message = redactClassifierMessage(
    error instanceof Error ? error.message : String(error),
  );
  // A PluginValidationError carries its code as a string field too, so one
  // field read covers it; primitives simply have no such fields.
  const fields = error as
    | { code?: unknown; model?: unknown }
    | null
    | undefined;
  const code = typeof fields?.code === "string" ? fields.code : "unknown";
  const model = typeof fields?.model === "string" ? fields.model : undefined;
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

/**
 * One decision per input proposition, in input order; a proposition no
 * provider decided gets the conservative `none` lane.
 */
function decisionsInInputOrder(
  input: SemanticClassifierInput,
  chosen: ReadonlyMap<string, SemanticClassificationDecision>,
): SemanticClassificationDecision[] {
  return input.propositions.map(
    (proposition) =>
      chosen.get(proposition.claimKey) ?? {
        claimKey: proposition.claimKey,
        lane: "none" as const,
        confidence: 0,
      },
  );
}

/**
 * Compose semantic classifiers according to replace / augment / shadow modes.
 *
 * External providers are skipped unless `operationName` is on the allowlist
 * (`kb_semantic_advisor`, `kb_compile_intent`).
 */
// implements REQ-capability-plugin-activation-disclosure-v1, REQ-capability-plugin-observable-behavior-v1
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
  // Canonical decision per claim key; validated results never hold a foreign
  // or duplicate key, so adopting a result is a plain per-key overwrite.
  const chosen = new Map<string, SemanticClassificationDecision>();
  const adopt = (decisions: readonly SemanticClassificationDecision[]) => {
    for (const decision of decisions) chosen.set(decision.claimKey, decision);
  };

  if (allowExternal && resolution.replace) {
    const replaced = await runClassifier(resolution.replace, input);
    if (replaced.ok) {
      // Replace success: missing decisions get conservative `none`, not builtin
      // fill. Valid empty decisions[] is abstention (same as ontology replace).
      adopt(replaced.result.decisions);
      stamps.push(resolution.replace.stamp);
    } else {
      diagnostics.push(replaced.diagnostic);
      const builtinResult = await runClassifier(resolution.builtin, input);
      if (builtinResult.ok) {
        adopt(builtinResult.result.decisions);
        stamps.push(withFallback(resolution.builtin.stamp, true));
      } else {
        diagnostics.push(builtinResult.diagnostic);
      }
      fallbackUsed = true;
    }
  } else {
    const builtinResult = await runClassifier(resolution.builtin, input);
    if (builtinResult.ok) {
      adopt(builtinResult.result.decisions);
      stamps.push(resolution.builtin.stamp);
    } else {
      diagnostics.push(builtinResult.diagnostic);
    }

    if (allowExternal) {
      for (const augment of resolution.augment) {
        const propositions = input.propositions.filter((proposition) =>
          isUnresolved(chosen.get(proposition.claimKey)),
        );
        if (propositions.length === 0) break;

        const augmentResult = await runClassifier(augment, { propositions });
        if (!augmentResult.ok) {
          diagnostics.push(augmentResult.diagnostic);
          continue;
        }
        stamps.push(augment.stamp);
        // The subset is the expected key set, so every decision here is for a
        // still-unresolved proposition; a `none` answer never displaces one.
        adopt(
          augmentResult.result.decisions.filter(
            (decision) => decision.lane !== "none",
          ),
        );
      }
    }
  }

  const decisions = decisionsInInputOrder(input, chosen);

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
