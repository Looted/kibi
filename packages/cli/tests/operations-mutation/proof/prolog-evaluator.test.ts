import { describe, expect, test } from "bun:test";
import { PROLOG_EVALUATOR } from "../../../src/operations/proof/prolog-evaluator.js";

describe("PROLOG_EVALUATOR", () => {
  test("is the kibi_proof_evaluator script with every plan mode", () => {
    expect(PROLOG_EVALUATOR.startsWith("\n:- module(kibi_proof_evaluator, []).\n")).toBe(true);
    for (const mode of ["export", "table", "machine", "pattern"]) {
      expect(PROLOG_EVALUATOR).toContain(`Plan.mode == "${mode}"`);
    }
  });

  test("keeps its escapes raw", () => {
    // String.raw keeps the Prolog escapes (\n, \q) as written.
    expect(PROLOG_EVALUATOR).toContain('split_string(Raw, "", "\\n ", [Text])');
  });
});
