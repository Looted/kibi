// implements REQ-kibi-verification-evidence-contract
import { afterEach, describe, expect, test } from "bun:test";
import { extractPlaywrightCases } from "../../src/extractors/playwright-cases.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("playwright-cases remaining unmatched brace and non-playwright source", () => {
  test("returns empty extraction when Playwright is not imported", () => {
    restores.push(isolateKibiEnv());
    expect(
      extractPlaywrightCases("src/plain.test.ts", "test('not playwright', () => {})"),
    ).toEqual({ symbols: [], diagnostics: [] });
  });

  test("still extracts tests when a describe callback brace is unmatched", () => {
    restores.push(isolateKibiEnv());
    const source = `
import { test } from "@playwright/test";
test.describe("open suite", () => {
test("named case", async () => {});
`;
    const extraction = extractPlaywrightCases("e2e/open.spec.ts", source);
    expect(extraction.symbols.some((symbol) => symbol.title.includes("named case"))).toBe(
      true,
    );
  });
});
