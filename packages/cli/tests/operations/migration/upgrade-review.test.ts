import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import * as sync from "../../../src/commands/sync.js";
import {
  UPGRADE_REVIEW_RULES,
  describeFindingCounts,
  domainSubjectReviewNote,
  hasDomainSubjectReview,
  planDomainSubjectReview,
  readUpgradeReviewFindings,
  syncMigratedStore,
  upgradeReviewSummary,
} from "../../../src/operations/migration/upgrade-review.js";
import * as runtimeTypes from "../../../src/public/operations/runtime-types.js";
import { checkSpec } from "../../../src/public/operations/specs/check.js";

const restores: Array<() => void> = [];
afterEach(() => {
  for (const restore of restores.splice(0)) restore();
});

const NONE = {
  anchorSuggestions: 0,
  anchorReviews: 0,
  definitions: 0,
  duplicates: 0,
  hierarchy: 0,
};

describe("domain subject review counts", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), "kibi-upgrade-review-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  const write = (relative: string, content: string) => {
    const file = path.join(root, relative);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  };
  const subject = (id: string, key: string, title: string, body: string) =>
    write(
      `.kb/facts/${id}.md`,
      `---\nid: ${id}\ntype: fact\ntitle: ${title}\nstatus: active\nfact_kind: subject\nsubject_key: ${key}\n---\n\n${body}\n`,
    );
  const DEFINITION =
    "The shopping cart a signed-in customer fills before checkout; it is not the saved wishlist.";

  test("counts each kind of review action kibi migrate lists", () => {
    subject("F-CART", "shop.cart", "Shopping cart", DEFINITION);
    subject("F-CART2", "shop_carts", "Shopping cart", `${DEFINITION} Again.`);
    subject("F-THIN", "shop.thin", "Thin", "");
    write(
      ".kb/facts/F-LOOP.md",
      "---\nid: F-LOOP\ntype: fact\ntitle: Ledger\nstatus: active\nfact_kind: subject\nsubject_key: books.ledger\npart_of:\n  - books.ledger\n---\n\nThe ledger is the record of every posted entry in the accounting books; it is not the draft journal.\n",
    );
    write(
      ".kb/requirements/REQ-C.md",
      "---\nid: REQ-C\ntype: req\ntitle: C\nstatus: open\nsemantic_inventory:\n  - claim_key: C1\n    claim_text: Zebras graze on quantum moss\n    role: normative\n    status: missing\n---\n\nC.\n",
    );
    expect(planDomainSubjectReview(root)).toEqual({
      anchorSuggestions: 0,
      anchorReviews: 1,
      definitions: 1,
      duplicates: 1,
      hierarchy: 1,
    });
    // A subject the upgrade fills with the not-stated note is no review.
    expect(planDomainSubjectReview(root, new Set(["F-THIN"]))).toEqual({
      anchorSuggestions: 0,
      anchorReviews: 1,
      definitions: 0,
      duplicates: 1,
      hierarchy: 1,
    });
    write(
      ".kb/requirements/REQ-D.md",
      "---\nid: REQ-D\ntype: req\ntitle: D\nstatus: open\nsemantic_inventory:\n  - claim_key: D1\n    claim_text: The checkout page lists the shop cart lines\n    role: normative\n    status: missing\n---\n\nD.\n",
    );
    rmSync(path.join(root, ".kb/facts/F-CART2.md"));
    expect(planDomainSubjectReview(root).anchorSuggestions).toBe(1);
  });
});

