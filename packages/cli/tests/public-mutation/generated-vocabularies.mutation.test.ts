import { describe, expect, test } from "bun:test";
import * as checkRules from "../../src/public/operations/specs/check-rules.generated.js";
import * as mutationSchemas from "../../src/public/operations/specs/mutation-schemas.js";
import * as granularity from "../../src/public/symbol-granularity.generated.js";
import { expectGolden } from "./helpers/golden.js";

describe("generated vocabularies", () => {
  test("selectable kb_check rules", () => {
    expectGolden("check-rules-generated", checkRules);
    expect(checkRules.SELECTABLE_RULES_ALLOWED).toBe(
      checkRules.SELECTABLE_RULE_NAMES.join(", "),
    );
  });

  test("symbol classification vocabulary", () => {
    expectGolden("symbol-granularity-generated", granularity);
  });

  test("mutation schemas", () => {
    expectGolden("mutation-schemas", mutationSchemas);
  });
});
