/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 */

// Every check rule declares its layer: knowledge, which every Kibi level
// runs, or verification, which asks for scenarios, tests and proof.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  RULES,
  getLayerRules,
  getRuleLayer,
} from "../../src/utils/rule-registry.js";

const prologFacts = readFileSync(
  path.join(import.meta.dir, "../../../core/src/rule_registry.pl"),
  "utf8",
);
describe("rule layers", () => {
  test("every rule belongs to the knowledge or the verification layer", () => {
    for (const rule of RULES)
      expect(["knowledge", "verification"]).toContain(rule.layer);
  });

  test("the verification layer holds the rules that ask for tests or proof", () => {
    expect([...getLayerRules("verification")].sort()).toEqual([
      "evidence-floor",
      "must-positive-scenario",
      "must-priority-coverage",
      "proof-contract-claims",
      "proof-contract-symbols",
      "symbol-coverage",
    ]);
  });

  test("the two layers partition the registry", () => {
    const knowledge = getLayerRules("knowledge");
    const verification = getLayerRules("verification");
    expect(knowledge.size + verification.size).toBe(RULES.length);
    for (const name of verification) expect(knowledge.has(name)).toBe(false);
  });

  test("the Prolog registry states the same layer for every rule", () => {
    for (const rule of RULES)
      expect(prologFacts).toContain(
        `rule_layer('${rule.name}', ${rule.layer}).`,
      );
  });

  test("getRuleLayer reads one rule's layer", () => {
    expect(getRuleLayer("evidence-floor")).toBe("verification");
    expect(getRuleLayer("domain-contradictions")).toBe("knowledge");
    expect(getRuleLayer("not-a-real-rule")).toBeUndefined();
  });
});
