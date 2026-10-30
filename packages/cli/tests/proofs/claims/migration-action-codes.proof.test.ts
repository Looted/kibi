import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { DELIVERED_REQUIREMENT_TAG } from "../../../src/operations/migration/requirement-status.js";
import {
  REQ_STATUS_DELIVERED_MAP_ACTION_ID,
  REQ_STATUS_DELIVERED_MAP_CODE,
} from "../../../src/operations/migration/schema6.js";
import {
  ENTITY_TYPE_BACKFILL_ACTION_ID,
  ENTITY_TYPE_BACKFILL_CODE,
} from "../../../src/operations/migration/entity-type.js";

// implements REQ-cli-migration-action-codes

/**
 * The tag and action codes kibi migrate uses for legacy requirement status and
 * entity types. Kibi reads every constant itself at ingest, so the certificate is checked against the code.
 */

/** A migrated delivered requirement shall carry the tag implemented. */
export function deliveredRequirementTagCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-delivered-requirement-tag",
    symbolId: "SYM-migration-delivered-requirement-tag",
    value: DELIVERED_REQUIREMENT_TAG,
  });
}

/** The delivered status migration action id shall be req-status-delivered-map. */
export function deliveredMapActionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-delivered-map-action",
    symbolId: "SYM-schema6-REQ_STATUS_DELIVERED_MAP_ACTION_ID",
    value: REQ_STATUS_DELIVERED_MAP_ACTION_ID,
  });
}

/** The delivered status migration code shall be req_status_delivered_map. */
export function deliveredMapCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-delivered-map-code",
    symbolId: "SYM-schema6-REQ_STATUS_DELIVERED_MAP_CODE",
    value: REQ_STATUS_DELIVERED_MAP_CODE,
  });
}

/** The entity type backfill action id shall be entity-type-backfill. */
export function entityTypeBackfillActionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-entity-type-backfill-action",
    symbolId: "SYM-migration-entity-type-backfill-action-id",
    value: ENTITY_TYPE_BACKFILL_ACTION_ID,
  });
}

/** The entity type backfill code shall be entity_type_backfill. */
export function entityTypeBackfillCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-entity-type-backfill-code",
    symbolId: "SYM-migration-entity-type-backfill-code",
    value: ENTITY_TYPE_BACKFILL_CODE,
  });
}

describe("Requirement status migration codes", () => {
  test("A migrated delivered requirement shall carry the tag implemented", () => {
    writeCodeCertificate(deliveredRequirementTagCertificate());
    expect(DELIVERED_REQUIREMENT_TAG).toBe("implemented");
  });

  test("The delivered status migration action id shall be req-status-delivered-map", () => {
    writeCodeCertificate(deliveredMapActionCertificate());
    expect(REQ_STATUS_DELIVERED_MAP_ACTION_ID).toBe("req-status-delivered-map");
  });

  test("The delivered status migration code shall be req_status_delivered_map", () => {
    writeCodeCertificate(deliveredMapCodeCertificate());
    expect(REQ_STATUS_DELIVERED_MAP_CODE).toBe("req_status_delivered_map");
  });

  test("The entity type backfill action id shall be entity-type-backfill", () => {
    writeCodeCertificate(entityTypeBackfillActionCertificate());
    expect(ENTITY_TYPE_BACKFILL_ACTION_ID).toBe("entity-type-backfill");
  });

  test("The entity type backfill code shall be entity_type_backfill", () => {
    writeCodeCertificate(entityTypeBackfillCodeCertificate());
    expect(ENTITY_TYPE_BACKFILL_CODE).toBe("entity_type_backfill");
  });
});
