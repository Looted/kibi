import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  CLAIM_SUBJECT_ANCHOR_ACTION_PREFIX,
  CLAIM_SUBJECT_ANCHOR_REVIEW_CODE,
  CLAIM_SUBJECT_ANCHOR_SUGGEST_CODE,
  DOMAIN_SUBJECTS_SCHEMA_VERSION,
  SUBJECT_DEFINITION_REVIEW_CODE,
  SUBJECT_DUPLICATE_REVIEW_CODE,
  applyClaimSubjectAnchor,
  planClaimSubjectAnchors,
  planSubjectDefinitionReviews,
  planSubjectDuplicateReviews,
  withClaimSubjects,
} from "../../../src/operations/migration/domain-subjects.js";
import {
  SCHEMA6_APPROVABLE_REVIEW_CODES,
  SCHEMA6_AUTOMATIC_CODES,
  applySchema6MigrationAction,
  domainSubjectActions,
} from "../../../src/operations/migration/schema6.js";

const DEFINITION =
  "The shopping cart a signed-in customer fills before checkout; it is not the saved wishlist.";

function write(root: string, relative: string, content: string): string {
  const file = path.join(root, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
  return file;
}

function subject(
  root: string,
  id: string,
  key: string,
  title: string,
  body: string,
): string {
  return write(
    root,
    `.kb/facts/${id}.md`,
    `---\nid: ${id}\ntype: fact\ntitle: ${title}\nstatus: active\nfact_kind: subject\nsubject_key: ${key}\n---\n\n${body}\n`,
  );
}

const INVENTORY = `semantic_inventory:
  - claim_key: CLAIM-CART
    claim_text: The shopping cart keeps its lines after the customer signs out
    role: normative
    status: ontology_gap
    span:
      start: 0
      end: 60
  - claim_key: CLAIM-ZEBRA
    claim_text: Zebras graze on quantum moss
    role: condition
    status: missing
  - claim_key: CLAIM-DONE
    claim_text: The shopping cart total is never negative
    role: normative
    status: modeled
  - claim_key: CLAIM-NAMED
    claim_text: The shopping cart is cleared at checkout
    role: normative
    status: ambiguous
    subjects:
      - shop.cart
`;

function requirement(root: string, id: string, status: string): string {
  return write(
    root,
    `.kb/requirements/${id}.md`,
    `---\nid: ${id}\ntype: req\ntitle: Cart lines\nstatus: ${status}\n${INVENTORY}---\n\nThe cart keeps its lines.\n`,
  );
}

const read = (file: string) => readFileSync(file, "utf8");

describe("domain subject migration", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), "kibi-domain-subjects-"));
    subject(root, "F-CART", "shop.cart", "Shopping cart", DEFINITION);
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  test("schema 16 adds the domain subject layer", () => {
    expect(DOMAIN_SUBJECTS_SCHEMA_VERSION).toBe(16);
  });

  test("plans an anchor for each unmodeled claim of a current requirement that names no subject", () => {
    requirement(root, "REQ-CART", "open");
    requirement(root, "REQ-OLD", "superseded");
    const plans = planClaimSubjectAnchors(root);
    expect(
      plans.map((plan) => [
        plan.requirementId,
        plan.claimKey,
        plan.candidates.map((candidate) => candidate.subjectKey),
      ]),
    ).toEqual([
      ["REQ-CART", "CLAIM-CART", ["shop.cart"]],
      ["REQ-CART", "CLAIM-ZEBRA", []],
    ]);
    expect(plans[0]?.path).toBe(".kb/requirements/REQ-CART.md");
  });

  test("an approved anchor inserts only the subjects lines of that entry", () => {
    const file = requirement(root, "REQ-CART", "open");
    const before = read(file);
    applyClaimSubjectAnchor(root, ".kb/requirements/REQ-CART.md", "CLAIM-CART", [
      "shop.cart",
    ]);
    const after = read(file);
    expect(after).toBe(
      before.replace(
        "      end: 60\n",
        "      end: 60\n    subjects:\n      - shop.cart\n",
      ),
    );
    expect(() =>
      applyClaimSubjectAnchor(root, ".kb/requirements/REQ-CART.md", "CLAIM-CART", [
        "shop.cart",
      ]),
    ).toThrow("already names subjects");
    expect(() =>
      applyClaimSubjectAnchor(root, ".kb/requirements/REQ-CART.md", "CLAIM-GONE", [
        "shop.cart",
      ]),
    ).toThrow("no inventory entry has claim_key CLAIM-GONE");
    expect(() =>
      applyClaimSubjectAnchor(root, ".kb/requirements/REQ-CART.md", "CLAIM-ZEBRA", []),
    ).toThrow("no subject to anchor");
    expect(() =>
      applyClaimSubjectAnchor(root, ".kb/requirements/REQ-NONE.md", "CLAIM-CART", [
        "shop.cart",
      ]),
    ).toThrow("cannot be read");
    expect(() => withClaimSubjects("no front matter", "CLAIM-CART", ["x"])).toThrow(
      "no front matter",
    );
  });

  test("an anchor is added after the last field of an entry that ends the front matter", () => {
    const content = `---\nid: REQ-X\nsemantic_inventory:\n  - claim_key: 'CLAIM-X'\n    claim_text: The cart\n    status: missing\n---\nBody\n`;
    expect(withClaimSubjects(content, "CLAIM-X", ["shop.cart", "shop"])).toBe(
      `---\nid: REQ-X\nsemantic_inventory:\n  - claim_key: 'CLAIM-X'\n    claim_text: The cart\n    status: missing\n    subjects:\n      - shop.cart\n      - shop\n---\nBody\n`,
    );
  });

  test("lists subjects without a definition and subjects that read as one", () => {
    subject(root, "F-THIN", "shop.thin", "Thin", "Too short.");
    subject(root, "F-CART2", "shop_cart", "Shopping cart", `${DEFINITION} Again.`);
    expect(
      planSubjectDefinitionReviews(root).map((row) => [row.id, row.reason]),
    ).toEqual([["F-THIN", "too_short"]]);
    expect(
      planSubjectDuplicateReviews(root).map((pair) => [pair.left.id, pair.right.id]),
    ).toEqual([["F-CART", "F-CART2"]]);
  });

  test("template definitions are listed for review", () => {
    const template = (key: string) =>
      `The ${key} component, as the structural requirements that name it constrain it.`;
    subject(root, "F-A", "kibi.alpha", "kibi.alpha", template("kibi.alpha"));
    subject(root, "F-B", "kibi.beta", "kibi.beta", template("kibi.beta"));
    subject(root, "F-C", "kibi.gamma", "kibi.gamma", template("kibi.gamma"));
    expect(
      planSubjectDefinitionReviews(root).map((row) => [row.id, row.reason]),
    ).toEqual([
      ["F-A", "template"],
      ["F-B", "template"],
      ["F-C", "template"],
    ]);
  });

  test("migration actions: anchor suggestions are approvable by id, the rest are reviews", async () => {
    const file = requirement(root, "REQ-CART", "open");
    subject(root, "F-THIN", "shop.thin", "Thin", "Too short.");
    subject(root, "F-BAG", "store.bag", "Bag", DEFINITION.replace("cart", "bag"));
    subject(root, "F-BAG2", "store_bag", "Bag", `${DEFINITION} Again.`);
    const actions = domainSubjectActions(root);
    expect(actions.map((action) => [action.id, action.code])).toEqual([
      [
        `${CLAIM_SUBJECT_ANCHOR_ACTION_PREFIX}REQ-CART-CLAIM-CART`,
        CLAIM_SUBJECT_ANCHOR_SUGGEST_CODE,
      ],
      [
        `${CLAIM_SUBJECT_ANCHOR_ACTION_PREFIX}REQ-CART-CLAIM-ZEBRA`,
        CLAIM_SUBJECT_ANCHOR_REVIEW_CODE,
      ],
      ["subject-definition-F-THIN", SUBJECT_DEFINITION_REVIEW_CODE],
      ["subject-duplicate-F-BAG-F-BAG2", SUBJECT_DUPLICATE_REVIEW_CODE],
    ]);
    for (const action of actions) {
      expect(action.autoApplicable).toBe(false);
      expect(SCHEMA6_AUTOMATIC_CODES.has(action.code)).toBe(false);
    }
    expect(SCHEMA6_APPROVABLE_REVIEW_CODES.has(CLAIM_SUBJECT_ANCHOR_SUGGEST_CODE)).toBe(
      true,
    );
    for (const code of [
      CLAIM_SUBJECT_ANCHOR_REVIEW_CODE,
      SUBJECT_DEFINITION_REVIEW_CODE,
      SUBJECT_DUPLICATE_REVIEW_CODE,
    ])
      expect(SCHEMA6_APPROVABLE_REVIEW_CODES.has(code)).toBe(false);
    const [suggest, manual] = actions;
    expect(suggest?.evidence).toMatchObject({
      claimKey: "CLAIM-CART",
      subjects: ["shop.cart"],
    });
    expect(suggest?.invocation.kind).toBe("cli");
    expect(manual?.invocation.kind).toBe("review");
    await applySchema6MigrationAction(suggest as never, {
      workspaceRoot: root,
    } as never);
    expect(read(file)).toContain("    subjects:\n      - shop.cart\n");
    expect(
      domainSubjectActions(root).some((action) => action.id === suggest?.id),
    ).toBe(false);
  });

  test("a tie between the best subjects is a review, not a suggestion", () => {
    requirement(root, "REQ-CART", "open");
    subject(root, "F-CART2", "shop_cart", "Shopping cart", `${DEFINITION} Again.`);
    const [tie] = domainSubjectActions(root);
    expect(tie?.code).toBe(CLAIM_SUBJECT_ANCHOR_REVIEW_CODE);
    expect(tie?.evidence.subjects).toBeUndefined();
    expect(String(tie?.evidence.choice)).toContain("equally");
  });

  test("an anchor action without a claim or subjects is refused", async () => {
    requirement(root, "REQ-CART", "open");
    const [suggest] = domainSubjectActions(root);
    await expect(
      applySchema6MigrationAction(
        { ...suggest, evidence: { claimKey: "CLAIM-CART" } } as never,
        { workspaceRoot: root } as never,
      ),
    ).rejects.toThrow("names no file, claim or subject");
  });
});
