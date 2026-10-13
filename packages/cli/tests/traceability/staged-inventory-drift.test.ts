// executable_for TEST-kibi-proposition-complete-ingestion
import { describe, expect, test } from "bun:test";
import { extractFromMarkdownString } from "../../src/extractors/markdown.js";
import {
  normalizeSemanticClause,
  semanticClaimKey,
} from "../../src/operations/semantic-advisor/clauses.js";
import { semanticSourceHash } from "../../src/operations/semantic-advisor/shared.js";
import {
  STAGED_INVENTORY_DRIFT_RULE,
  stagedInventoryDriftViolations,
} from "../../src/traceability/staged-inventory-drift.js";

const PATH = ".kb/requirements/REQ-checkout-total.md";

function inventoried(source: string, prose = source): string {
  const claimText = normalizeSemanticClause(source);
  const claimKey = semanticClaimKey(claimText);
  return `---
id: REQ-checkout-total
title: Checkout total
type: req
status: open
logic_claims:
  - ${claimKey}
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ${semanticSourceHash(source)}
semantic_inventory:
  - claim_key: ${claimKey}
    claim_text: ${claimText}
    role: descriptive
    status: ontology_gap
    span: {start: 0, end: ${Buffer.byteLength(claimText, "utf8")}}
---

${prose}
`;
}

function plain(prose: string): string {
  return `---
id: REQ-checkout-total
title: Checkout total
type: req
status: open
---

${prose}
`;
}

function drift(staged: string, base: string | null, stagedPaths = [PATH]) {
  return stagedInventoryDriftViolations({
    stagedPaths: new Set(stagedPaths),
    snapshotEntities: [extractFromMarkdownString(staged, PATH)],
    readBase: () => base,
  });
}

describe("staged semantic inventory drift", () => {
  const original = "The checkout total stays positive for every order.";
  const edited = "The checkout total stays positive for every paid order.";

  test("passes a requirement whose inventory matches its prose", () => {
    expect(drift(inventoried(original), inventoried(original))).toEqual([]);
  });

  test("fails a requirement whose prose changed without its inventory", () => {
    const violations = drift(
      inventoried(original, edited),
      inventoried(original),
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe(STAGED_INVENTORY_DRIFT_RULE);
    expect(violations[0]?.entityId).toBe("REQ-checkout-total");
    expect(violations[0]?.message).toContain("semantic_source_hash");
    expect(violations[0]?.message).toContain("kibi migrate");
  });

  test("judges only staged requirements", () => {
    expect(
      drift(inventoried(original, edited), inventoried(original), []),
    ).toEqual([]);
  });

  test("leaves requirements without an inventory contract to sync", () => {
    expect(drift(plain(original), plain(original))).toEqual([]);
    expect(drift(plain(edited), plain(original))).toEqual([]);
    expect(drift(plain(original), null)).toEqual([]);
  });

  test("still fails a contract dropped from the staged file", () => {
    expect(drift(plain(edited), inventoried(original))).toHaveLength(1);
  });
});
