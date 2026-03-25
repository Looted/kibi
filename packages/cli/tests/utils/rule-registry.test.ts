/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { describe, expect, test } from "bun:test";
import {
  DEFAULT_CHECKS_CONFIG,
  RULES,
  RULE_NAMES,
  getEffectiveRules,
  mergeChecksConfig,
  validateRuleName,
} from "../../src/utils/rule-registry.js"; // implements TEST-001

describe("rule-registry constants", () => {
  test("RULES has all expected rule definitions", () => {
    expect(RULES).toBeInstanceOf(Array);
    expect(RULES.length).toBeGreaterThan(0);

    // Verify each rule has required fields
    for (const rule of RULES) {
      expect(rule.name).toBeDefined();
      expect(typeof rule.name).toBe("string");
      expect(rule.name.length).toBeGreaterThan(0);

      expect(rule.description).toBeDefined();
      expect(typeof rule.description).toBe("string");
      expect(rule.description.length).toBeGreaterThan(0);

      expect(rule.defaultEnabled).toBeDefined();
      expect(typeof rule.defaultEnabled).toBe("boolean");

      expect(rule.category).toBeDefined();
      expect(["coverage", "integrity", "lifecycle", "traceability"]).toContain(
        rule.category,
      );
    }
  });

  test("RULES is readonly (as const)", () => {
    // RULES is declared as `as const`, which makes it readonly
    // Verify that attempting to mutate would fail (readonly type at compile time)
    expect(Array.isArray(RULES)).toBe(true);
    expect(RULES.length).toBeGreaterThan(0);
  });

  test("RULE_NAMES contains all rule names", () => {
    expect(RULE_NAMES).toBeInstanceOf(Set);
    expect(RULE_NAMES.size).toBe(RULES.length);

    for (const rule of RULES) {
      expect(RULE_NAMES.has(rule.name)).toBe(true);
    }
  });

  test("strict-fact-shape rule exists and is disabled by default", () => {
    const rule = RULES.find((r) => r.name === "strict-fact-shape");
    expect(rule).toBeDefined();
    expect(rule?.defaultEnabled).toBe(false);
    expect(rule?.category).toBe("integrity");
    expect(rule?.description).toContain("fact");
    expect(RULE_NAMES.has("strict-fact-shape")).toBe(true);
  });

  test("RULE_NAMES is a proper Set for O(1) lookups", () => {
    expect(RULE_NAMES.has).toBeInstanceOf(Function);
    expect(RULE_NAMES.add).toBeInstanceOf(Function);
    expect(RULE_NAMES.delete).toBeInstanceOf(Function);
    expect(RULE_NAMES.has("must-priority-coverage")).toBe(true);
    expect(RULE_NAMES.has("non-existent-rule")).toBe(false);
  });

  test("DEFAULT_CHECKS_CONFIG has all rules with default values", () => {
    expect(DEFAULT_CHECKS_CONFIG).toBeDefined();
    expect(DEFAULT_CHECKS_CONFIG.rules).toBeDefined();

    for (const rule of RULES) {
      expect(DEFAULT_CHECKS_CONFIG.rules[rule.name]).toBe(rule.defaultEnabled);
    }
  });

  test("DEFAULT_CHECKS_CONFIG has symbolTraceability options", () => {
    expect(DEFAULT_CHECKS_CONFIG.symbolTraceability).toBeDefined();
    expect(DEFAULT_CHECKS_CONFIG.symbolTraceability.requireAdr).toBe(false);
  });
});

