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

/**
 * Central registry of KB check rules.
 *
 * Kibi — not the repository — owns each rule's enforcement class. Projects
 * can no longer disable canonical checks. `--rules` remains an
 * invocation-time diagnostic selector only and never persists policy.
 *
 * RULES itself is generated from packages/core/schema/rule-registry.json by
 * scripts/generate-rule-registry.mjs; that JSON is the single editing point
 * shared with the kb_check input enum and the Prolog rule_registry facts.
 */

import { GENERATED_RULES } from "./rule-registry.generated.js";

export type RuleEnforcementClass =
  /**
   * Canonical blocking correctness checks. Always evaluated by
   * `kibi check`, hooks, CI, reports, and coverage summaries. Not
   * configurable by any project surface.
   */
  | "canonical"
  /**
   * Advisory modeling-quality checks. Reported as quality diagnostics to
   * guide agents, but never gate canonical health on their own.
   */
  | "advisory"
  /**
   * Migration/experimental diagnostics. Default-off; surfaced only through
   * explicit invocation-time `--rules` selection for focused diagnosis.
   */
  | "migration";

export interface RuleDefinition {
  name: string;
  description: string;
  /** Kibi-owned role of this rule in the enforcement contract. */
  enforcementClass: RuleEnforcementClass;
  category: "coverage" | "integrity" | "lifecycle" | "traceability";
}

/** A single KB check violation. */
export interface Violation {
  rule: string;
  entityId: string;
  description: string;
  suggestion?: string;
  source?: string;
  /** Exact source-bound proof evidence, when the check can produce it. */
  evidence?: Readonly<Record<string, unknown>>;
}

/** All known check rules, generated from the shared registry JSON. */
export const RULES: readonly RuleDefinition[] = GENERATED_RULES;

const RULES_BY_NAME = new Map(RULES.map((rule) => [rule.name, rule]));

/**
 * Set of all rule names for quick lookups.
 */
export const RULE_NAMES = new Set(RULES.map((r) => r.name));

export function getRuleDefinition(name: string): RuleDefinition | undefined {
  return RULES_BY_NAME.get(name);
}

export function getRuleEnforcementClass(
  name: string,
): RuleEnforcementClass | undefined {
  return RULES_BY_NAME.get(name)?.enforcementClass;
}

/**
 * Whether a plain `kibi check` evaluates this enforcement class.
 * Canonical and advisory rules run; migration rules run only when
 * explicitly selected with `--rules`.
 */
export function ruleRunsByDefault(
  enforcementClass: RuleEnforcementClass,
): boolean {
  return enforcementClass !== "migration";
}

/**
 * Rules that a plain `kibi check` evaluates. Derived from enforcement
 * class: canonical and advisory run, migration does not.
 */
export function getDefaultRules(): Set<string> {
  return new Set(
    RULES.filter((rule) => ruleRunsByDefault(rule.enforcementClass)).map(
      (rule) => rule.name,
    ),
  );
}

/**
 * Canonical blocking rules only. Used by health badges, reports, and CI
 * gates that must not fail on advisory or migration diagnostics.
 */
export function getCanonicalRules(): Set<string> {
  return new Set(
    RULES.filter((rule) => rule.enforcementClass === "canonical").map(
      (r) => r.name,
    ),
  );
}

export function isCanonicalRule(name: string): boolean {
  return RULES_BY_NAME.get(name)?.enforcementClass === "canonical";
}

/**
 * Resolve the rule set for one check invocation.
 *
 * @param requestedRules Optional invocation-time diagnostic selector
 *   (`--rules`). When absent, canonical and advisory rules run. When
 *   present, only the selected rules run for that invocation and nothing is
 *   persisted. Selection never changes enforcement class.
 * @returns Set of rule names that should run
 */
// implements REQ-006
export function getEffectiveRules(
  requestedRules?: readonly string[],
): Set<string> {
  if (requestedRules !== undefined) {
    return new Set(
      requestedRules.filter((name): name is string => RULE_NAMES.has(name)),
    );
  }
  return getDefaultRules();
}

/**
 * Validate a rule name.
 * @returns Error message if invalid, null if valid
 */
export function validateRuleName(name: string): string | null {
  if (!RULE_NAMES.has(name)) {
    return `Unknown rule: ${name}. Valid rules: ${Array.from(RULE_NAMES).join(", ")}`;
  }
  return null;
}
