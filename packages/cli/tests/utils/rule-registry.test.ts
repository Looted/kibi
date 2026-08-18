/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 */

import { describe, expect, test } from "bun:test";
import {
  RULES,
  RULE_NAMES,
  getCanonicalRules,
  getDefaultRules,
  getEffectiveRules,
  getRuleDefinition,
  isCanonicalRule,
  validateRuleName,
} from "../../src/utils/rule-registry.js";

describe("rule-registry constants", () => {
  test("RULES has all expected rule definitions", () => {
    expect(RULES.length).toBeGreaterThan(0);
    for (const rule of RULES) {
      expect(rule.name.length).toBeGreaterThan(0);
      expect(rule.description.length).toBeGreaterThan(0);
      expect(["canonical", "advisory", "migration"]).toContain(
        rule.enforcementClass,
      );
      expect(["coverage", "integrity", "lifecycle", "traceability"]).toContain(
        rule.category,
      );
      expect(typeof rule.runsByDefault).toBe("boolean");
    }
  });

  test("RULE_NAMES contains all rule names", () => {
    expect(RULE_NAMES.size).toBe(RULES.length);
    for (const rule of RULES) {
      expect(RULE_NAMES.has(rule.name)).toBe(true);
    }
  });

  test("migration rules do not run by default", () => {
    for (const rule of RULES.filter((r) => r.enforcementClass === "migration")) {
      expect(rule.runsByDefault).toBe(false);
    }
  });

  test("canonical rules run by default", () => {
    for (const rule of RULES.filter((r) => r.enforcementClass === "canonical")) {
      expect(rule.runsByDefault).toBe(true);
    }
  });
});

describe("getDefaultRules", () => {
  test("returns Kibi-owned default policy", () => {
    const defaults = getDefaultRules();
    for (const rule of RULES) {
      expect(defaults.has(rule.name)).toBe(rule.runsByDefault);
    }
  });
});

describe("getCanonicalRules", () => {
  test("returns only canonical enforcement class rules", () => {
    const canonical = getCanonicalRules();
    for (const name of canonical) {
      expect(isCanonicalRule(name)).toBe(true);
    }
    for (const rule of RULES.filter((r) => r.enforcementClass !== "canonical")) {
      expect(canonical.has(rule.name)).toBe(false);
    }
  });
});

describe("getEffectiveRules", () => {
  test("returns default policy when no diagnostic selector is provided", () => {
    expect(getEffectiveRules()).toEqual(getDefaultRules());
  });

  test("diagnostic selector runs only requested known rules", () => {
    const result = getEffectiveRules([
      "must-priority-coverage",
      "strict-readiness",
      "unknown-rule",
    ]);
    expect(result.has("must-priority-coverage")).toBe(true);
    expect(result.has("strict-readiness")).toBe(true);
    expect(result.has("unknown-rule")).toBe(false);
    expect(result.size).toBe(2);
  });

  test("diagnostic selector can opt into migration rules", () => {
    const result = getEffectiveRules(["strict-fact-shape"]);
    expect(result).toEqual(new Set(["strict-fact-shape"]));
  });

  test("empty diagnostic selector returns empty set", () => {
    expect(getEffectiveRules([])).toEqual(new Set());
  });
});

describe("validateRuleName", () => {
  test("returns null for valid rule names", () => {
    for (const rule of RULES) {
      expect(validateRuleName(rule.name)).toBe(null);
    }
  });

  test("returns error message for unknown rule", () => {
    const result = validateRuleName("unknown-rule");
    expect(result).toContain("Unknown rule");
    expect(result).toContain("unknown-rule");
  });
});

describe("getRuleDefinition", () => {
  test("returns definition for known rules", () => {
    expect(getRuleDefinition("must-priority-coverage")?.enforcementClass).toBe(
      "canonical",
    );
  });
});
