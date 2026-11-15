import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { load as loadYaml } from "js-yaml";
import {
  CLAIM_SUBJECT_ANCHOR_ACTION_PREFIX,
  CLAIM_SUBJECT_ANCHOR_REVIEW_CODE,
  CLAIM_SUBJECT_ANCHOR_SUGGEST_CODE,
  DOMAIN_SUBJECTS_SCHEMA_VERSION,
  SUBJECT_DEFINITION_NOT_STATED_ACTION_ID,
  SUBJECT_DEFINITION_NOT_STATED_CODE,
  SUBJECT_DEFINITION_REVIEW_CODE,
  SUBJECT_DUPLICATE_REVIEW_CODE,
  SUBJECT_HIERARCHY_REVIEW_CODE,
  applyClaimSubjectAnchor,
  applySubjectDefinitionPlaceholders,
  claimWords,
  isStrongSubjectMatch,
  planClaimSubjectAnchors,
  planSubjectDefinitionPlaceholders,
  planSubjectDefinitionReviews,
  planSubjectDuplicateReviews,
  withClaimSubjects,
  withNotStatedBody,
} from "../../../src/operations/migration/domain-subjects.js";
import * as kbSources from "../../../src/operations/migration/kb-sources.js";
import {
  SCHEMA6_APPROVABLE_REVIEW_CODES,
  SCHEMA6_AUTOMATIC_CODES,
  applySchema6MigrationAction,
  buildSchema6MigrationFragment,
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
    applyClaimSubjectAnchor(
      root,
      ".kb/requirements/REQ-CART.md",
      "CLAIM-CART",
      ["shop.cart"],
    );
    const after = read(file);
    expect(after).toBe(
      before.replace(
        "      end: 60\n",
        "      end: 60\n    subjects:\n      - shop.cart\n",
      ),
    );
    expect(() =>
      applyClaimSubjectAnchor(
        root,
        ".kb/requirements/REQ-CART.md",
        "CLAIM-CART",
        ["shop.cart"],
      ),
    ).toThrow("already names subjects");
    expect(() =>
      applyClaimSubjectAnchor(
        root,
        ".kb/requirements/REQ-CART.md",
        "CLAIM-GONE",
        ["shop.cart"],
      ),
    ).toThrow("no inventory entry has claim_key CLAIM-GONE");
    expect(() =>
      applyClaimSubjectAnchor(
        root,
        ".kb/requirements/REQ-CART.md",
        "CLAIM-ZEBRA",
        [],
      ),
    ).toThrow("no subject to anchor");
    expect(() =>
      applyClaimSubjectAnchor(
        root,
        ".kb/requirements/REQ-NONE.md",
        "CLAIM-CART",
        ["shop.cart"],
      ),
    ).toThrow("cannot be read");
    expect(() =>
      withClaimSubjects("no front matter", "CLAIM-CART", ["x"]),
    ).toThrow("no front matter");
  });

  test("an anchor is added after the last field of an entry that ends the front matter", () => {
    const content = `---\nid: REQ-X\nsemantic_inventory:\n  - claim_key: 'CLAIM-X'\n    claim_text: The cart\n    status: missing\n---\nBody\n`;
    expect(withClaimSubjects(content, "CLAIM-X", ["shop.cart", "shop"])).toBe(
      `---\nid: REQ-X\nsemantic_inventory:\n  - claim_key: 'CLAIM-X'\n    claim_text: The cart\n    status: missing\n    subjects:\n      - shop.cart\n      - shop\n---\nBody\n`,
    );
  });

  test("lists subjects without a definition and subjects that read as one", () => {
    subject(root, "F-THIN", "shop.thin", "Thin", "Too short.");
    subject(
      root,
      "F-CART2",
      "shop_cart",
      "Shopping cart",
      `${DEFINITION} Again.`,
    );
    expect(
      planSubjectDefinitionReviews(root).map((row) => [row.id, row.reason]),
    ).toEqual([["F-THIN", "too_short"]]);
    expect(
      planSubjectDuplicateReviews(root).map((pair) => [
        pair.left.id,
        pair.right.id,
      ]),
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
    subject(
      root,
      "F-BAG",
      "store.bag",
      "Bag",
      DEFINITION.replace("cart", "bag"),
    );
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
    expect(
      SCHEMA6_APPROVABLE_REVIEW_CODES.has(CLAIM_SUBJECT_ANCHOR_SUGGEST_CODE),
    ).toBe(true);
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
    await applySchema6MigrationAction(
      suggest as never,
      {
        workspaceRoot: root,
      } as never,
    );
    expect(read(file)).toContain("    subjects:\n      - shop.cart\n");
    expect(
      domainSubjectActions(root).some((action) => action.id === suggest?.id),
    ).toBe(false);
  });

  test("a tie between the best subjects is a review, not a suggestion", () => {
    requirement(root, "REQ-CART", "open");
    subject(
      root,
      "F-CART2",
      "shop_cart",
      "Shopping cart",
      `${DEFINITION} Again.`,
    );
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

  test("an anchor keeps CRLF line breaks and a byte order mark", () => {
    const content =
      "\uFEFF---\r\nid: REQ-X\r\nsemantic_inventory:\r\n  - claim_key: CLAIM-X\r\n    status: missing\r\n---\r\nBody\r\n";
    expect(withClaimSubjects(content, "CLAIM-X", ["shop.cart"])).toBe(
      "\uFEFF---\r\nid: REQ-X\r\nsemantic_inventory:\r\n  - claim_key: CLAIM-X\r\n    status: missing\r\n    subjects:\r\n      - shop.cart\r\n---\r\nBody\r\n",
    );
  });

  test("an anchor finds an entry whose claim_key is not first or carries a comment, and skips blank lines inside a block scalar", () => {
    const content =
      "---\nid: R\nsemantic_inventory:\n  # the claims\n  - role: normative\n    claim_text: |\n      line one\n\n      line two\n    claim_key: C1 # trailing\n    status: missing\n\n  # next\n  - claim_key: C2\n    status: missing\nother: 1\n---\nbody\n";
    expect(withClaimSubjects(content, "C1", ["x.y"])).toBe(
      content.replace(
        "    status: missing\n\n",
        "    status: missing\n    subjects:\n      - x.y\n\n",
      ),
    );
    expect(withClaimSubjects(content, "C2", ["x.y"])).toBe(
      content.replace(
        "  - claim_key: C2\n    status: missing\n",
        "  - claim_key: C2\n    status: missing\n    subjects:\n      - x.y\n",
      ),
    );
  });

  test("an anchor reads an item whose fields start on the line after its dash", () => {
    const content =
      "---\nsemantic_inventory:\n-\n  claim_key: C1\n  status: missing\nid: R\n---\n";
    expect(withClaimSubjects(content, "C1", ["x.y"])).toBe(
      content.replace(
        "  status: missing\n",
        "  status: missing\n  subjects:\n    - x.y\n",
      ),
    );
  });

  test("subject keys YAML would read as something else are quoted", () => {
    const content =
      "---\nsemantic_inventory:\n  - claim_key: C1\n    status: missing\n---\n";
    const next = withClaimSubjects(content, "C1", [
      "a: b",
      "#x",
      "plain.key",
      "yes",
    ]);
    expect(next).toContain('      - "a: b"\n      - "#x"\n      - plain.key\n');
    const [, front] = next.split("---\n");
    expect(
      (
        loadYaml(front as string) as {
          semantic_inventory: { subjects: string[] }[];
        }
      ).semantic_inventory[0]?.subjects,
    ).toEqual(["a: b", "#x", "plain.key", "yes"]);
  });

  test("an anchor that would change anything but subjects, or an entry it cannot place, is refused", () => {
    const refuse = (content: string, message: string) =>
      expect(() => withClaimSubjects(content, "C1", ["x.y"])).toThrow(message);
    refuse(
      "---\nsemantic_inventory:\n  - claim_key: C1\n    claim_text: |+\n      keep\n\n  - claim_key: C2\n---\n",
      "would change more than its subjects",
    );
    refuse(
      "---\nsemantic_inventory: [{claim_key: C1}]\n---\n",
      "is not written as a block sequence item",
    );
    refuse(
      "---\nsemantic_inventory:\n  - {claim_key: C1}\n---\n",
      "written in flow style",
    );
    refuse(
      "---\nsemantic_inventory:\n  - claim_key: C1\n    subjects: []\n---\n",
      "has an empty subjects list",
    );
    refuse("---\nid: [\n---\n", "the front matter does not parse");
    refuse("---\nid: R\n---\n", "no inventory entry has claim_key C1");
  });

  test("identifiers in a claim read as their parts", () => {
    expect(
      claimWords("The exportCsv and HTMLParser use snake_case.names"),
    ).toBe("The export Csv and HTML Parser use snake case names");
  });

  test("a subject matches strongly by its whole key, its subject phrase or two shared words", () => {
    const login = { subjectKey: "auth.login", title: "Login subject" };
    const csv = { subjectKey: "export.csv", title: "CSV export subject" };
    expect(
      isStrongSubjectMatch(
        "The login function must reject short passwords",
        login,
      ),
    ).toBe(true);
    expect(
      isStrongSubjectMatch("The exportCsv function should join cells", csv),
    ).toBe(true);
    expect(
      isStrongSubjectMatch("Login attempts must be rate limited", login),
    ).toBe(true);
    expect(
      isStrongSubjectMatch("Users sign in and auth checks the login", login),
    ).toBe(true);
    // One incidental word after the claim's verb is not enough.
    expect(
      isStrongSubjectMatch(
        "Exported files must be encoded as UTF-8 so that every login name survives",
        login,
      ),
    ).toBe(false);
    expect(
      isStrongSubjectMatch("Nothing about it", { subjectKey: "the" }),
    ).toBe(false);
  });

  test("a weak match or a subject without a definition is listed for review, not suggested", () => {
    write(
      root,
      ".kb/requirements/REQ-W.md",
      "---\nid: REQ-W\ntype: req\ntitle: W\nstatus: open\nsemantic_inventory:\n  - claim_key: C-WEAK\n    claim_text: Every receipt keeps the shopping total\n    role: normative\n    status: missing\n  - claim_key: C-THIN\n    claim_text: The basket must hold ten lines\n    role: normative\n    status: missing\n---\n\nW.\n",
    );
    subject(root, "F-BASKET", "shop.basket", "Basket", "Too short.");
    const plans = planClaimSubjectAnchors(root);
    expect(plans.map((plan) => plan.candidates[0])).toEqual([
      expect.objectContaining({
        subjectKey: "shop.basket",
        strong: true,
        defined: false,
      }),
      expect.objectContaining({
        subjectKey: "shop.cart",
        strong: false,
        defined: true,
      }),
    ]);
    const actions = domainSubjectActions(root).filter((action) =>
      action.id.startsWith(CLAIM_SUBJECT_ANCHOR_ACTION_PREFIX),
    );
    expect(actions.map((action) => action.code)).toEqual([
      CLAIM_SUBJECT_ANCHOR_REVIEW_CODE,
      CLAIM_SUBJECT_ANCHOR_REVIEW_CODE,
    ]);
    expect(String(actions[0]?.evidence.choice)).toContain(
      "The closest subject, shop.basket, has no definition yet",
    );
    expect(String(actions[1]?.evidence.choice)).toContain(
      "shares only one incidental word with shop.cart",
    );
    expect(actions[0]?.postconditions).toEqual([
      {
        rule: "claim-subject-missing",
        entityId: "REQ-W",
        claimKey: "C-THIN",
        findings: 0,
      },
    ]);
    for (const action of actions)
      expect(String(action.evidence.choice)).toContain(
        "related-requirement-unmodeled",
      );
  });

  test("a weak match that is the only candidate is still a review", () => {
    write(
      root,
      ".kb/requirements/REQ-W.md",
      "---\nid: REQ-W\ntype: req\ntitle: W\nstatus: open\nsemantic_inventory:\n  - claim_key: C-WEAK\n    claim_text: Every receipt keeps the shopping total\n    role: normative\n    status: missing\n---\n\nW.\n",
    );
    const [weak] = domainSubjectActions(root);
    expect(weak?.evidence.candidates).toHaveLength(1);
    expect(String(weak?.evidence.choice)).toStartWith(
      "The claim shares only one incidental word with shop.cart",
    );
  });

  test("a suggestion says that anchoring pairs the claim with the other requirements on its subject", () => {
    requirement(root, "REQ-CART", "open");
    const [suggest] = domainSubjectActions(root);
    expect(suggest?.code).toBe(CLAIM_SUBJECT_ANCHOR_SUGGEST_CODE);
    expect(String(suggest?.evidence.choice)).toContain(
      "it clears claim-subject-missing for this claim only",
    );
    expect(String(suggest?.evidence.choice)).toContain(
      "related-requirement-unmodeled",
    );
    expect(String(domainSubjectActions(root)[1]?.evidence.choice)).toContain(
      "No defined subject matches",
    );
  });

  describe("subject facts without a body", () => {
    const bare = (id: string, key: string, body = "") =>
      write(
        root,
        `.kb/facts/${id}.md`,
        `---\nid: ${id}\ntype: fact\ntitle: ${key}\nstatus: active\nfact_kind: subject\nsubject_key: ${key}\n---\n${body}`,
      );

    test("get the not-stated note, naming the requirements that constrain them", () => {
      bare("F-EMPTY", "shop.empty", "\n  \n");
      bare("F-LINKED", "shop.linked");
      bare("F-SHORT", "shop.short", "Short.\n");
      write(
        root,
        ".kb/requirements/REQ-L.md",
        "---\nid: REQ-L\ntype: req\ntitle: L\nstatus: open\nlinks:\n  - type: constrains\n    target: F-LINKED\n  - type: relates_to\n    target: F-EMPTY\n  - bogus\n---\n\nL.\n",
      );
      write(
        root,
        ".kb/relationships/ab.yaml",
        "relationships:\n  - id: rel-1\n    type: constrains\n    from: REQ-B\n    to: F-LINKED\n    created_at: '2026-01-01T00:00:00Z'\n    created_by: test\n    source: test\n",
      );
      const plan = planSubjectDefinitionPlaceholders(root);
      expect(plan.map((row) => [row.id, row.body])).toEqual([
        [
          "F-EMPTY",
          "Definition not stated: the subject shop.empty is named by the subject fact F-EMPTY, recorded before KB schema 16 without a definition. The people who own that source can say what it is in the product and what it is not.\n",
        ],
        [
          "F-LINKED",
          expect.stringContaining(
            "is named by requirements REQ-B, REQ-L, which link to the subject fact F-LINKED through constrains.",
          ),
        ],
      ]);
      const result = applySubjectDefinitionPlaceholders(root);
      expect(result.written.map((row) => row.id)).toEqual([
        "F-EMPTY",
        "F-LINKED",
      ]);
      expect(read(path.join(root, ".kb/facts/F-EMPTY.md"))).toEndWith(
        "subject_key: shop.empty\n---\n\nDefinition not stated: the subject shop.empty is named by the subject fact F-EMPTY, recorded before KB schema 16 without a definition. The people who own that source can say what it is in the product and what it is not.\n",
      );
      expect(read(path.join(root, ".kb/facts/F-SHORT.md"))).toEndWith(
        "Short.\n",
      );
      expect(planSubjectDefinitionReviews(root).map((row) => row.id)).toEqual([
        "F-SHORT",
      ]);
      expect(planSubjectDefinitionPlaceholders(root)).toEqual([]);
    });

    test("a single constraining requirement is named in the singular, even beside a malformed shard", () => {
      bare("F-ONE", "shop.one");
      write(root, ".kb/relationships/cd.yaml", "nope: 1\n");
      write(
        root,
        ".kb/requirements/REQ-O.md",
        "---\nid: REQ-O\ntype: req\ntitle: O\nstatus: open\nlinks:\n  - type: constrains\n    target: F-ONE\n---\n\nO.\n",
      );
      expect(planSubjectDefinitionPlaceholders(root)[0]?.body).toContain(
        "is named by requirement REQ-O, which links to",
      );
    });

    test("never replace a body, and keep CRLF line breaks", () => {
      expect(withNotStatedBody("---\r\nid: F\r\n---\r\n", "Note\nline\n")).toBe(
        "---\r\nid: F\r\n---\r\n\r\nNote\r\nline\r\n",
      );
      expect(withNotStatedBody("---\nid: F\n---", "Note\n")).toBe(
        "---\nid: F\n---\n\nNote\n",
      );
      expect(withNotStatedBody("---\nid: F\n---\nText\n", "Note\n")).toBeNull();
      expect(withNotStatedBody("no front matter", "Note\n")).toBeNull();
    });

    test("a file that changed since the plan is skipped", () => {
      bare("F-GONE", "shop.gone");
      const plan = planSubjectDefinitionPlaceholders(root);
      expect(plan).toHaveLength(1);
      rmSync(path.join(root, ".kb/facts/F-GONE.md"));
      write(root, ".kb/facts/F-GONE.md", "no front matter");
      expect(planSubjectDefinitionPlaceholders(root)).toEqual([]);
    });

    test("the schema upgrade plans the note below schema 16 and the executor writes it", async () => {
      bare("F-EMPTY", "shop.empty");
      const below = buildSchema6MigrationFragment({
        workspaceRoot: root,
        currentSchemaVersion: 15,
      });
      const action = below.actions.find(
        (candidate) => candidate.id === SUBJECT_DEFINITION_NOT_STATED_ACTION_ID,
      );
      expect(action).toEqual({
        id: SUBJECT_DEFINITION_NOT_STATED_ACTION_ID,
        code: SUBJECT_DEFINITION_NOT_STATED_CODE,
        category: "schema",
        state: "ready",
        safety: "automatic",
        invocation: { kind: "cli", command_argv: ["kibi", "migrate", "--yes"] },
        affectedEntityIds: ["F-EMPTY"],
        affectedFiles: [".kb/facts/F-EMPTY.md"],
        dependsOn: [],
        preconditions: [],
        postconditions: [{ rule: "subject-definition-missing", findings: 0 }],
        evidence: {
          reason:
            "Schema 16 requires a definition as the body of every subject fact. These subject facts have no body at all, so each gets the note Kibi writes on the subjects it creates: 'Definition not stated:', where the subject is named and who could define it. No definition is invented; a person replaces the note with one.",
          count: 1,
          preserves: "front matter and every authored body",
        },
        autoApplicable: true,
        dispositionRequired: false,
        allowedDispositions: ["fixed", "accepted", "deferred"],
      });
      expect(below.sourceRewriteActionIds).toContain(
        SUBJECT_DEFINITION_NOT_STATED_ACTION_ID,
      );
      // The note fills it, so it is no definition review.
      expect(below.actions.map((candidate) => candidate.id)).not.toContain(
        "subject-definition-F-EMPTY",
      );
      expect(
        SCHEMA6_AUTOMATIC_CODES.has(SUBJECT_DEFINITION_NOT_STATED_CODE),
      ).toBe(true);
      const at = buildSchema6MigrationFragment({
        workspaceRoot: root,
        currentSchemaVersion: 16,
      });
      expect(at.actions.map((candidate) => candidate.id)).not.toContain(
        SUBJECT_DEFINITION_NOT_STATED_ACTION_ID,
      );
      expect(at.actions.map((candidate) => candidate.id)).toContain(
        "subject-definition-F-EMPTY",
      );
      await applySchema6MigrationAction(
        action as never,
        { workspaceRoot: root } as never,
      );
      expect(read(path.join(root, ".kb/facts/F-EMPTY.md"))).toContain(
        "Definition not stated: the subject shop.empty",
      );
    });

    test("the executor refuses a note it cannot write", async () => {
      bare("F-EMPTY", "shop.empty");
      bare("F-VOID", "shop.void");
      const action = buildSchema6MigrationFragment({
        workspaceRoot: root,
        currentSchemaVersion: 15,
      }).actions.find(
        (candidate) => candidate.id === SUBJECT_DEFINITION_NOT_STATED_ACTION_ID,
      );
      // The plan reads the bare file; by the time it is written a person
      // has authored a body.
      const realRead = kbSources.readText;
      const reads = new Map<string, number>();
      const spy = spyOn(kbSources, "readText").mockImplementation((file) => {
        const name = path.basename(file);
        if (name !== "F-EMPTY.md" && name !== "F-VOID.md")
          return realRead(file);
        reads.set(name, (reads.get(name) ?? 0) + 1);
        return reads.get(name) === 1
          ? realRead(file)
          : "---\nid: F\n---\nAuthored meanwhile.\n";
      });
      try {
        await expect(
          applySchema6MigrationAction(
            action as never,
            { workspaceRoot: root } as never,
          ),
        ).rejects.toThrow(
          "Could not record 'Definition not stated' on .kb/facts/F-EMPTY.md (the file changed or has no front matter), .kb/facts/F-VOID.md (the file changed or has no front matter); rerun kibi migrate and approve the new plan.",
        );
      } finally {
        spy.mockRestore();
      }
    });
  });

  test("every domain subject review action carries its full instruction, postcondition and evidence", () => {
    write(
      root,
      ".kb/requirements/REQ-CART.md",
      "---\nid: REQ-CART\ntype: req\ntitle: Cart lines\nstatus: open\nsemantic_inventory:\n  - claim_key: CLAIM-CART\n    claim_text: The shopping cart keeps its lines after the customer signs out\n    role: normative\n    status: ontology_gap\n  - claim_key: CLAIM-ZEBRA\n    claim_text: Zebras graze on quantum moss\n    role: condition\n    status: missing\n---\n\nThe cart keeps its lines.\n",
    );
    subject(root, "F-THIN", "shop.thin", "Thin", "Too short.");
    subject(
      root,
      "F-BAG",
      "store.bag",
      "Bag",
      DEFINITION.replace("cart", "bag"),
    );
    subject(root, "F-BAG2", "store_bag", "Bag", `${DEFINITION} Again.`);
    subject(
      root,
      "F-CART-B",
      "shop.cart",
      "Cart again",
      `${DEFINITION} Twice.`,
    );
    subject(root, "F-EMPTY", "shop.empty", "Empty", "");
    write(
      root,
      ".kb/facts/F-SELF.md",
      "---\nid: F-SELF\ntype: fact\ntitle: Ledger\nstatus: active\nfact_kind: subject\nsubject_key: books.ledger\nkind_of:\n  - books.ledger\n---\n\nThe ledger is the record of every posted entry in the accounting books; it is not the draft journal.\n",
    );
    for (const [id, key, broader] of [
      ["F-A", "loop.alpha", "loop.beta"],
      ["F-B", "loop.beta", "loop.alpha"],
    ])
      write(
        root,
        `.kb/facts/${id}.md`,
        `---\nid: ${id}\ntype: fact\ntitle: ${key}\nstatus: active\nfact_kind: subject\nsubject_key: ${key}\npart_of:\n  - ${broader}\n---\n\nThe ${key} part of the looping product area, which nobody should confuse with the other part.\n`,
      );
    expect(domainSubjectActions(root)).toEqual([
      {
        id: "claim-subject-anchor-REQ-CART-CLAIM-CART",
        code: "claim_subject_anchor_suggest",
        category: "semantic",
        state: "ready",
        safety: "review",
        invocation: {
          kind: "cli",
          command_argv: [
            "kibi",
            "migrate",
            "--apply-safe",
            "--approved-action",
            "claim-subject-anchor-REQ-CART-CLAIM-CART",
          ],
        },
        affectedEntityIds: ["REQ-CART"],
        affectedFiles: [".kb/requirements/REQ-CART.md"],
        dependsOn: [],
        preconditions: [],
        postconditions: [
          {
            rule: "claim-subject-missing",
            entityId: "REQ-CART",
            claimKey: "CLAIM-CART",
            findings: 0,
          },
        ],
        evidence: {
          reason:
            "This unmodeled claim names no subject, so Kibi cannot pair it with the other requirements about the same thing and kb_check blocks it (claim-subject-missing).",
          claimKey: "CLAIM-CART",
          claimText:
            "The shopping cart keeps its lines after the customer signs out",
          candidates: [
            {
              subjectKey: "shop.cart",
              title: "Shopping cart",
              score: 0.317,
              strong: true,
              defined: true,
            },
            {
              subjectKey: "shop.cart",
              title: "Cart again",
              score: 0.21,
              strong: true,
              defined: true,
            },
          ],
          subjects: ["shop.cart"],
          approve:
            "kibi migrate --apply-safe --approved-plan-hash <this plan's planHash> --approved-action claim-subject-anchor-REQ-CART-CLAIM-CART",
          choice:
            "Approving adds subjects: [shop.cart] to the entry, inserting only those lines; it clears claim-subject-missing for this claim only. Once anchored, the claim meets every other requirement with an unmodeled claim on that subject, so kibi check usually reports the pair as related-requirement-unmodeled until the claims are modeled or a pair_reviews verdict settles it. If another candidate, or a subject not listed, is what the claim is about, add it by hand and mark this action deferred.",
        },
        autoApplicable: false,
        dispositionRequired: true,
        allowedDispositions: ["fixed", "deferred"],
      },
      {
        id: "claim-subject-anchor-REQ-CART-CLAIM-ZEBRA",
        code: "claim_subject_anchor_review",
        category: "semantic",
        state: "ready",
        safety: "review",
        invocation: {
          kind: "review",
          instruction:
            "Add subjects: [<subject_key>] to inventory claim CLAIM-ZEBRA of REQ-CART, defining the subject first if no subject fact defines it.",
        },
        affectedEntityIds: ["REQ-CART"],
        affectedFiles: [".kb/requirements/REQ-CART.md"],
        dependsOn: [],
        preconditions: [],
        postconditions: [
          {
            rule: "claim-subject-missing",
            entityId: "REQ-CART",
            claimKey: "CLAIM-ZEBRA",
            findings: 0,
          },
        ],
        evidence: {
          reason:
            "This unmodeled claim names no subject, so Kibi cannot pair it with the other requirements about the same thing and kb_check blocks it (claim-subject-missing).",
          claimKey: "CLAIM-ZEBRA",
          claimText: "Zebras graze on quantum moss",
          candidates: [],
          choice:
            "No defined subject matches the claim's words. Define the subject it is about as a subject fact (fact_kind subject, a body saying what it is and is not), then add the subject it is about as subjects: [<subject_key>] on the inventory entry. Once anchored, the claim meets every other requirement with an unmodeled claim on that subject, so kibi check usually reports the pair as related-requirement-unmodeled until the claims are modeled or a pair_reviews verdict settles it.",
        },
        autoApplicable: false,
        dispositionRequired: true,
        allowedDispositions: ["fixed", "deferred"],
      },
      {
        id: "subject-definition-F-EMPTY",
        code: "subject_definition_review",
        category: "semantic",
        state: "ready",
        safety: "review",
        invocation: {
          kind: "review",
          instruction:
            "Write the definition of subject shop.empty as the body of .kb/facts/F-EMPTY.md.",
        },
        affectedEntityIds: ["F-EMPTY"],
        affectedFiles: [".kb/facts/F-EMPTY.md"],
        dependsOn: [],
        preconditions: [],
        postconditions: [
          {
            rule: "subject-definition-missing",
            entityId: "F-EMPTY",
            findings: 0,
          },
        ],
        evidence: {
          reason:
            "Subject shop.empty has no definition (none): every requirement that names it can mean something different by it. kb_check blocks it (subject-definition-missing).",
          subjectKey: "shop.empty",
          definitionReason: "none",
          choice:
            "Write the definition as the fact's body: what this thing is in the product, what it includes and what it is not. State only what the project's people and code say; Kibi never writes a definition.",
        },
        autoApplicable: false,
        dispositionRequired: true,
        allowedDispositions: ["fixed", "deferred"],
      },
      {
        id: "subject-definition-F-THIN",
        code: "subject_definition_review",
        category: "semantic",
        state: "ready",
        safety: "review",
        invocation: {
          kind: "review",
          instruction:
            "Write the definition of subject shop.thin as the body of .kb/facts/F-THIN.md.",
        },
        affectedEntityIds: ["F-THIN"],
        affectedFiles: [".kb/facts/F-THIN.md"],
        dependsOn: [],
        preconditions: [],
        postconditions: [
          {
            rule: "subject-definition-missing",
            entityId: "F-THIN",
            findings: 0,
          },
        ],
        evidence: {
          reason:
            "Subject shop.thin has no definition (too_short): every requirement that names it can mean something different by it. kb_check blocks it (subject-definition-missing).",
          subjectKey: "shop.thin",
          definitionReason: "too_short",
          choice:
            "Write the definition as the fact's body: what this thing is in the product, what it includes and what it is not. State only what the project's people and code say; Kibi never writes a definition.",
        },
        autoApplicable: false,
        dispositionRequired: true,
        allowedDispositions: ["fixed", "deferred"],
      },
      {
        id: "subject-duplicate-F-BAG-F-BAG2",
        code: "subject_duplicate_review",
        category: "semantic",
        state: "ready",
        safety: "review",
        invocation: {
          kind: "review",
          instruction:
            "Merge subjects store.bag and store_bag, or relate them with distinct_from, part_of or kind_of and say how they differ.",
        },
        affectedEntityIds: ["F-BAG", "F-BAG2"],
        affectedFiles: [".kb/facts/F-BAG.md", ".kb/facts/F-BAG2.md"],
        dependsOn: [],
        preconditions: [],
        postconditions: [
          {
            rule: "subject-duplicate",
            entityId: "F-BAG",
            findings: 0,
          },
        ],
        evidence: {
          reason:
            "Subjects store.bag and store_bag read as one thing defined twice (word similarity 1), so requirements about it never meet. kb_check blocks the pair (subject-duplicate).",
          subjectKeys: ["store.bag", "store_bag"],
          similarity: 1,
          choice:
            "If they are one subject, keep one fact, point constrains links, claim anchors and subject_key values at its key and archive the other. If they differ, name the other key under distinct_from (or part_of or kind_of) and say in the definition how they differ.",
        },
        autoApplicable: false,
        dispositionRequired: true,
        allowedDispositions: ["fixed", "deferred"],
      },
      {
        id: "subject-duplicate-F-CART-F-CART-B",
        code: "subject_duplicate_review",
        category: "semantic",
        state: "ready",
        safety: "review",
        invocation: {
          kind: "review",
          instruction:
            "Subject facts F-CART and F-CART-B both define shop.cart: keep one, merge what the other adds into it and archive the other.",
        },
        affectedEntityIds: ["F-CART", "F-CART-B"],
        affectedFiles: [".kb/facts/F-CART-B.md", ".kb/facts/F-CART.md"],
        dependsOn: [],
        preconditions: [],
        postconditions: [
          {
            rule: "subject-duplicate",
            entityId: "F-CART",
            findings: 0,
          },
        ],
        evidence: {
          reason:
            "Subject facts F-CART and F-CART-B both define subject_key shop.cart, so readers cannot tell which definition a requirement means. kb_check blocks the pair (subject-duplicate).",
          subjectKeys: ["shop.cart", "shop.cart"],
          similarity: 1,
          sameKey: true,
          choice:
            "Keep one subject fact for the key: merge what the other definition adds into it, point its constrains links at the kept fact and archive (or supersede) the other.",
        },
        autoApplicable: false,
        dispositionRequired: true,
        allowedDispositions: ["fixed", "deferred"],
      },
      {
        id: "subject-hierarchy-F-SELF",
        code: "subject_hierarchy_review",
        category: "semantic",
        state: "ready",
        safety: "review",
        invocation: {
          kind: "review",
          instruction:
            "Remove F-SELF's own key from its part_of, kind_of or distinct_from.",
        },
        affectedEntityIds: ["F-SELF"],
        affectedFiles: [".kb/facts/F-SELF.md"],
        dependsOn: [],
        preconditions: [],
        postconditions: [
          {
            rule: "subject-hierarchy-invalid",
            entityId: "F-SELF",
            findings: 0,
          },
        ],
        evidence: {
          reason:
            "Subject books.ledger (F-SELF) names itself under kind_of, so it cannot be read as broader than, or distinct from, another subject. kb_check blocks it (subject-hierarchy-invalid).",
          subjectKey: "books.ledger",
          selfReference: ["kind_of"],
          choice:
            "A subject's part_of and kind_of name broader subjects and distinct_from names other subjects, never the subject itself, and following part_of, kind_of and dotted keys upward must never come back to where it started. Remove the link that points the wrong way: keep the one that says which subject contains or generalizes the other",
        },
        autoApplicable: false,
        dispositionRequired: true,
        allowedDispositions: ["fixed", "deferred"],
      },
      {
        id: "subject-hierarchy-F-A-cycle",
        code: "subject_hierarchy_review",
        category: "semantic",
        state: "ready",
        safety: "review",
        invocation: {
          kind: "review",
          instruction:
            "Break the loop between subjects loop.alpha, loop.beta: remove the part_of, kind_of or dotted-key link that points the wrong way.",
        },
        affectedEntityIds: ["F-A"],
        affectedFiles: [".kb/facts/F-A.md"],
        dependsOn: [],
        preconditions: [],
        postconditions: [
          {
            rule: "subject-hierarchy-invalid",
            entityId: "F-A",
            findings: 0,
          },
        ],
        evidence: {
          reason:
            "Subjects loop.alpha, loop.beta sit under each other through part_of, kind_of or dotted keys (F-A, F-B), so none of them is broader and requirements on one reach all of them. kb_check blocks it (subject-hierarchy-invalid).",
          subjectKey: "loop.alpha",
          cycle: ["loop.alpha", "loop.beta"],
          choice:
            "A subject's part_of and kind_of name broader subjects and distinct_from names other subjects, never the subject itself, and following part_of, kind_of and dotted keys upward must never come back to where it started. Remove the link that points the wrong way: keep the one that says which subject contains or generalizes the other",
        },
        autoApplicable: false,
        dispositionRequired: true,
        allowedDispositions: ["fixed", "deferred"],
      },
    ]);
  });

  test("same-key duplicates and hierarchy problems get their own review wording", () => {
    subject(
      root,
      "F-CART-B",
      "shop.cart",
      "Cart again",
      `${DEFINITION} Twice.`,
    );
    write(
      root,
      ".kb/facts/F-SELF.md",
      "---\nid: F-SELF\ntype: fact\ntitle: Ledger\nstatus: active\nfact_kind: subject\nsubject_key: books.ledger\nkind_of:\n  - books.ledger\n---\n\nThe ledger is the record of every posted entry in the accounting books; it is not the draft journal.\n",
    );
    for (const [id, key, broader] of [
      ["F-A", "loop.alpha", "loop.beta"],
      ["F-B", "loop.beta", "loop.alpha"],
    ])
      write(
        root,
        `.kb/facts/${id}.md`,
        `---\nid: ${id}\ntype: fact\ntitle: ${key}\nstatus: active\nfact_kind: subject\nsubject_key: ${key}\npart_of:\n  - ${broader}\n---\n\nThe ${key} part of the looping product area, which nobody should confuse with the other part.\n`,
      );
    const actions = domainSubjectActions(root);
    const same = actions.find(
      (action) => action.id === "subject-duplicate-F-CART-F-CART-B",
    );
    expect(same?.invocation).toEqual({
      kind: "review",
      instruction:
        "Subject facts F-CART and F-CART-B both define shop.cart: keep one, merge what the other adds into it and archive the other.",
    });
    expect(same?.evidence.sameKey).toBe(true);
    const hierarchy = actions.filter(
      (action) => action.code === SUBJECT_HIERARCHY_REVIEW_CODE,
    );
    expect(hierarchy.map((action) => action.id)).toEqual([
      "subject-hierarchy-F-SELF",
      "subject-hierarchy-F-A-cycle",
    ]);
    expect(hierarchy[0]?.invocation).toMatchObject({
      instruction:
        "Remove F-SELF's own key from its part_of, kind_of or distinct_from.",
    });
    expect(hierarchy[1]?.invocation).toMatchObject({
      instruction:
        "Break the loop between subjects loop.alpha, loop.beta: remove the part_of, kind_of or dotted-key link that points the wrong way.",
    });
    expect(hierarchy[1]?.affectedFiles).toEqual([".kb/facts/F-A.md"]);
    expect(hierarchy[1]?.postconditions).toEqual([
      { rule: "subject-hierarchy-invalid", entityId: "F-A", findings: 0 },
    ]);
    expect(
      SCHEMA6_APPROVABLE_REVIEW_CODES.has(SUBJECT_HIERARCHY_REVIEW_CODE),
    ).toBe(false);
  });
});
