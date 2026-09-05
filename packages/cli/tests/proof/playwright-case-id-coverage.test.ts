// implements REQ-kibi-proof-evidence-protocol
import { describe, expect, test } from "bun:test";
import path from "node:path";

import {
  normalizePlaywrightSourceFile,
  playwrightCaseId,
} from "../../src/proof/producers/playwright-case-id.js";

describe("playwright case identity", () => {
  test("hashes repository-relative paths and trims titles", () => {
    const first = playwrightCaseId("./tests/checkout.spec.ts", " accepts a card ");
    const second = playwrightCaseId("tests/checkout.spec.ts", "accepts a card");
    const windows = playwrightCaseId("tests\\checkout.spec.ts", "accepts a card");
    expect(first).toBe(second);
    expect(windows).toBe(second);
    expect(first.startsWith("SYM-PW-")).toBe(true);
    expect(first).toHaveLength(23);
  });

  test("normalizes absolute files inside and outside the workspace", () => {
    const root = "/tmp/workspace";
    const inside = path.join(root, "tests", "a.spec.ts");
    expect(normalizePlaywrightSourceFile(inside, root)).toBe("tests/a.spec.ts");
    expect(normalizePlaywrightSourceFile(inside)).toBe(inside.replaceAll("\\", "/"));
    expect(normalizePlaywrightSourceFile("/elsewhere/a.spec.ts", root)).toBe(
      "/elsewhere/a.spec.ts",
    );
  });
});
