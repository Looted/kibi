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
  type ClaimComparisonJudgment,
  type CompareClaimsInput,
  NEW_SUBJECT_CHOICE,
  type PluginProviderStamp,
  type RankSubjectsInput,
  type SubjectRankingDecision,
  type VocabularyAlignmentV1,
  validateCompareClaimsResult,
  validateRankSubjectsResult,
} from "kibi-plugin-sdk";

import {
  type SemanticClassifierDiagnostic,
  diagnosticFromError,
  withFallback,
} from "./compose-semantic-classifier.js";
import { allowsExternalVocabularyAlignment } from "./external-allowlist.js";
import type {
  CapabilityModeResolution,
  CapabilityProviderBinding,
} from "./registry.js";

// implements REQ-kibi-vocabulary-alignment-capability
export type VocabularyAlignmentDiagnostic = SemanticClassifierDiagnostic;

// implements REQ-kibi-vocabulary-alignment-capability
export type ComposedVocabularyResult<T> = Readonly<{
  results: readonly T[];
  stamps: readonly PluginProviderStamp[];
  shadowComparisons: readonly {
    readonly stamp: PluginProviderStamp;
    readonly results: readonly T[];
  }[];
  fallbackUsed: boolean;
  diagnostics: readonly VocabularyAlignmentDiagnostic[];
}>;

type Attempt<T> =
  | { readonly ok: true; readonly results: readonly T[] }
  | { readonly ok: false; readonly diagnostic: VocabularyAlignmentDiagnostic };

/**
 * One composition strategy per operation: how to call a provider on a subset,
 * which items the builtin left unresolved (augment targets), and how to key
 * results.
 */
type Strategy<I, T> = Readonly<{
  keyOf: (result: T) => string;
  itemKeys: (input: I) => readonly string[];
  subset: (input: I, keys: ReadonlySet<string>) => I;
  run: (provider: VocabularyAlignmentV1, input: I) => Promise<readonly T[]>;
  /** Builtin result an augment provider may improve. */
  unresolved: (result: T) => boolean;
  /** Whether an augment result improves on an unresolved builtin result. */
  improves: (result: T) => boolean;
}>;

async function attempt<I, T>(
  binding: CapabilityProviderBinding<VocabularyAlignmentV1>,
  strategy: Strategy<I, T>,
  input: I,
): Promise<Attempt<T>> {
  try {
    return { ok: true, results: await strategy.run(binding.capability, input) };
  } catch (error) {
    return { ok: false, diagnostic: diagnosticFromError(binding, error) };
  }
}

function mergeByKey<I, T>(
  strategy: Strategy<I, T>,
  input: I,
  primary: readonly T[],
  fallback: readonly T[],
): T[] {
  const primaryByKey = new Map(primary.map((r) => [strategy.keyOf(r), r]));
  const fallbackByKey = new Map(fallback.map((r) => [strategy.keyOf(r), r]));
  return strategy.itemKeys(input).flatMap((key) => {
    const result = primaryByKey.get(key) ?? fallbackByKey.get(key);
    return result === undefined ? [] : [result];
  });
}

/**
 * replace / augment / shadow with the same semantics as the semantic
 * classifier: a replace provider owns the result and falls back to builtin
 * (stamped fallbackUsed) on any failure; augment providers only refine items
 * the builtin left unresolved; shadow providers are recorded for comparison
 * and never change the result. External providers run only for allowlisted
 * operations.
 */