describe("the review note and summary", () => {
  test("a review with nothing in it has no note", () => {
    expect(hasDomainSubjectReview(NONE)).toBe(false);
    expect(domainSubjectReviewNote(NONE, false)).toBeNull();
    expect(
      domainSubjectReviewNote({ ...NONE, hierarchy: 1 }, false),
    ).toStartWith("Schema 16 review: 1 subject hierarchy problem(s)");
    for (const key of Object.keys(NONE))
      expect(hasDomainSubjectReview({ ...NONE, [key]: 1 })).toBe(true);
  });

  test("names each count and its action code", () => {
    expect(
      domainSubjectReviewNote(
        {
          anchorSuggestions: 2,
          anchorReviews: 1,
          definitions: 3,
          duplicates: 4,
          hierarchy: 5,
        },
        true,
      ),
    ).toBe(
      "dry run: Schema 16 review: 3 unmodeled claim(s) name no subject (claim-subject-missing): 2 with a suggested subject a person approves by id (claim_subject_anchor_suggest), 1 for a person to anchor by hand (claim_subject_anchor_review); 3 subject fact(s) need a definition as their body (subject-definition-missing; subject_definition_review); 4 pair(s) of subject facts read as one subject (subject-duplicate; subject_duplicate_review); 5 subject hierarchy problem(s): a subject names itself, or subjects sit under each other through part_of, kind_of or dotted keys (subject-hierarchy-invalid; subject_hierarchy_review). Kibi writes none of these on its own; 'kibi migrate' lists each action, and kibi check blocks them until they are fixed.",
    );
    expect(domainSubjectReviewNote({ ...NONE, anchorReviews: 1 }, false)).toBe(
      "Schema 16 review: 1 unmodeled claim(s) name no subject (claim-subject-missing): 0 with a suggested subject a person approves by id (claim_subject_anchor_suggest), 1 for a person to anchor by hand (claim_subject_anchor_review). Kibi writes none of these on its own; 'kibi migrate' lists each action, and kibi check blocks them until they are fixed.",
    );
    expect(
      domainSubjectReviewNote({ ...NONE, duplicates: 1 }, false),
    ).toStartWith(
      "Schema 16 review: 1 pair(s) of subject facts read as one subject",
    );
  });

  test("counts findings largest first, ties by rule", () => {
    expect(
      describeFindingCounts(
        new Map([
          ["b-rule", 2],
          ["a-rule", 2],
          ["c-rule", 5],
        ]),
      ),
    ).toBe("5 c-rule, 2 a-rule, 2 b-rule");
  });

  test("the summary reads the checked findings, else the planned review", () => {
    expect(
      upgradeReviewSummary(new Map(), { ...NONE, definitions: 1 }, 3),
    ).toBeNull();
    expect(
      upgradeReviewSummary(new Map([["claim-subject-missing", 2]]), NONE, 0),
    ).toBe(
      "Schema upgrade applied, but review work remains: kibi check reports 2 blocking finding(s) the upgrade does not fix (2 claim-subject-missing). Run 'kibi migrate' to list the review actions; approve a suggested subject with 'kibi migrate --apply-safe <plan hash> --approved-action <id>', write definitions, subjects and pair_reviews verdicts by hand, then run kibi check.",
    );
    expect(upgradeReviewSummary(null, NONE, 0)).toBeNull();
    expect(
      upgradeReviewSummary(null, { ...NONE, duplicates: 1 }, 0),
    ).toStartWith(
      "Schema upgrade applied, but review work remains: the domain subject review above. Run kibi sync, then kibi check to list the findings.",
    );
    expect(upgradeReviewSummary(null, NONE, 4)).toStartWith(
      "Schema upgrade applied, but review work remains: the domain subject review above and the related-requirement-unmodeled pairs of 4 requirement(s). Run kibi sync",
    );
  });
});

describe("syncing and checking the migrated store", () => {
  test("a sync that succeeds, fails or throws", async () => {
    const calls: unknown[] = [];
    let outcome: unknown = { success: true, failures: [] };
    const spy = spyOn(sync, "syncCommand").mockImplementation((async (
      options: unknown,
    ) => {
      calls.push(options);
      if (outcome instanceof Error) throw outcome;
      return outcome;
    }) as never);
    restores.push(() => spy.mockRestore());
    expect(await syncMigratedStore("/w")).toEqual({ ok: true });
    expect(calls).toEqual([{ workspaceRoot: "/w", quiet: true }]);
    outcome = {
      success: false,
      failures: [{ message: "a" }, { message: "b" }],
    };
    expect(await syncMigratedStore("/w")).toEqual({
      ok: false,
      reason: "a; b",
    });
    outcome = { success: false, failures: [] };
    expect(await syncMigratedStore("/w")).toEqual({
      ok: false,
      reason: "kibi sync reported a failure",
    });
    outcome = new Error("locked\nstack");
    expect(await syncMigratedStore("/w")).toEqual({
      ok: false,
      reason: "locked",
    });
  });

  test("counts the schema 15-18 findings by rule", async () => {
    const calls: unknown[][] = [];
    let result: unknown = {
      structuredContent: {
        violations: [
          { rule: "claim-subject-missing" },
          { rule: "claim-subject-missing" },
          { rule: "evidence-floor" },
        ],
      },
    };
    const spy = spyOn(runtimeTypes, "executeOperation").mockImplementation(
      (async (...args: unknown[]) => {
        calls.push(args);
        if (result instanceof Error) throw result;
        return result;
      }) as never,
    );
    restores.push(() => spy.mockRestore());
    expect(await readUpgradeReviewFindings("/w")).toEqual(
      new Map([
        ["claim-subject-missing", 2],
        ["evidence-floor", 1],
      ]),
    );
    expect(calls[0]?.[1]).toBe(checkSpec);
    expect(calls[0]?.[2]).toEqual({ rules: [...UPGRADE_REVIEW_RULES] });
    result = {};
    expect(await readUpgradeReviewFindings("/w")).toBeNull();
    result = new Error("no engine");
    expect(await readUpgradeReviewFindings("/w")).toBeNull();
    expect(UPGRADE_REVIEW_RULES).toEqual([
      "evidence-floor",
      "claim-subject-missing",
      "claim-subject-undefined",
      "subject-definition-missing",
      "subject-duplicate",
      "subject-hierarchy-invalid",
      "must-positive-scenario",
      "related-requirement-unmodeled",
    ]);
  });
});
