/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RULES } from "../../src/utils/rule-registry.js";
import { SELECTABLE_RULE_NAMES } from "../../src/public/operations/specs/check-rules.generated.js";
import { checkSpec } from "../../src/public/operations/specs/check.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const registryJson = JSON.parse(
  readFileSync(
    path.join(repoRoot, "packages/core/schema/rule-registry.json"),
    "utf8",
  ),
) as {
  rules: Array<{
    name: string;
    implementation: "prolog" | "typescript";
    prologPredicate: string | null;
  }>;
};
const jsonNames = registryJson.rules.map((rule) => rule.name);

describe("check-rule registry single-source contract", () => {
  test("TS rule registry matches the registry JSON", () => {
    expect(RULES.map((rule) => rule.name)).toEqual(jsonNames);
  });

  test("kb_check input enum matches the registry JSON", () => {
    expect([...SELECTABLE_RULE_NAMES]).toEqual(jsonNames);
    const enumNames = (
      checkSpec.businessInputSchema.properties.rules.items as {
        enum: readonly string[];
      }
    ).enum;
    expect([...enumNames]).toEqual(jsonNames);
  });

  test("generated artifacts are in sync (generator --check passes)", () => {
    expect(() => {
      execFileSync(
        "node",
        [path.join(repoRoot, "scripts/generate-rule-registry.mjs"), "--check"],
        { stdio: "pipe" },
      );
    }).not.toThrow();
  });

  test("checks.pl dispatches every prolog-implemented registry rule", () => {
    const checksPl = readFileSync(
      path.join(repoRoot, "packages/core/src/checks.pl"),
      "utf8",
    );
    for (const rule of registryJson.rules) {
      if (rule.implementation !== "prolog" || !rule.prologPredicate) continue;
      const dispatched =
        checksPl.includes(
          `selected_rule(Rules, '${rule.name}', ${rule.prologPredicate}`,
        ) ||
        checksPl.includes(
          `selected_rule_with_options(Rules, '${rule.name}', ${rule.prologPredicate}`,
        );
      expect(dispatched).toBeTrue();
      expect(checksPl.includes(rule.prologPredicate)).toBeTrue();
    }
  });

  test("Prolog rejects unknown rule names loudly", () => {
    const output = execFileSync(
      "swipl",
      [
        "-q",
        "-g",
        `use_module('${path.join(repoRoot, "packages/core/src/checks.pl")}'), catch(checks:check_selected(['totally-bogus-rule'], _), error(domain_error(check_rule, ['totally-bogus-rule']), _), (write(unknown_rejected), nl)), halt.`,
      ],
      { stdio: ["ignore", "pipe", "inherit"], encoding: "utf8" },
    );
    expect(output).toContain("unknown_rejected");
  });

  test("Prolog accepts typescript-implemented rule names without violations", () => {
    const output = execFileSync(
      "swipl",
      [
        "-q",
        "-g",
        `use_module('${path.join(repoRoot, "packages/core/src/checks.pl")}'), checks:check_selected(['source-relationship-parity'], Dict), write(ts_rule_ok), nl, halt.`,
      ],
      { stdio: ["ignore", "pipe", "inherit"], encoding: "utf8" },
    );
    expect(output).toContain("ts_rule_ok");
  });
});
