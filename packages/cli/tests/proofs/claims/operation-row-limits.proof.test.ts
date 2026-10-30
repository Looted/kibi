import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { ENTITY_ROW_BATCH_LIMIT } from "../../../src/public/operations/discovery-entities.js";

// implements REQ-kibi-operation-row-limits

/**
 * The entity row batch limit. Kibi reads every constant itself at ingest, so the certificate is checked against the code.
 */

/** An entity row batch shall hold at most 200 rows. */
export function entityRowBatchLimitCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-entity-row-batch-limit",
    variable: "row_batch_limit",
    valueType: "int",
    assumptions: [{ operator: "eq", value: ENTITY_ROW_BATCH_LIMIT }],
    claim: { operator: "eq", value: 200 },
  });
}

describe("Entity row batch limit", () => {
  test("An entity row batch shall hold at most 200 rows", () => {
    writeCodeCertificate(entityRowBatchLimitCertificate());
    expect(ENTITY_ROW_BATCH_LIMIT).toBe(200);
  });
});
