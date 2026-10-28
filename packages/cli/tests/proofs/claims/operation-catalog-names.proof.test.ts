import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { OPERATION_CATALOG } from "../../../src/public/operations/catalog.js";

// implements REQ-kibi-operation-catalog-names

/**
 * The operations Kibi's catalog defines, read from the name of each catalog entry. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** A Kibi catalog operation shall be one of the 24 operations the catalog names. */
export async function operationCatalogNamesCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-operation-catalog-names",
    domain: {
      symbolId: "SYM-operation-catalog",
      members: [...OPERATION_CATALOG],
    },
    key: (member) => member.name,
    check: (member) => {
      expect(typeof member.name).toBe("string");
    },
  });
}

describe("Kibi operation catalog names", () => {
  test("A Kibi catalog operation shall be one of the 24 operations the catalog names", async () => {
    writeCodeCertificate(await operationCatalogNamesCertificate());
    expect(OPERATION_CATALOG.map((member) => member.name).sort()).toEqual([
      "kb_apply_plan",
      "kb_check",
      "kb_compile_intent",
      "kb_coverage",
      "kb_delete",
      "kb_find_gaps",
      "kb_graph",
      "kb_ingest_proof",
      "kb_model",
      "kb_model_requirement",
      "kb_plan_bootstrap",
      "kb_prepare_impact_review",
      "kb_query",
      "kb_search",
      "kb_semantic_advisor",
      "kb_skills",
      "kb_skills_list",
      "kb_skills_load",
      "kb_skills_read",
      "kb_sparql_remote",
      "kb_status",
      "kb_suggest_predicates",
      "kb_upsert",
      "kb_validate_upsert",
    ]);
  });
});