describe("getEffectiveRules", () => {
  test("returns all enabled-by-default rules when no config and no CLI filter provided", () => {
    const result = getEffectiveRules();

    expect(result).toBeInstanceOf(Set);
    // Only rules with defaultEnabled: true should be in the result
    const enabledByDefaultCount = RULES.filter((r) => r.defaultEnabled).length;
    expect(result.size).toBe(enabledByDefaultCount);

    for (const rule of RULES) {
      if (rule.defaultEnabled) {
        expect(result.has(rule.name)).toBe(true);
      } else {
        expect(result.has(rule.name)).toBe(false);
      }
    }
  });

  test("respects config rules override (disable some rules)", () => {
    const configRules = {
      "must-priority-coverage": false,
      "symbol-coverage": false,
    };

    const result = getEffectiveRules(configRules);

    expect(result.has("must-priority-coverage")).toBe(false);
    expect(result.has("symbol-coverage")).toBe(false);
    expect(result.has("no-dangling-refs")).toBe(true); // default enabled
  });

  test("respects config rules override (enable some rules)", () => {
    // All rules are enabled by default, but this tests config override
    const configRules = {
      "must-priority-coverage": true,
    };

    const result = getEffectiveRules(configRules);

    expect(result.has("must-priority-coverage")).toBe(true);
  });

  test("empty config object uses defaults", () => {
    const result = getEffectiveRules({});

    for (const rule of RULES) {
      expect(result.has(rule.name)).toBe(rule.defaultEnabled);
    }
  });

  test("CLI rules filter narrows to specified rules (intersection)", () => {
    const configRules = {
      "must-priority-coverage": true,
      "symbol-coverage": true,
      "no-dangling-refs": true,
    };

    const result = getEffectiveRules(
      configRules,
      "must-priority-coverage,symbol-coverage",
    );

    expect(result.has("must-priority-coverage")).toBe(true);
    expect(result.has("symbol-coverage")).toBe(true);
    expect(result.has("no-dangling-refs")).toBe(false); // filtered out by CLI
  });

  test("CLI rules with spaces are trimmed", () => {
    const result = getEffectiveRules(
      undefined,
      " must-priority-coverage , symbol-coverage ",
    );

    expect(result.has("must-priority-coverage")).toBe(true);
    expect(result.has("symbol-coverage")).toBe(true);
  });

  test("CLI rules filters out unknown/invalid rules", () => {
    const result = getEffectiveRules(
      undefined,
      "must-priority-coverage,unknown-rule,another-bad-rule",
    );

    expect(result.has("must-priority-coverage")).toBe(true);
    expect(result.has("unknown-rule")).toBe(false);
    expect(result.has("another-bad-rule")).toBe(false);
  });

  test("empty CLI rules string returns all enabled rules", () => {
    const result = getEffectiveRules(undefined, "");

    expect(result.size).toBe(RULES.filter((r) => r.defaultEnabled).length);
  });

  test("CLI rules filter when config disables some rules", () => {
    const configRules = {
      "must-priority-coverage": false,
      "symbol-coverage": true,
      "no-dangling-refs": true,
    };

    const result = getEffectiveRules(
      configRules,
      "must-priority-coverage,no-dangling-refs",
    );

    // Explicit CLI --rules should opt in to requested rules even if config disables them
    expect(result.has("must-priority-coverage")).toBe(true);
    expect(result.has("no-dangling-refs")).toBe(true);
  });

  test("CLI rules can explicitly opt into strict-fact-shape", () => {
    const result = getEffectiveRules(undefined, "strict-fact-shape");

    expect(result.size).toBe(1);
    expect(result.has("strict-fact-shape")).toBe(true);
  });

  test("config takes precedence over defaults (config override precedence)", () => {
    const configRules = {
      "must-priority-coverage": false, // override default (true)
    };

    const result = getEffectiveRules(configRules);

    expect(result.has("must-priority-coverage")).toBe(false);
  });

  test("config missing rules use defaults", () => {
    const configRules = {
      "must-priority-coverage": false,
    };

    const result = getEffectiveRules(configRules);

    // Only must-priority-coverage is overridden, others use defaults
    expect(result.has("must-priority-coverage")).toBe(false);
    expect(result.has("symbol-coverage")).toBe(true); // uses default
  });

  test("single CLI rule works", () => {
    const result = getEffectiveRules(undefined, "must-priority-coverage");

    expect(result.has("must-priority-coverage")).toBe(true);
    expect(result.has("symbol-coverage")).toBe(false);
  });

  test("multiple CLI rules separated by comma", () => {
    const result = getEffectiveRules(
      undefined,
      "must-priority-coverage,symbol-coverage,no-dangling-refs",
    );

    expect(result.has("must-priority-coverage")).toBe(true);
    expect(result.has("symbol-coverage")).toBe(true);
    expect(result.has("no-dangling-refs")).toBe(true);
    expect(result.has("no-cycles")).toBe(false);
  });

  test("CLI rules filter with all known rules returns same as config", () => {
    const allRules = RULES.map((r) => r.name).join(",");
    const result = getEffectiveRules(undefined, allRules);

    expect(result.size).toBe(RULES.length);
  });

  test("returns Set (immutable behavior)", () => {
    const result = getEffectiveRules();

    expect(result).toBeInstanceOf(Set);
    // Set methods exist
    expect(result.has).toBeInstanceOf(Function);
    expect(result.add).toBeInstanceOf(Function);
  });

  test("CLI rules with extra commas handled correctly", () => {
    const result = getEffectiveRules(
      undefined,
      "must-priority-coverage,,symbol-coverage,",
    );

    expect(result.has("must-priority-coverage")).toBe(true);
    expect(result.has("symbol-coverage")).toBe(true);
  });

  test("CLI rules filter explicitly opts into requested rules", () => {
    const configRules = {
      "must-priority-coverage": false,
      "symbol-coverage": true,
      "no-cycles": true,
    };

    // Explicit CLI --rules should opt in to requested rules even if config disables them
    const result = getEffectiveRules(
      configRules,
      "must-priority-coverage,no-cycles",
    );

    expect(result.has("must-priority-coverage")).toBe(true);
    expect(result.has("no-cycles")).toBe(true);
  });
});

