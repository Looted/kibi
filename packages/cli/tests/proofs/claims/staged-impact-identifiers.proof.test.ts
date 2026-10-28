import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { KIBI_IMPACT_DIAGNOSTIC_IDS } from "../../../src/traceability/staged-impact-contract.js";
import {
  KIBI_ENTITY_SCHEMA_DOC,
  KIBI_NO_IMPACT_DECLARATION,
  KIBI_SYMBOLS_MANIFEST_PATH,
  KIBI_SYMBOL_COORDINATES_PATH,
} from "../../../src/traceability/evidence-model.js";

// implements REQ-staged-impact-identifiers

/**
 * The diagnostics, paths and declaration line the staged impact check uses. Kibi reads every constant itself at ingest, so the certificate is checked against the code.
 */

/** A staged impact diagnostic shall be kibi_impact_evidence_missing, symbols_manifest_stale or kibi_impact_override_missing_rationale. */
export async function impactDiagnosticIdsCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-impact-diagnostic-ids",
    domain: {
      symbolId: "SYM-KIBI-IMPACT-DIAGNOSTIC-IDS",
      members: [...KIBI_IMPACT_DIAGNOSTIC_IDS],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** The no impact declaration shall be Kibi-Impact: none. */
export function noImpactDeclarationCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-no-impact-declaration",
    symbolId: "SYM-KIBI-NO-IMPACT-DECLARATION",
    value: KIBI_NO_IMPACT_DECLARATION,
  });
}

/** The symbols manifest shall be .kb/symbols.yaml. */
export function symbolsManifestPathCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-symbols-manifest-path",
    symbolId: "SYM-KIBI-SYMBOLS-MANIFEST-PATH",
    value: KIBI_SYMBOLS_MANIFEST_PATH,
  });
}

/** The symbol coordinates file shall be .kb/symbol-coordinates.yaml. */
export function symbolCoordinatesPathCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-symbol-coordinates-path",
    symbolId: "SYM-KIBI-SYMBOL-COORDINATES-PATH",
    value: KIBI_SYMBOL_COORDINATES_PATH,
  });
}

/** The entity schema guide shall be docs/entity-schema.md. */
export function entitySchemaDocCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-entity-schema-doc",
    symbolId: "SYM-KIBI-ENTITY-SCHEMA-DOC",
    value: KIBI_ENTITY_SCHEMA_DOC,
  });
}

describe("Staged impact diagnostics and paths", () => {
  test("A staged impact diagnostic shall be kibi_impact_evidence_missing, symbols_manifest_stale or kibi_impact_override_missing_rationale", async () => {
    writeCodeCertificate(await impactDiagnosticIdsCertificate());
    expect([...KIBI_IMPACT_DIAGNOSTIC_IDS].sort()).toEqual([
      "kibi_impact_evidence_missing",
      "kibi_impact_override_missing_rationale",
      "symbols_manifest_stale",
    ]);
  });

  test("The no impact declaration shall be Kibi-Impact: none", () => {
    writeCodeCertificate(noImpactDeclarationCertificate());
    expect(KIBI_NO_IMPACT_DECLARATION).toBe("Kibi-Impact: none");
  });

  test("The symbols manifest shall be .kb/symbols.yaml", () => {
    writeCodeCertificate(symbolsManifestPathCertificate());
    expect(KIBI_SYMBOLS_MANIFEST_PATH).toBe(".kb/symbols.yaml");
  });

  test("The symbol coordinates file shall be .kb/symbol-coordinates.yaml", () => {
    writeCodeCertificate(symbolCoordinatesPathCertificate());
    expect(KIBI_SYMBOL_COORDINATES_PATH).toBe(".kb/symbol-coordinates.yaml");
  });

  test("The entity schema guide shall be docs/entity-schema.md", () => {
    writeCodeCertificate(entitySchemaDocCertificate());
    expect(KIBI_ENTITY_SCHEMA_DOC).toBe("docs/entity-schema.md");
  });
});
