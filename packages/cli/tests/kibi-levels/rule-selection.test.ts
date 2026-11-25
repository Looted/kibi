/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 */

// A plain kibi check runs the knowledge layer at every level and the
// verification layer only at level test.
import { describe, expect, test } from "bun:test";
import { describeEvaluatedRules } from "../../src/public/operations/check-format-shared.js";
import { resolveCheckRules } from "../../src/public/operations/check-helpers.js";
import { selectStagedRequirementRules } from "../../src/traceability/staged-requirement-rules.js";
import {
  RULES,
  getDefaultRules,
  getEffectiveRules,
  getLayerRules,
  layerRunsAtLevel,
  ruleRunsByDefault,
} from "../../src/utils/rule-registry.js";

const VERIFICATION = getLayerRules("verification");
const DEFAULT_KNOWLEDGE = RULES.filter(
  (rule) =>
    rule.layer === "knowledge" && ruleRunsByDefault(rule.enforcementClass),
).map((rule) => rule.name);

describe("check rule selection by Kibi level", () => {
  test("the knowledge layer runs at every level, the verification layer only at test", () => {
    expect(layerRunsAtLevel("knowledge", "remember")).toBe(true);
    expect(layerRunsAtLevel("knowledge", "test")).toBe(true);
    expect(layerRunsAtLevel("verification", "remember")).toBe(false);
    expect(layerRunsAtLevel("verification", "test")).toBe(true);
  });

  test("at level test a plain check runs every canonical and advisory rule", () => {
    const rules = getDefaultRules("test");
    for (const rule of RULES)
      expect(rules.has(rule.name)).toBe(
        ruleRunsByDefault(rule.enforcementClass),
      );
    expect(getDefaultRules()).toEqual(rules);
  });

  test("at level remember a plain check runs the knowledge rules and no verification rule", () => {
    const rules = getDefaultRules("remember");
    expect([...rules].sort()).toEqual([...DEFAULT_KNOWLEDGE].sort());
    for (const rule of VERIFICATION) expect(rules.has(rule)).toBe(false);
    // Migration rules stay out at every level.
    for (const rule of RULES.filter(
      (candidate) => candidate.enforcementClass === "migration",
    ))
      expect(rules.has(rule.name)).toBe(false);
  });

  test("resolveCheckRules follows the level; an explicit selection runs as asked", () => {
    expect(resolveCheckRules({}, "remember")).toEqual(
      getDefaultRules("remember"),
    );
    expect(resolveCheckRules({}, "test")).toEqual(getDefaultRules("test"));
    expect(resolveCheckRules({})).toEqual(getDefaultRules("test"));
    expect(
      resolveCheckRules(
        { rules: ["evidence-floor", "no-such-rule"] },
        "remember",
      ),
    ).toEqual(new Set(["evidence-floor"]));
    expect(getEffectiveRules([], "remember")).toEqual(new Set());
  });

  test("a full run at a level is reported as a count, a narrowed one names its rules", () => {
    const remember = [...getDefaultRules("remember")];
    expect(describeEvaluatedRules(remember, "remember")).toEqual({
      ruleCount: remember.length,
    });
    expect(describeEvaluatedRules(remember, "test")).toEqual({
      ruleCount: remember.length,
      rules: remember,
    });
    expect(describeEvaluatedRules(remember)).toEqual({
      ruleCount: remember.length,
      rules: remember,
    });
  });

  test("the staged gate runs the requirement-scoped verification rule only at test", () => {
    expect(selectStagedRequirementRules(19, "test")).toContain(
      "must-positive-scenario",
    );
    expect(selectStagedRequirementRules(19)).toContain(
      "must-positive-scenario",
    );
    const remember = selectStagedRequirementRules(19, "remember");
    expect(remember).not.toContain("must-positive-scenario");
    expect(remember).toEqual(
      selectStagedRequirementRules(19, "test").filter(
        (rule) => rule !== "must-positive-scenario",
      ),
    );
    expect(selectStagedRequirementRules(undefined, "remember")).toEqual([]);
  });
});