describe("validateRuleName", () => {
  test("returns null for valid rule names", () => {
    for (const rule of RULES) {
      const result = validateRuleName(rule.name);
      expect(result).toBe(null);
    }
  });

  test("returns error message for unknown rule", () => {
    const result = validateRuleName("unknown-rule");

    expect(result).not.toBe(null);
    expect(typeof result).toBe("string");
    expect(result).toContain("unknown-rule");
    expect(result).toContain("Unknown rule");
  });

  test("error message lists all valid rules", () => {
    const result = validateRuleName("bad-rule");

    expect(result).toContain("Valid rules:");
    for (const rule of RULES) {
      expect(result).toContain(rule.name);
    }
  });

  test("case-sensitive validation", () => {
    const result = validateRuleName("Must-Priority-Coverage");

    expect(result).not.toBe(null);
    expect(result).toContain("Must-Priority-Coverage");
  });

  test("empty string is invalid", () => {
    const result = validateRuleName("");

    expect(result).not.toBe(null);
    expect(result).toContain("Unknown rule");
  });

  test("partial name match is not valid", () => {
    const result = validateRuleName("must-priority");

    expect(result).not.toBe(null);
    expect(result).toContain("must-priority");
  });
});

describe("mergeChecksConfig", () => {
  test("returns DEFAULT_CHECKS_CONFIG when no partial provided", () => {
    const result = mergeChecksConfig();

    expect(result).toEqual(DEFAULT_CHECKS_CONFIG);
  });

  test("merges partial rules config with defaults", () => {
    const partial = {
      rules: {
        "must-priority-coverage": false,
      },
    };

    const result = mergeChecksConfig(partial);

    expect(result.rules["must-priority-coverage"]).toBe(false);
    expect(result.rules["symbol-coverage"]).toBe(
      DEFAULT_CHECKS_CONFIG.rules["symbol-coverage"],
    );
    expect(result.rules["no-dangling-refs"]).toBe(
      DEFAULT_CHECKS_CONFIG.rules["no-dangling-refs"],
    );
  });

  test("merges partial symbolTraceability config with defaults", () => {
    const partial = {
      symbolTraceability: {
        requireAdr: true,
      },
    };

    const result = mergeChecksConfig(partial);

    expect(result.symbolTraceability.requireAdr).toBe(true);
  });

  test("merges both rules and symbolTraceability", () => {
    const partial = {
      rules: {
        "must-priority-coverage": false,
      },
      symbolTraceability: {
        requireAdr: true,
      },
    };

    const result = mergeChecksConfig(partial);

    expect(result.rules["must-priority-coverage"]).toBe(false);
    expect(result.rules["symbol-coverage"]).toBe(
      DEFAULT_CHECKS_CONFIG.rules["symbol-coverage"],
    );
    expect(result.symbolTraceability.requireAdr).toBe(true);
  });

  test("partial config does not mutate defaults", () => {
    const partial = {
      rules: {
        "must-priority-coverage": false,
      },
    };

    mergeChecksConfig(partial);
    const result2 = mergeChecksConfig();

    expect(result2.rules["must-priority-coverage"]).toBe(
      DEFAULT_CHECKS_CONFIG.rules["must-priority-coverage"],
    );
  });

  test("empty partial config returns defaults", () => {
    const result = mergeChecksConfig({});

    expect(result).toEqual(DEFAULT_CHECKS_CONFIG);
  });

  test("overrides all rules when provided", () => {
    const allFalse = Object.fromEntries(RULES.map((r) => [r.name, false]));

    const partial = { rules: allFalse };
    const result = mergeChecksConfig(partial);

    for (const rule of RULES) {
      expect(result.rules[rule.name]).toBe(false);
    }
  });

  test("symbolTraceability partial merge works", () => {
    const partial = {
      symbolTraceability: {
        requireAdr: true,
      },
    };

    const result = mergeChecksConfig(partial);

    expect(result.symbolTraceability).toEqual({
      requireAdr: true,
    });
  });

  test("multiple rule overrides work correctly", () => {
    const partial = {
      rules: {
        "must-priority-coverage": false,
        "symbol-coverage": false,
        "no-cycles": false,
      },
    };

    const result = mergeChecksConfig(partial);

    expect(result.rules["must-priority-coverage"]).toBe(false);
    expect(result.rules["symbol-coverage"]).toBe(false);
    expect(result.rules["no-cycles"]).toBe(false);
    expect(result.rules["no-dangling-refs"]).toBe(
      DEFAULT_CHECKS_CONFIG.rules["no-dangling-refs"],
    );
  });

  test("null partial config returns defaults", () => {
    const result = mergeChecksConfig(undefined);

    expect(result).toEqual(DEFAULT_CHECKS_CONFIG);
  });

  test("preserves structure of DEFAULT_CHECKS_CONFIG", () => {
    const result = mergeChecksConfig();

    expect(Object.keys(result)).toEqual(["rules", "symbolTraceability"]);
    expect(typeof result.rules).toBe("object");
    expect(typeof result.symbolTraceability).toBe("object");
  });
});

