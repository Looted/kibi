import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { MAX_NAMING_BINDING_WORDS } from "../../../src/operations/modeling/predicate-bindings.js";

// implements REQ-model-predicates-binding-word-limit

/**
 * The longest participant value predicate modeling keeps bound. Kibi reads
 * MAX_NAMING_BINDING_WORDS itself at ingest (value_source), so the certificate is
 * checked against the code.
 */

/** The maximum bound participant name length shall be 3 words. */
export function bindingWordLimitCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-binding-word-limit",
    variable: "max_naming_binding_words",
    valueType: "int",
    assumptions: [{ operator: "eq", value: MAX_NAMING_BINDING_WORDS }],
    claim: { operator: "eq", value: 3 },
  });
}

describe("Predicate modeling binds participant names of at most three words", () => {
  test("a bound participant name has at most three words", () => {
    writeCodeCertificate(bindingWordLimitCertificate());
    expect(MAX_NAMING_BINDING_WORDS).toBe(3);
  });
});
