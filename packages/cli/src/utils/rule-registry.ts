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
 */

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

/**
 * All known check rules.
 * When adding a new rule, add it here.
 */
export const RULES: readonly RuleDefinition[] = [
  // implements REQ-006
  {
    name: "must-priority-coverage",
    description:
      "Every must-priority requirement must have a scenario and a test",
    enforcementClass: "canonical",
    category: "coverage",
  },
  {
    name: "symbol-coverage",
    description:
      "Production symbols need qualifying coverage via covered_by plus a canonical requirement/scenario test path",
    enforcementClass: "canonical",
    category: "coverage",
  },
  {
    name: "symbol-traceability",
    description:
      "Production symbols must directly implement requirements for ownership; covered_by is coverage only and executable_for is test identity only",
    enforcementClass: "canonical",
    category: "traceability",
  },
  {
    name: "no-dangling-refs",
    description: "All relationship targets must exist in the KB",
    enforcementClass: "canonical",
    category: "integrity",
  },
  {
    name: "source-relationship-parity",
    description:
      "Authored Markdown and relationship-shard edges must exactly match the compiled KB",
    enforcementClass: "canonical",
    category: "integrity",
  },
  {
    name: "no-cycles",
    description: "No circular dependency chains in requirements",
    enforcementClass: "canonical",
    category: "integrity",
  },
  {
    name: "required-fields",
    description: "All entities must have required fields",
    enforcementClass: "canonical",
    category: "integrity",
  },
  {
    name: "deprecated-adr-no-successor",
    description:
      "Deprecated ADRs must have a successor ADR that supersedes them",
    enforcementClass: "canonical",
    category: "lifecycle",
  },
  {
    name: "domain-contradictions",
    description:
      "Detect contradictions between requirements constraining the same fact",
    enforcementClass: "canonical",
    category: "integrity",
  },
  {
    name: "logic-coverage",
    description:
      "Require every explicitly declared atomic requirement claim to be grounded by a linked strict-property or predicate fact",
    enforcementClass: "canonical",
    category: "integrity",
  },
  {
    name: "rule-safety",
    description:
      "Stored Logic IR rules use only the typed, bounded, stratified vocabulary",
    enforcementClass: "canonical",
    category: "integrity",
  },
  {
    name: "rule-verifiability",
    description:
      "Requirement rule links resolve to safe rules and registered rule schemas",
    enforcementClass: "canonical",
    category: "integrity",
  },
  {
    name: "query-plan-safety",
    description:
      "Detect Prolog validation clauses that place negation before generator calls",
    enforcementClass: "canonical",
    category: "integrity",
  },
  {
    name: "strict-fact-shape",
    description:
      "Detect malformed strict facts (facts with fact_kind that are missing required fields)",
    enforcementClass: "advisory",
    category: "integrity",
  },
  {
    name: "strict-req-fact-pairing",
    description:
      "Detect requirements with incomplete strict subject/property fact pairing for contradiction-safe semantics",
    enforcementClass: "advisory",
    category: "integrity",
  },
  {
    name: "predicate-verifiability",
    description:
      "Detect requires_predicate links that do not target ground fact_kind: predicate facts",
    enforcementClass: "advisory",
    category: "integrity",
  },
  {
    name: "strict-readiness",
    description:
      "Report strict contradiction-readiness levels for requirements that are still prose-only or otherwise not contradiction-ready",
    enforcementClass: "migration",
    category: "integrity",
  },
  {
    name: "semantic-completeness",
    description:
      "Every inventoried assertive proposition is modeled or explicitly classified",
    enforcementClass: "migration",
    category: "integrity",
  },
] as const;

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