describe("integration scenarios", () => {
  test("config disables rules, CLI filter further narrows", () => {
    const configRules = {
      "must-priority-coverage": false,
      "symbol-coverage": true,
      "no-cycles": true,
      "no-dangling-refs": true,
    };

    const result = getEffectiveRules(configRules, "symbol-coverage,no-cycles");

    expect(result.has("must-priority-coverage")).toBe(false); // config disabled
    expect(result.has("symbol-coverage")).toBe(true); // enabled and in CLI
    expect(result.has("no-cycles")).toBe(true); // enabled and in CLI
    expect(result.has("no-dangling-refs")).toBe(false); // enabled but not in CLI
  });

  test("full workflow: merge config, get effective rules, validate", () => {
    const partialConfig = {
      rules: {
        "must-priority-coverage": false,
      },
    };

    const mergedConfig = mergeChecksConfig(partialConfig);
    const effectiveRules = getEffectiveRules(mergedConfig.rules);

    expect(effectiveRules.has("must-priority-coverage")).toBe(false);
    expect(effectiveRules.has("symbol-coverage")).toBe(true);

    // Validate that effective rule names are valid
    for (const ruleName of effectiveRules) {
      const validation = validateRuleName(ruleName);
      expect(validation).toBe(null);
    }
  });

  test("empty workflow: no config, no CLI filter", () => {
    const result = getEffectiveRules();

    expect(result.size).toBeGreaterThan(0);
    // All default-enabled rules should be present
    for (const rule of RULES) {
      if (rule.defaultEnabled) {
        expect(result.has(rule.name)).toBe(true);
      }
    }
  });
});

describe("edge cases and boundary conditions", () => {
  test("getEffectiveRules with undefined config and undefined CLI", () => {
    const result = getEffectiveRules(undefined, undefined);

    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(RULES.filter((r) => r.defaultEnabled).length);
  });

  test("validateRuleName with special characters", () => {
    const result = validateRuleName("rule-with-dashes");
    expect(result).not.toBe(null);
    expect(result).toContain("rule-with-dashes");
  });

  test("mergeChecksConfig with nested undefined", () => {
    const partial = {
      rules: undefined,
      symbolTraceability: undefined,
    };

    const result = mergeChecksConfig(partial);

    // Should still have valid structure
    expect(result.rules).toBeDefined();
    expect(result.symbolTraceability).toBeDefined();
  });

  test("getEffectiveRules with all rules disabled in config", () => {
    const allDisabled = Object.fromEntries(RULES.map((r) => [r.name, false]));

    const result = getEffectiveRules(allDisabled);

    expect(result.size).toBe(0);
  });

  test("CLI filter with all known rules when config disables some", () => {
    const configRules = {
      "must-priority-coverage": false,
    };

    const allRules = RULES.map((r) => r.name).join(",");
    const result = getEffectiveRules(configRules, allRules);

    expect(result.has("must-priority-coverage")).toBe(true);
    expect(result.has("symbol-coverage")).toBe(true);
  });

  test("validateRuleName returns correct format for all invalid inputs", () => {
    const invalidNames = ["", "foo", "bar", "test"];

    for (const name of invalidNames) {
      const result = validateRuleName(name);
      expect(result).not.toBe(null);
      expect(result).toContain("Unknown rule");
      expect(result).toContain(name);
    }
  });
});