async function compose<I, T>(
  resolution: CapabilityModeResolution<VocabularyAlignmentV1>,
  strategy: Strategy<I, T>,
  input: I,
  operationName: string,
): Promise<ComposedVocabularyResult<T>> {
  const allowExternal = allowsExternalVocabularyAlignment(operationName);
  const stamps: PluginProviderStamp[] = [];
  const diagnostics: VocabularyAlignmentDiagnostic[] = [];
  const shadowComparisons: Array<{
    readonly stamp: PluginProviderStamp;
    readonly results: readonly T[];
  }> = [];
  let fallbackUsed = false;
  let results: T[] = [];

  const builtin = await attempt(resolution.builtin, strategy, input);
  const builtinResults = builtin.ok ? builtin.results : [];

  if (allowExternal && resolution.replace) {
    const replaced = await attempt(resolution.replace, strategy, input);
    if (replaced.ok) {
      results = mergeByKey(strategy, input, replaced.results, builtinResults);
      stamps.push(resolution.replace.stamp);
    } else {
      diagnostics.push(replaced.diagnostic);
      fallbackUsed = true;
      if (builtin.ok) {
        results = [...builtinResults];
        stamps.push(withFallback(resolution.builtin.stamp, true));
      } else {
        diagnostics.push(builtin.diagnostic);
      }
    }
  } else {
    if (builtin.ok) {
      results = [...builtinResults];
      stamps.push(resolution.builtin.stamp);
    } else {
      diagnostics.push(builtin.diagnostic);
    }
    if (allowExternal) {
      for (const augment of resolution.augment) {
        const unresolved = new Set(
          results.filter(strategy.unresolved).map(strategy.keyOf),
        );
        if (unresolved.size === 0) break;
        const augmented = await attempt(
          augment,
          strategy,
          strategy.subset(input, unresolved),
        );
        if (!augmented.ok) {
          diagnostics.push(augmented.diagnostic);
          continue;
        }
        stamps.push(augment.stamp);
        const improvements = augmented.results.filter(
          (result) =>
            unresolved.has(strategy.keyOf(result)) && strategy.improves(result),
        );
        results = mergeByKey(strategy, input, improvements, results);
      }
    }
  }

  if (allowExternal) {
    for (const shadow of resolution.shadow) {
      const shadowed = await attempt(shadow, strategy, input);
      if (!shadowed.ok) {
        diagnostics.push(shadowed.diagnostic);
        continue;
      }
      stamps.push(shadow.stamp);
      shadowComparisons.push({
        stamp: shadow.stamp,
        results: shadowed.results,
      });
    }
  }

  return { results, stamps, shadowComparisons, fallbackUsed, diagnostics };
}

const RANK_SUBJECTS: Strategy<RankSubjectsInput, SubjectRankingDecision> = {
  keyOf: (decision) => decision.claimKey,
  itemKeys: (input) => input.clauses.map((clause) => clause.claimKey),
  subset: (input, keys) => ({
    clauses: input.clauses.filter((clause) => keys.has(clause.claimKey)),
  }),
  run: async (provider, input) =>
    validateRankSubjectsResult(
      await provider.rankSubjects(input),
      input.clauses,
    ).decisions,
  unresolved: (decision) => decision.choice === NEW_SUBJECT_CHOICE,
  improves: (decision) => decision.choice !== NEW_SUBJECT_CHOICE,
};

const COMPARE_CLAIMS: Strategy<CompareClaimsInput, ClaimComparisonJudgment> = {
  keyOf: (judgment) => judgment.pairKey,
  itemKeys: (input) => input.pairs.map((pair) => pair.pairKey),
  subset: (input, keys) => ({
    pairs: input.pairs.filter((pair) => keys.has(pair.pairKey)),
  }),
  run: async (provider, input) =>
    validateCompareClaimsResult(
      await provider.compareClaims(input),
      input.pairs.map((pair) => pair.pairKey),
    ).judgments,
  unresolved: (judgment) => !judgment.sameObligation,
  improves: (judgment) => judgment.sameObligation,
};

/** Choose an existing subject (or new_subject) for each clause. */
// implements REQ-kibi-vocabulary-alignment-capability
export function composeSubjectRanking(
  resolution: CapabilityModeResolution<VocabularyAlignmentV1>,
  input: RankSubjectsInput,
  options: Readonly<{ operationName: string }>,
): Promise<ComposedVocabularyResult<SubjectRankingDecision>> {
  return compose(resolution, RANK_SUBJECTS, input, options.operationName);
}

/** Judge claim pairs; true judgments are review candidates, never verdicts. */
// implements REQ-kibi-vocabulary-alignment-capability
export function composeClaimComparison(
  resolution: CapabilityModeResolution<VocabularyAlignmentV1>,
  input: CompareClaimsInput,
  options: Readonly<{ operationName: string }>,
): Promise<ComposedVocabularyResult<ClaimComparisonJudgment>> {
  return compose(resolution, COMPARE_CLAIMS, input, options.operationName);
}
