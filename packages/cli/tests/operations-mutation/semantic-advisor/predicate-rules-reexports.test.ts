import { describe, expect, test } from "bun:test";
import {
  CORE_PREDICATE_RULES as BUILTIN_CORE,
  LAUNCHER_PREDICATE_RULES as BUILTIN_LAUNCHER,
  POLICY_PREDICATE_RULES as BUILTIN_POLICY,
  PRODUCT_PREDICATE_RULES as BUILTIN_PRODUCT,
  PRODUCT_TAIL_PREDICATE_RULES as BUILTIN_PRODUCT_TAIL,
  exactLauncherPredicateArgs as builtinExactLauncherPredicateArgs,
} from "kibi-plugin-builtin";
import { CORE_PREDICATE_RULES } from "../../../src/operations/semantic-advisor/predicate-rules-core.js";
import {
  LAUNCHER_PREDICATE_RULES,
  exactLauncherPredicateArgs,
} from "../../../src/operations/semantic-advisor/predicate-rules-launcher.js";
import { POLICY_PREDICATE_RULES } from "../../../src/operations/semantic-advisor/predicate-rules-policy.js";
import { PRODUCT_TAIL_PREDICATE_RULES } from "../../../src/operations/semantic-advisor/predicate-rules-product-tail.js";
import { PRODUCT_PREDICATE_RULES } from "../../../src/operations/semantic-advisor/predicate-rules-product.js";

describe("predicate rule table re-exports", () => {
  test("each CLI table is the builtin table itself", () => {
    expect(CORE_PREDICATE_RULES).toBe(BUILTIN_CORE);
    expect(POLICY_PREDICATE_RULES).toBe(BUILTIN_POLICY);
    expect(PRODUCT_PREDICATE_RULES).toBe(BUILTIN_PRODUCT);
    expect(PRODUCT_TAIL_PREDICATE_RULES).toBe(BUILTIN_PRODUCT_TAIL);
    expect(LAUNCHER_PREDICATE_RULES).toBe(BUILTIN_LAUNCHER);
    expect(exactLauncherPredicateArgs).toBe(builtinExactLauncherPredicateArgs);
  });

  test("tables are non-empty rule lists", () => {
    for (const table of [
      CORE_PREDICATE_RULES,
      POLICY_PREDICATE_RULES,
      PRODUCT_PREDICATE_RULES,
      PRODUCT_TAIL_PREDICATE_RULES,
      LAUNCHER_PREDICATE_RULES,
    ]) {
      expect(table.length).toBeGreaterThan(0);
    }
  });
});
