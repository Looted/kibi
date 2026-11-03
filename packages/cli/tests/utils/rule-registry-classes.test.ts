import { describe, expect, test } from "bun:test";
import {
  RULES,
  RULE_NAMES,
  getCanonicalRules,
  getDefaultRules,
  getEffectiveRules,
  getRuleDefinition,
  getRuleEnforcementClass,
  isCanonicalRule,
  ruleRunsByDefault,
  validateRuleName,
} from "../../src/utils/rule-registry.js";

const names = (cls: string) =>
  RULES.filter((rule) => rule.enforcementClass === cls)
    .map((rule) => rule.name)
    .sort();

describe("rule registry by enforcement class", () => {
  test("each class holds the rules the registry JSON assigns it", () => {
    expect(names("migration")).toStrictEqual([
      "semantic-completeness",
      "strict-readiness",
    ]);
    expect(names("canonical")).toContain("no-cycles");
    expect(names("advisory")).toContain("entity-id-style");
    expect(RULE_NAMES.size).toBe(RULES.length);
  });

  test("canonical rules are exactly the canonical class", () => {
    expect([...getCanonicalRules()].sort()).toStrictEqual(names("canonical"));
    expect(isCanonicalRule("no-cycles")).toBe(true);
    expect(isCanonicalRule("entity-id-style")).toBe(false);
    expect(isCanonicalRule("unknown-rule")).toBe(false);
  });

  test("default rules are canonical plus advisory", () => {
    expect([...getDefaultRules()].sort()).toStrictEqual(
      [...names("canonical"), ...names("advisory")].sort(),
    );
    expect(ruleRunsByDefault("canonical")).toBe(true);
    expect(ruleRunsByDefault("advisory")).toBe(true);
    expect(ruleRunsByDefault("migration")).toBe(false);
    expect([...getEffectiveRules()].sort()).toStrictEqual(
      [...getDefaultRules()].sort(),
    );
  });

  test("a selection keeps only known rules", () => {
    expect([...getEffectiveRules(["strict-readiness", "nope"])]).toStrictEqual([
      "strict-readiness",
    ]);
    expect([...getEffectiveRules([])]).toStrictEqual([]);
  });

  test("lookups by name", () => {
    expect(getRuleDefinition("no-cycles")?.name).toBe("no-cycles");
    expect(getRuleDefinition("nope")).toBeUndefined();
    expect(getRuleEnforcementClass("strict-readiness")).toBe("migration");
    expect(getRuleEnforcementClass("nope")).toBeUndefined();
  });

  test("validateRuleName lists every valid rule for an unknown name", () => {
    expect(validateRuleName("no-cycles")).toBeNull();
    expect(validateRuleName("nope")).toBe(
      `Unknown rule: nope. Valid rules: ${RULES.map((rule) => rule.name).join(", ")}`,
    );
  });
});
