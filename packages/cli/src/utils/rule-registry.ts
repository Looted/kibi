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
 * Central registry of all KB check rules.
 * This is the single source of truth for rule names, descriptions, and defaults.
 */

export interface RuleDefinition {
  name: string;
  description: string;
  defaultEnabled: boolean;
  category: "coverage" | "integrity" | "lifecycle" | "traceability";
}

export interface SymbolTraceabilityOptions {
  requireAdr: boolean;
}

export interface ChecksConfig {
  rules: Record<string, boolean>;
  symbolTraceability: SymbolTraceabilityOptions;
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
    defaultEnabled: true,
    category: "coverage",
  },
  {
    name: "symbol-coverage",
    description:
      "Symbols should be traceable to requirements via transitive implements",
    defaultEnabled: true,
    category: "coverage",
  },
  {
    name: "symbol-traceability",
    description:
      "Source symbols must have direct implements links to requirements; optionally constrained_by ADR",
    defaultEnabled: true,
    category: "traceability",
  },
  {
    name: "no-dangling-refs",
    description: "All relationship targets must exist in the KB",
    defaultEnabled: true,
    category: "integrity",
  },
  {
    name: "no-cycles",
    description: "No circular dependency chains in requirements",
    defaultEnabled: true,
    category: "integrity",
  },
  {
    name: "required-fields",
    description: "All entities must have required fields",
    defaultEnabled: true,
    category: "integrity",
  },
  {
    name: "deprecated-adr-no-successor",
    description:
      "Deprecated ADRs must have a successor ADR that supersedes them",
    defaultEnabled: true,
    category: "lifecycle",
  },
  {
    name: "domain-contradictions",
    description:
      "Detect contradictions between requirements constraining the same fact",
    defaultEnabled: true,
    category: "integrity",
  },
  {
    name: "strict-fact-shape",
    description:
      "Detect malformed strict facts (facts with fact_kind that are missing required fields)",
    defaultEnabled: false,
    category: "integrity",
  },
] as const;

/**
 * Set of all rule names for quick lookups.
 */
export const RULE_NAMES = new Set(RULES.map((r) => r.name));

/**
 * Default checks configuration with all rules enabled.
 */
export const DEFAULT_CHECKS_CONFIG: ChecksConfig = {
  rules: Object.fromEntries(RULES.map((r) => [r.name, r.defaultEnabled])),
  symbolTraceability: {
    requireAdr: false,
  },
};

/**
 * Get effective rules based on config and CLI --rules filter.
 * @param configRules Rules from .kb/config.json (may be partial)
 * @param cliRules Optional comma-separated list from --rules CLI flag
 * @returns Set of rule names that should run
 */
// implements REQ-006
export function getEffectiveRules(
  configRules?: Record<string, boolean>,
  cliRules?: string,
): Set<string> {
  if (cliRules) {
    return new Set(
      cliRules
        .split(",")
        .map((s) => s.trim())
        .filter((s) => RULE_NAMES.has(s)),
    );
  }

  // Start with all known rules
  const effective = new Set<string>();

  for (const rule of RULES) {
    // Config value takes precedence over default, missing means use default
    const enabled = configRules?.[rule.name] ?? rule.defaultEnabled;
    if (enabled) {
      effective.add(rule.name);
    }
  }

  return effective;
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

/**
 * Merge partial checks config with defaults.
 */
export function mergeChecksConfig(
  partial?: Partial<ChecksConfig>,
): ChecksConfig {
  return {
    rules: {
      ...DEFAULT_CHECKS_CONFIG.rules,
      ...partial?.rules,
    },
    symbolTraceability: {
      ...DEFAULT_CHECKS_CONFIG.symbolTraceability,
      ...partial?.symbolTraceability,
    },
  };
}
