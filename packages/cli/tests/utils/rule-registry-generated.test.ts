import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { GENERATED_RULES } from "../../src/utils/rule-registry.generated.js";

type SourceRule = {
  name: string;
  description: string;
  enforcementClass: string;
  category: string;
  diagnosticSeverity?: string;
};

describe("generated rule registry", () => {
  test("mirrors every rule field of the shared registry JSON", () => {
    const source = JSON.parse(
      readFileSync(
        path.join(import.meta.dir, "../../../core/schema/rule-registry.json"),
        "utf8",
      ),
    ) as { rules: SourceRule[] };
    expect(GENERATED_RULES).toStrictEqual(
      source.rules.map((rule) => ({
        name: rule.name,
        description: rule.description,
        enforcementClass: rule.enforcementClass,
        category: rule.category,
        ...(rule.diagnosticSeverity === undefined
          ? {}
          : { diagnosticSeverity: rule.diagnosticSeverity }),
      })) as never,
    );
  });
});
