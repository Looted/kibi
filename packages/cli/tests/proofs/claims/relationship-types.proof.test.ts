import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { RELATIONSHIP_TYPES } from "../../../src/operations/mutation/relationships.js";

// implements REQ-kibi-relationship-type-vocabulary

/**
 * The relationship types kb_upsert accepts. Kibi reads RELATIONSHIP_TYPES itself at
 * ingest (domain_source), so the certificate is checked against the list in code.
 */

/** Kibi relationship types shall be depends_on, specified_by, verified_by, validates, implements, covered_by, executable_for, constrained_by, constrains, requires_property, requires_predicate, requires_rule, guards, publishes, consumes, supersedes, restates, assumes, exempts and relates_to. */
export async function relationshipTypeVocabularyCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-relationship-type-vocabulary",
    domain: {
      symbolId: "SYM-cli-mutation-RELATIONSHIP_TYPES",
      members: [...RELATIONSHIP_TYPES],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

describe("Kibi's relationship type vocabulary", () => {
  test("the relationship vocabulary is the twenty types kb_upsert accepts", async () => {
    writeCodeCertificate(await relationshipTypeVocabularyCertificate());
    expect([...RELATIONSHIP_TYPES].sort()).toEqual([
      "assumes",
      "constrained_by",
      "constrains",
      "consumes",
      "covered_by",
      "depends_on",
      "executable_for",
      "exempts",
      "guards",
      "implements",
      "publishes",
      "relates_to",
      "requires_predicate",
      "requires_property",
      "requires_rule",
      "restates",
      "specified_by",
      "supersedes",
      "validates",
      "verified_by",
    ]);
  });
});
