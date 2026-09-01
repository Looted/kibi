import { describe, expect, test } from "bun:test";
import { extractPlaywrightCases } from "../../src/extractors/playwright-cases.js";
import { playwrightCaseId } from "../../src/proof/producers/playwright-case-id.js";

describe("Playwright case extraction", () => {
  test("extracts stable nested case symbols", () => {
    const source = `
      import { test } from "@playwright/test";
      test.describe("checkout", () => {
        test("accepts a card", async ({ page }) => {});
        test.skip("declines an expired card", async () => {});
      });
    `;
    const first = extractPlaywrightCases("tests/checkout.spec.ts", source);
    const second = extractPlaywrightCases("tests/checkout.spec.ts", source);

    expect(first.diagnostics).toEqual([]);
    expect(first.symbols).toHaveLength(2);
    expect(first.symbols[0]).toMatchObject({
      title: "checkout > accepts a card",
      symbol_role: "behavioral",
      tags: ["test-case", "playwright"],
    });
    expect(first.symbols[0]?.id).toBe(second.symbols[0]?.id);
    expect(first.symbols[0]?.id).toBe(
      playwrightCaseId("tests/checkout.spec.ts", "checkout > accepts a card"),
    );
  });

  test("reports dynamic titles and ignores unrelated test functions", () => {
    const source = `
      function test(value: string) { return value; }
      test(testName);
      const { test: pwTest } = require("@playwright/test");
      pwTest("static", () => {});
    `;
    const result = extractPlaywrightCases("tests/dynamic.spec.ts", source);
    expect(result.symbols).toHaveLength(0);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.code).toBe("dynamic_test_case_unresolved");
  });
});
