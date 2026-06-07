import { describe, test } from "bun:test";
import { strict as assert } from "node:assert";
import { type ClassifyRiskParams, classifyRisk } from "../src/risk-classifier";

describe("risk-classifier coverage", () => {
  test("falls back safely for an unknown runtime pathKind", () => {
    const params = {
      pathKind: "mystery-kind",
      isUnderKb: false,
      hasMustPriority: false,
      hasDurableComment: false,
      fileContent: "",
    } as unknown as ClassifyRiskParams;

    const result = classifyRisk(params);

    assert.equal(result.riskClass, "safe_docs_only");
    assert.match(result.reasons[0] ?? "", /unhandled/i);
  });
});
