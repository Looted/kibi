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
  type PluginProviderStamp,
  type SearchHint,
  type SearchHintsInput,
  type SearchHintsV1,
  validateSearchHintsResult,
} from "kibi-plugin-sdk";

import {
  type SemanticClassifierDiagnostic,
  diagnosticFromError,
  withFallback,
} from "./compose-semantic-classifier.js";
import { allowsExternalSearchHints } from "./external-allowlist.js";
import type {
  CapabilityModeResolution,
  CapabilityProviderBinding,
} from "./registry.js";

// implements REQ-kibi-search-hints-host
export type SearchHintsDiagnostic = SemanticClassifierDiagnostic;

// implements REQ-kibi-search-hints-host
export type ComposedSearchHints = Readonly<{
  /** Hints of the replace provider; empty without one or when it failed. */
  hints: readonly SearchHint[];
  /** Stamp of the provider whose hints are shown, if any. */
  stamp: PluginProviderStamp | null;
  shadowComparisons: readonly {
    readonly stamp: PluginProviderStamp;
    readonly hints: readonly SearchHint[];
  }[];
  fallbackUsed: boolean;
  diagnostics: readonly SearchHintsDiagnostic[];
}>;

/** A provider that does not answer within the deadline counts as failed. */
class SearchHintsTimeout extends Error {
  readonly code = "timeout";
  constructor(ms: number) {
    super(`search hints provider did not answer within ${ms} ms`);
  }
}

async function ask(
  binding: CapabilityProviderBinding<SearchHintsV1>,
  input: SearchHintsInput,
  timeoutMs: number,
): Promise<
  | { readonly ok: true; readonly hints: readonly SearchHint[] }
  | { readonly ok: false; readonly diagnostic: SearchHintsDiagnostic }
> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const answer = Promise.resolve(binding.capability.hint(input));
    // rationale: clearing only frees the timer early; a timer left to fire
    // rejects a race that already settled, which nothing observes.
    // Stryker disable all
    const clear = () => clearTimeout(timer);
    answer.then(clear, clear);
    // Stryker restore all
    const result = await Promise.race([
      answer,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new SearchHintsTimeout(timeoutMs)),
          timeoutMs,
        );
      }),
    ]);
    const validated = validateSearchHintsResult(
      result,
      input.entities.map((entity) => entity.id),
      input.limit,
    );
    return { ok: true, hints: validated.hints };
  } catch (error) {
    return { ok: false, diagnostic: diagnosticFromError(binding, error) };
  }
}

/**
 * replace / shadow for search hints. The builtin has no hints, so without a
 * replace provider nothing is shown; a failing or late replace provider
 * yields no hints (stamped fallbackUsed) and a diagnostic, never an error.
 * Shadow providers are recorded for comparison only. External providers run
 * only for allowlisted operations.
 */
// implements REQ-kibi-search-hints-host
export async function composeSearchHints(
  resolution: CapabilityModeResolution<SearchHintsV1>,
  input: SearchHintsInput,
  options: Readonly<{
    operationName: string;
    /** How long one provider may take to answer. */
    timeoutMs: (binding: CapabilityProviderBinding<SearchHintsV1>) => number;
  }>,
): Promise<ComposedSearchHints> {
  const empty: ComposedSearchHints = {
    hints: [],
    stamp: null,
    shadowComparisons: [],
    fallbackUsed: false,
    diagnostics: [],
  };
  if (!allowsExternalSearchHints(options.operationName)) return empty;
  const diagnostics: SearchHintsDiagnostic[] = [];
  let hints: readonly SearchHint[] = [];
  let stamp: PluginProviderStamp | null = null;
  let fallbackUsed = false;
  if (resolution.replace) {
    const answer = await ask(
      resolution.replace,
      input,
      options.timeoutMs(resolution.replace),
    );
    if (answer.ok) {
      hints = answer.hints;
      stamp = resolution.replace.stamp;
    } else {
      diagnostics.push(answer.diagnostic);
      fallbackUsed = true;
      stamp = withFallback(resolution.replace.stamp, true);
    }
  }
  const shadowComparisons: Array<{
    readonly stamp: PluginProviderStamp;
    readonly hints: readonly SearchHint[];
  }> = [];
  for (const shadow of resolution.shadow) {
    const answer = await ask(shadow, input, options.timeoutMs(shadow));
    if (answer.ok)
      shadowComparisons.push({ stamp: shadow.stamp, hints: answer.hints });
    else diagnostics.push(answer.diagnostic);
  }
  return { hints, stamp, shadowComparisons, fallbackUsed, diagnostics };
}
