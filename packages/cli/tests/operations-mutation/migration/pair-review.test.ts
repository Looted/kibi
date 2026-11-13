import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  pairReviewNote,
  planPairReviewCandidates,
} from "../../../src/operations/migration/pair-review.js";

describe("schema 18 pair review candidates", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), "kibi-pair-review-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  function requirement(id: string, extra: string): void {
    const file = path.join(root, ".kb", "requirements", `${id}.md`);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(
      file,
      `---\nid: ${id}\ntype: req\ntitle: ${id}\nstatus: open\n${extra}\n---\n\nBody.\n`,
    );
  }

  const entry = (status: string, role: string) =>
    `  - claim_key: CLAIM-${status}-${role}\n    role: ${role}\n    status: ${status}`;

  test("count current requirements with an unmodeled rule claim", () => {
    requirement(
      "REQ-GAP",
      `semantic_inventory:\n${entry("ontology_gap", "normative")}`,
    );
    requirement(
      "REQ-AMBIGUOUS",
      `semantic_inventory:\n${entry("ambiguous", "condition")}`,
    );
    requirement(
      "REQ-MISSING",
      `semantic_inventory:\n${entry("missing", "descriptive")}`,
    );
    requirement(
      "REQ-DESCRIPTIVE",
      `semantic_inventory:\n${entry("ontology_gap", "descriptive")}`,
    );
    requirement(
      "REQ-MODELED",
      `semantic_inventory:\n${entry("modeled", "normative")}`,
    );
    requirement("REQ-NO-LEDGER", "priority: must");
    requirement("REQ-ODD", "semantic_inventory:\n  - plain\n  - status: 3");
    requirement(
      "REQ-OLD",
      `semantic_inventory:\n${entry("missing", "normative")}`,
    );
    requirement("REQ-NEW", "links:\n  - type: supersedes\n    target: REQ-OLD");
    expect(planPairReviewCandidates(root)).toEqual([
      "REQ-AMBIGUOUS",
      "REQ-GAP",
      "REQ-MISSING",
    ]);
  });

  test("word the note for a dry run and for the upgrade", () => {
    expect(pairReviewNote(2, true)).toStartWith(
      "dry run: Schema 18: related-requirement-unmodeled now blocks",
    );
    expect(pairReviewNote(2, false)).toStartWith(
      "Schema 18: related-requirement-unmodeled now blocks",
    );
    expect(pairReviewNote(2, false)).toContain(
      "2 current requirement(s) have such claims",
    );
    expect(pairReviewNote(2, false)).toContain(
      "one finding per requirement naming the requirements it pairs with",
    );
  });
});
