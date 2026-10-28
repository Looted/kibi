import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { REQUIRED_SWIPL_LIBRARIES } from "../../../src/prolog/swipl-resolver.js";
import { PROLOG_ERROR_TERM_PREFIX } from "../../../src/prolog/error-terms.js";

// implements REQ-prolog-runtime-libraries

/**
 * The SWI-Prolog libraries a runtime must load and the prefix of an engine error line. Kibi reads every constant itself at ingest, so the certificate is checked against the code.
 */

/** The required SWI-Prolog libraries shall be semweb/rdf_db, semweb/rdf_persistency, semweb/sparql_client, pcre, crypto, sha, http/json, http/json_convert, chr, clpfd, thread, persistency, filesex, readutil, date, aggregate and solution_sequences. */
export async function requiredSwiplLibrariesCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-required-swipl-libraries",
    domain: {
      symbolId: "SYM-prolog-swipl-required-swipl-libraries-src",
      members: [...REQUIRED_SWIPL_LIBRARIES],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** The prefix __KIBI_ERROR__: shall open a Prolog error line. */
export function prologErrorPrefixCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-prolog-error-prefix",
    symbolId: "SYM-cli-PrologErrorTermPrefix",
    value: PROLOG_ERROR_TERM_PREFIX,
  });
}

describe("Required SWI-Prolog libraries", () => {
  test("The required SWI-Prolog libraries shall be semweb/rdf_db, semweb/rdf_persistency, semweb/sparql_client, pcre, crypto, sha, http/json, http/json_convert, chr, clpfd, thread, persistency, filesex, readutil, date, aggregate and solution_sequences", async () => {
    writeCodeCertificate(await requiredSwiplLibrariesCertificate());
    expect([...REQUIRED_SWIPL_LIBRARIES].sort()).toEqual([
      "aggregate",
      "chr",
      "clpfd",
      "crypto",
      "date",
      "filesex",
      "http/json",
      "http/json_convert",
      "pcre",
      "persistency",
      "readutil",
      "semweb/rdf_db",
      "semweb/rdf_persistency",
      "semweb/sparql_client",
      "sha",
      "solution_sequences",
      "thread",
    ]);
  });

  test("The prefix __KIBI_ERROR__: shall open a Prolog error line", () => {
    writeCodeCertificate(prologErrorPrefixCertificate());
    expect(PROLOG_ERROR_TERM_PREFIX).toBe("__KIBI_ERROR__:");
  });
});
