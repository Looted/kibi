import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  ENTITY_ORIGIN_BACKFILL_ACTION_ID,
  ENTITY_ORIGIN_BACKFILL_CODE,
  ORIGIN_SCHEMA_VERSION,
  REQ_STATUS_VOCABULARY_MAP_CODE,
  SEMANTIC_INVENTORY_REDERIVE_CODE,
  SEMANTIC_INVENTORY_REVIEW_CODE,
} from "../../../src/operations/migration/schema6.js";
import { POLARITY_VALUE_BACKFILL_CODE } from "../../../src/operations/migration/polarity-values.js";

// implements REQ-cli-schema-migration-codes

/**
 * The action ids and codes kibi migrate reports for its schema steps. Kibi reads every constant itself at ingest, so the certificate is checked against the code.
 */

/** Entity origins shall arrive with KB schema version 6. */
export function originSchemaVersionCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-origin-schema-version",
    variable: "origin_schema_version",
    valueType: "int",
    assumptions: [{ operator: "eq", value: ORIGIN_SCHEMA_VERSION }],
    claim: { operator: "eq", value: 6 },
  });
}

/** The entity origin backfill action id shall be entity-origin-backfill. */
export function originBackfillActionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-origin-backfill-action",
    symbolId: "SYM-migration-entity-origin-backfill-action-id",
    value: ENTITY_ORIGIN_BACKFILL_ACTION_ID,
  });
}

/** The entity origin backfill code shall be entity_origin_backfill. */
export function originBackfillCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-origin-backfill-code",
    symbolId: "SYM-migration-entity-origin-backfill-code",
    value: ENTITY_ORIGIN_BACKFILL_CODE,
  });
}

/** The requirement status vocabulary map code shall be req_status_vocabulary_map. */
export function statusVocabularyMapCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-status-vocabulary-map-code",
    symbolId: "SYM-schema6-REQ_STATUS_VOCABULARY_MAP_CODE",
    value: REQ_STATUS_VOCABULARY_MAP_CODE,
  });
}

/** The semantic inventory rederive code shall be semantic_inventory_rederive. */
export function inventoryRederiveCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-inventory-rederive-code",
    symbolId: "SYM-migration-semantic-inventory-rederive-code",
    value: SEMANTIC_INVENTORY_REDERIVE_CODE,
  });
}

/** The semantic inventory review code shall be semantic_inventory_review. */
export function inventoryReviewCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-inventory-review-code",
    symbolId: "SYM-migration-semantic-inventory-review-code",
    value: SEMANTIC_INVENTORY_REVIEW_CODE,
  });
}

/** The polarity value backfill code shall be polarity_value_backfill. */
export function polarityBackfillCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-polarity-backfill-code",
    symbolId: "SYM-migrate-polarity-backfill-code",
    value: POLARITY_VALUE_BACKFILL_CODE,
  });
}

describe("Schema migration codes", () => {
  test("Entity origins shall arrive with KB schema version 6", () => {
    writeCodeCertificate(originSchemaVersionCertificate());
    expect(ORIGIN_SCHEMA_VERSION).toBe(6);
  });

  test("The entity origin backfill action id shall be entity-origin-backfill", () => {
    writeCodeCertificate(originBackfillActionCertificate());
    expect(ENTITY_ORIGIN_BACKFILL_ACTION_ID).toBe("entity-origin-backfill");
  });

  test("The entity origin backfill code shall be entity_origin_backfill", () => {
    writeCodeCertificate(originBackfillCodeCertificate());
    expect(ENTITY_ORIGIN_BACKFILL_CODE).toBe("entity_origin_backfill");
  });

  test("The requirement status vocabulary map code shall be req_status_vocabulary_map", () => {
    writeCodeCertificate(statusVocabularyMapCodeCertificate());
    expect(REQ_STATUS_VOCABULARY_MAP_CODE).toBe("req_status_vocabulary_map");
  });

  test("The semantic inventory rederive code shall be semantic_inventory_rederive", () => {
    writeCodeCertificate(inventoryRederiveCodeCertificate());
    expect(SEMANTIC_INVENTORY_REDERIVE_CODE).toBe(
      "semantic_inventory_rederive",
    );
  });

  test("The semantic inventory review code shall be semantic_inventory_review", () => {
    writeCodeCertificate(inventoryReviewCodeCertificate());
    expect(SEMANTIC_INVENTORY_REVIEW_CODE).toBe("semantic_inventory_review");
  });

  test("The polarity value backfill code shall be polarity_value_backfill", () => {
    writeCodeCertificate(polarityBackfillCodeCertificate());
    expect(POLARITY_VALUE_BACKFILL_CODE).toBe("polarity_value_backfill");
  });
});
