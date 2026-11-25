import { describe, expect, test } from "bun:test";
import {
  MODEL_ID,
  MODEL_REVISION,
} from "../../../../plugin-search-hints/src/model.js";
import {
  type CodeCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";

/**
 * The upstream embedding model kibi-plugin-search-hints bundles and the revision of it. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** The search hints embedding model shall be minishlab/potion-retrieval-32M. */
export function searchHintsModelIdCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-search-hints-model-id",
    symbolId: "SYM-const-search-hints-model-id",
    value: MODEL_ID,
  });
}

/** The search hints embedding model revision shall be 6fc8051fab2a1e0ee76689cf08c853792ac285e7. */
export function searchHintsModelRevisionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-search-hints-model-revision",
    symbolId: "SYM-const-search-hints-model-revision",
    value: MODEL_REVISION,
  });
}

describe("Search hints embedding model pin", () => {
  test("The search hints embedding model shall be minishlab/potion-retrieval-32M", () => {
    writeCodeCertificate(searchHintsModelIdCertificate());
    expect(MODEL_ID).toBe("minishlab/potion-retrieval-32M");
  });

  test("The search hints embedding model revision shall be 6fc8051fab2a1e0ee76689cf08c853792ac285e7", () => {
    writeCodeCertificate(searchHintsModelRevisionCertificate());
    expect(MODEL_REVISION).toBe("6fc8051fab2a1e0ee76689cf08c853792ac285e7");
  });
});
