import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { FACT_KINDS } from "../../../src/public/operations/discovery-executors.js";

// implements REQ-kibi-query-fact-kinds

/**
 * The fact kinds a typed fact query accepts. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** A fact query kind filter shall be subject, property_value, predicate, predicate_schema, observation, meta, rule or rule_schema. */
export async function queryFactKindsCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-query-fact-kinds",
    domain: { symbolId: "SYM-discovery-fact-kinds", members: [...FACT_KINDS] },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

describe("Fact kinds a fact query filters on", () => {
  test("A fact query kind filter shall be subject, property_value, predicate, predicate_schema, observation, meta, rule or rule_schema", async () => {
    writeCodeCertificate(await queryFactKindsCertificate());
    expect([...FACT_KINDS].sort()).toEqual([
      "meta",
      "observation",
      "predicate",
      "predicate_schema",
      "property_value",
      "rule",
      "rule_schema",
      "subject",
    ]);
  });
});
