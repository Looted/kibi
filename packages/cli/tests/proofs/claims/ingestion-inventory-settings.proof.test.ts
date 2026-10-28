import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { SEMANTIC_INVENTORY_VERSION } from "../../../src/operations/semantic-advisor/shared.js";
import { STAGED_INVENTORY_DRIFT_RULE } from "../../../src/traceability/staged-inventory-drift.js";
import {
  SYNC_CACHE_TTL_MS,
  SYNC_CACHE_VERSION,
} from "../../../src/commands/sync/cache.js";

// implements REQ-ingestion-inventory-settings

/**
 * The semantic inventory version, its drift rule and the sync cache bounds. Kibi reads every constant itself at ingest, so the certificate is checked against the code.
 */

/** The semantic inventory version shall be kibi.semantic-inventory.v1. */
export function semanticInventoryVersionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-semantic-inventory-version",
    symbolId: "SYM-semantic-inventory-version",
    value: SEMANTIC_INVENTORY_VERSION,
  });
}

/** The staged inventory drift rule shall be semantic-inventory-drift. */
export function inventoryDriftRuleCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-inventory-drift-rule",
    symbolId: "SYM-staged-inventory-drift-STAGED_INVENTORY_DRIFT_RULE",
    value: STAGED_INVENTORY_DRIFT_RULE,
  });
}

/** The sync cache version shall be 2. */
export function syncCacheVersionCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-sync-cache-version",
    variable: "cache_version",
    valueType: "int",
    assumptions: [{ operator: "eq", value: SYNC_CACHE_VERSION }],
    claim: { operator: "eq", value: 2 },
  });
}

/** A sync cache entry shall live at most 2592000000 milliseconds. */
export function syncCacheTtlCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-sync-cache-ttl",
    variable: "cache_ttl_ms",
    valueType: "int",
    assumptions: [{ operator: "eq", value: SYNC_CACHE_TTL_MS }],
    claim: { operator: "eq", value: 2592000000 },
  });
}

describe("Semantic inventory and sync cache settings", () => {
  test("The semantic inventory version shall be kibi.semantic-inventory.v1", () => {
    writeCodeCertificate(semanticInventoryVersionCertificate());
    expect(SEMANTIC_INVENTORY_VERSION).toBe("kibi.semantic-inventory.v1");
  });

  test("The staged inventory drift rule shall be semantic-inventory-drift", () => {
    writeCodeCertificate(inventoryDriftRuleCertificate());
    expect(STAGED_INVENTORY_DRIFT_RULE).toBe("semantic-inventory-drift");
  });

  test("The sync cache version shall be 2", () => {
    writeCodeCertificate(syncCacheVersionCertificate());
    expect(SYNC_CACHE_VERSION).toBe(2);
  });

  test("A sync cache entry shall live at most 2592000000 milliseconds", () => {
    writeCodeCertificate(syncCacheTtlCertificate());
    expect(SYNC_CACHE_TTL_MS).toBe(2592000000);
  });
});
