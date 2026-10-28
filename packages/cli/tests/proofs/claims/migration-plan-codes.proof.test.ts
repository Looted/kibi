import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  FRESHNESS_RESYNC,
  MIGRATION_PLAN_VERSION,
  PREDICATE_SCHEMA_ALIGNMENT_CODE,
  UNTRACKED_KNOWLEDGE_SOURCES_CODE,
} from "../../../src/public/operations/migration-plan.js";

// implements REQ-agent-migration-plan-codes

/**
 * The version and step codes of a guided migration plan. Kibi reads every constant itself at ingest, so the certificate is checked against the code.
 */

/** The guided migration plan version shall be kibi.migration-plan.v2. */
export function migrationPlanVersionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-migration-plan-version",
    symbolId: "SYM-kibi-migration-plan-version",
    value: MIGRATION_PLAN_VERSION,
  });
}

/** The predicate schema alignment step code shall be predicate_schema_alignment. */
export function predicateAlignmentCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-predicate-alignment-code",
    symbolId: "SYM-migration-plan-predicate-schema-alignment-code",
    value: PREDICATE_SCHEMA_ALIGNMENT_CODE,
  });
}

/** The untracked knowledge sources step code shall be untracked_knowledge_sources. */
export function untrackedSourcesCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-untracked-sources-code",
    symbolId: "SYM-migration-plan-untracked-knowledge-sources-code",
    value: UNTRACKED_KNOWLEDGE_SOURCES_CODE,
  });
}

/** The freshness resync step code shall be freshness_resync. */
export function freshnessResyncCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-freshness-resync-code",
    symbolId: "SYM-migration-plan-freshness-resync",
    value: FRESHNESS_RESYNC,
  });
}

describe("Guided migration plan version and step codes", () => {
  test("The guided migration plan version shall be kibi.migration-plan.v2", () => {
    writeCodeCertificate(migrationPlanVersionCertificate());
    expect(MIGRATION_PLAN_VERSION).toBe("kibi.migration-plan.v2");
  });

  test("The predicate schema alignment step code shall be predicate_schema_alignment", () => {
    writeCodeCertificate(predicateAlignmentCodeCertificate());
    expect(PREDICATE_SCHEMA_ALIGNMENT_CODE).toBe("predicate_schema_alignment");
  });

  test("The untracked knowledge sources step code shall be untracked_knowledge_sources", () => {
    writeCodeCertificate(untrackedSourcesCodeCertificate());
    expect(UNTRACKED_KNOWLEDGE_SOURCES_CODE).toBe(
      "untracked_knowledge_sources",
    );
  });

  test("The freshness resync step code shall be freshness_resync", () => {
    writeCodeCertificate(freshnessResyncCodeCertificate());
    expect(FRESHNESS_RESYNC).toBe("freshness_resync");
  });
});
