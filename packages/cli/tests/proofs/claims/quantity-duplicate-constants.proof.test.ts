import { describe, expect, test } from "bun:test";
import {
  QUANTITY_WORD_SHARE,
  TRIVIAL_NUMBERS,
} from "../../../src/public/operations/quantity-layer.js";
import {
  type CodeCertificate,
  arithmeticCertificate,
  exhaustiveCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";

/**
 * The constants behind the quantity-duplicate rule. Kibi reads each constant
 * itself at ingest, so each certificate is checked against the code.
 */

/** The numbers Kibi check treats as too trivial to compare shall be 0 and 1. */
export async function trivialNumbersCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-quantity-trivial-numbers",
    domain: {
      symbolId: "SYM-const-quantity-trivial-numbers",
      members: [...TRIVIAL_NUMBERS],
    },
    check: (member) => {
      expect(typeof member).toBe("number");
    },
  });
}

/**
 * The share of words that property keys or claim texts must have in common to
 * tie two value facts shall be 0.5.
 */
export function quantityWordShareCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-quantity-word-share",
    variable: "word_share",
    valueType: "real",
    assumptions: [{ operator: "eq", value: QUANTITY_WORD_SHARE }],
    claim: { operator: "eq", value: 0.5 },
  });
}

describe("Constants behind the quantity-duplicate rule", () => {
  test("The numbers too trivial to compare are 0 and 1", async () => {
    writeCodeCertificate(await trivialNumbersCertificate());
    expect([...TRIVIAL_NUMBERS]).toEqual([0, 1]);
  });

  test("The word share that ties two value facts is 0.5", () => {
    writeCodeCertificate(quantityWordShareCertificate());
    expect(QUANTITY_WORD_SHARE).toBe(0.5);
  });
});
