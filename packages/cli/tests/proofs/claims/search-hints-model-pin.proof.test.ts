import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  MODEL_ID,
  MODEL_REVISION,
} from "../../../../plugin-search-hints/src/model.js";

// implements REQ-search-hints-model-pin

/**
 * The upstream embedding model kibi-plugin-search-hints bundles and the revision of it. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** The search hints embedding model shall be minishlab/potion-base-8M. */
export function searchHintsModelIdCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-search-hints-model-id",
    symbolId: "SYM-const-search-hints-model-id",
    value: MODEL_ID,
  });
}

/** The search hints embedding model revision shall be bf8b056651a2c21b8d2565580b8569da283cab23. */
export function searchHintsModelRevisionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-search-hints-model-revision",
    symbolId: "SYM-const-search-hints-model-revision",
    value: MODEL_REVISION,
  });
}

describe("Search hints embedding model pin", () => {
  test("The search hints embedding model shall be minishlab/potion-base-8M", () => {
    writeCodeCertificate(searchHintsModelIdCertificate());
    expect(MODEL_ID).toBe("minishlab/potion-base-8M");
  });

  test("The search hints embedding model revision shall be bf8b056651a2c21b8d2565580b8569da283cab23", () => {
    writeCodeCertificate(searchHintsModelRevisionCertificate());
    expect(MODEL_REVISION).toBe("bf8b056651a2c21b8d2565580b8569da283cab23");
  });
});
