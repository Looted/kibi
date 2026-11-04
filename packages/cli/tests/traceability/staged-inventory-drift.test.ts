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
  STAGED_STATEMENT_DRIFT_RULE,
  stagedInventoryDriftViolations,
  stagedStatementDriftViolations,
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

function drift(
  staged: string,
  base: string | null,
  stagedPaths = [PATH],
  judgeNewRequirements = true,
) {
  return stagedInventoryDriftViolations({
    stagedPaths: new Set(stagedPaths),
    snapshotEntities: [extractFromMarkdownString(staged, PATH)],
    readBase: () => base,
    judgeNewRequirements,
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

  test("leaves an unchanged statement without an inventory contract to sync", () => {
    expect(drift(plain(original), plain(original))).toEqual([]);
    expect(
      drift(
        plain(`${original}\n\n## Context\n\nWhy the total matters.`),
        plain(original),
      ),
    ).toEqual([]);
  });

  test("fails a statement edit of a requirement without an inventory", () => {
    const violations = drift(plain(edited), plain(original));
    expect(violations).toHaveLength(1);
    expect(violations[0]?.message).toContain(
      "a requirement whose statement changes",
    );
  });

  test("fails a new requirement without an inventory", () => {
    const violations = drift(plain(original), null);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe(STAGED_INVENTORY_DRIFT_RULE);
    expect(violations[0]?.message).toContain("a new requirement needs");
    expect(violations[0]?.message).toContain("kb_model mode analyze");
    expect(drift(inventoried(original), null)).toEqual([]);
  });

  test("leaves a first commit's requirements to sync's baseline", () => {
    expect(drift(plain(original), null, [PATH], false)).toEqual([]);
    // Amending a root commit: the statement differs from HEAD, but the commit
    // still has no parent.
    expect(drift(plain(edited), plain(original), [PATH], false)).toEqual([]);
    expect(
      drift(
        inventoried(original, edited),
        inventoried(original),
        [PATH],
        false,
      ),
    ).toHaveLength(1);
  });

  test("still fails a contract dropped from the staged file", () => {
    expect(drift(plain(edited), inventoried(original))).toHaveLength(1);
  });
});

function pinned(semanticText: string, body: string, status = "open"): string {
  return `---
id: REQ-checkout-total
title: Checkout total
type: req
status: ${status}
semantic_text: ${semanticText}
---

${body}
`;
}

function statementDrift(staged: string, base: string | null) {
  return stagedStatementDriftViolations({
    stagedFiles: [{ path: PATH, content: staged }],
    readBase: () => base,
  });
}

describe("staged requirement statement drift", () => {
  const original = "The checkout total stays positive for every order.";
  const edited = "The checkout total stays positive for every paid order.";

  test("fails a body edit that leaves the pinned semantic_text behind", () => {
    const violations = statementDrift(
      pinned(original, edited),
      pinned(original, original),
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe(STAGED_STATEMENT_DRIFT_RULE);
    expect(violations[0]?.entityId).toBe("REQ-checkout-total");
    expect(violations[0]?.message).toContain("pinned semantic_text did not");
    expect(violations[0]?.message).toContain("kb_model mode analyze");
  });

  test("passes when semantic_text is restated with the body", () => {
    expect(
      statementDrift(pinned(edited, edited), pinned(original, original)),
    ).toEqual([]);
  });

  test("passes context-only and whitespace-only body edits", () => {
    const withContext = `${original}\n\n## Context\n\nAdded after a billing review.`;
    expect(
      statementDrift(pinned(original, withContext), pinned(original, original)),
    ).toEqual([]);
    expect(
      statementDrift(
        pinned(original, original.replace(" stays ", "\n  stays ")),
        pinned(original, original),
      ),
    ).toEqual([]);
  });

  test("leaves unpinned, new, retired and non-requirement files alone", () => {
    expect(statementDrift(plain(edited), plain(original))).toEqual([]);
    expect(statementDrift(pinned(original, edited), null)).toEqual([]);
    expect(
      statementDrift(
        pinned(original, edited, "superseded"),
        pinned(original, original, "superseded"),
      ),
    ).toEqual([]);
    const adr = (body: string) =>
      `---\nid: ADR-checkout\ntitle: Checkout\ntype: adr\nstatus: accepted\nsemantic_text: x\n---\n\n${body}\n`;
    expect(statementDrift(adr(edited), adr(original))).toEqual([]);
    expect(
      stagedStatementDriftViolations({
        stagedFiles: [{ path: PATH }],
        readBase: () => pinned(original, original),
      }),
    ).toEqual([]);
  });
});
