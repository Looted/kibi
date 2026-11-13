import { afterEach, describe, expect, test } from "bun:test";
import {
  anchoredSubjects,
  claimNeedsSubjects,
  subjectLayerWarnings,
} from "../../../src/operations/mutation/subject-warnings.js";
import type { PrologQueryResult } from "../../../src/public/operations/runtime-types.js";
import { fail, ok, scriptedProlog } from "../fake-prolog.js";
import { cleanupWorkspaces, workspace, writeIn } from "../workspace.js";

afterEach(cleanupWorkspaces);

const DEFINITION =
  "The shopping cart a signed-in customer fills before checkout; it is not the saved wishlist.";

const VOCABULARY = [
  { factId: "F-CART", subjectKey: "shop.cart", title: "Shopping cart" },
  {
    factId: "F-REQ",
    subjectKey: "shop.req_derived",
    title: "Shopping cart lines",
    reqDerived: true,
  },
];

function domain(
  subjectKey: string,
  defined: boolean,
  requirements: readonly { id: string; title: string }[],
  source = "",
) {
  return {
    subjectKey,
    defined,
    subjectFacts: defined
      ? [{ id: "F-CART", title: "Shopping cart", source, partOf: [], kindOf: [] }]
      : [],
    broader: [],
    ancestors: [],
    narrower: [],
    distinctFrom: [],
    requirements: requirements.map((req) => ({ ...req, status: "open", via: [] })),
    claims: [],
    scenarios: [],
  };
}

const json = (value: unknown): PrologQueryResult =>
  ok({ Json: JSON.stringify(value) });

const claim = (
  key: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> => ({
  claim_key: key,
  claim_text: "The shopping cart keeps its lines after sign-out",
  role: "normative",
  status: "ontology_gap",
  ...extra,
});

describe("claim anchors", () => {
  test("which claims must name subjects", () => {
    expect(claimNeedsSubjects(claim("C1"))).toBe(true);
    expect(claimNeedsSubjects(claim("C1", { subjects: ["shop.cart"] }))).toBe(false);
    expect(claimNeedsSubjects(claim("C1", { status: "modeled" }))).toBe(false);
    expect(claimNeedsSubjects(claim("C1", { role: "descriptive" }))).toBe(false);
    expect(claimNeedsSubjects(claim("C1", { subjects: [""] }))).toBe(true);
  });

  test("the subjects a requirement's claims name, sorted and once each", () => {
    expect(
      anchoredSubjects({
        semantic_inventory: [
          claim("C1", { subjects: ["shop.cart", "shop"] }),
          claim("C2", { subjects: ["shop.cart", 3] }),
          null,
          "x",
        ],
      }),
    ).toEqual(["shop", "shop.cart"]);
    expect(anchoredSubjects({ semantic_inventory: "x" })).toEqual([]);
  });
});

describe("subjectLayerWarnings", () => {
  test("no store, no notes", async () => {
    expect(
      await subjectLayerWarnings(
        { id: "REQ-A", type: "req" },
        { semantic_inventory: [claim("C1")] },
        "",
        undefined,
        workspace(),
      ),
    ).toEqual([]);
  });

  test("a requirement claim without subjects gets the subjects its words suggest", async () => {
    const { prolog } = scriptedProlog([json(VOCABULARY)]);
    const [warning] = await subjectLayerWarnings(
      { id: "REQ-A", type: "req" },
      { semantic_inventory: [claim("C1")] },
      "",
      prolog,
      workspace(),
    );
    expect(warning).toStartWith(
      'claim-subject-missing: inventory claim C1 of REQ-A ("The shopping cart keeps its lines after sign-out")',
    );
    expect(warning).toContain(
      'existing subjects its words suggest: shop.cart ("Shopping cart")',
    );
    expect(warning).not.toContain("shop.req_derived");
  });

  test("a claim no subject matches is told to define one", async () => {
    const { prolog } = scriptedProlog([json([])]);
    const [warning] = await subjectLayerWarnings(
      { id: "REQ-A", type: "req" },
      { semantic_inventory: [claim("C1")] },
      "",
      prolog,
      workspace(),
    );
    expect(warning).not.toContain("suggest");
    expect(warning).toEndWith("Define a missing subject as a subject fact first.");
  });

  test("each named subject lists the other requirements on it, or says it is undefined", async () => {
    const root = workspace();
    writeIn(
      root,
      ".kb/facts/F-CART.md",
      `---\nid: F-CART\ntype: fact\nfact_kind: subject\nsubject_key: shop.cart\n---\n\n${DEFINITION}\n`,
    );
    const many = Array.from({ length: 10 }, (_, index) => ({
      id: `REQ-${index}`,
      title: `Rule ${index}`,
    }));
    const { prolog, goals } = scriptedProlog([
      json(domain("shop.cart", true, [{ id: "REQ-A", title: "Self" }, ...many], ".kb/facts/F-CART.md")),
      json(domain("shop.ghost", false, [])),
      json(domain("shop.lonely", true, [{ id: "REQ-A", title: "Self" }])),
    ]);
    const warnings = await subjectLayerWarnings(
      { id: "REQ-A", type: "req" },
      {
        semantic_inventory: [
          claim("C1", { subjects: ["shop.cart", "shop.ghost", "shop.lonely"] }),
        ],
      },
      "",
      prolog,
      root,
    );
    expect(goals).toHaveLength(3);
    expect(goals[0]).toContain("domain_subjects:subject_domain_json('shop.cart', Json)");
    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toStartWith(
      `Subject shop.cart (${DEFINITION}) is also governed by REQ-0 ("Rule 0"),`,
    );
    expect(warnings[0]).toContain('REQ-7 ("Rule 7") and 2 more. Read them');
    expect(warnings[0]).toContain('kb_query {"factKind":"subject","subjectKey":"shop.cart"}');
    expect(warnings[1]).toStartWith(
      "claim-subject-undefined: REQ-A names subject shop.ghost, which no active subject fact defines.",
    );
  });

  test("a failed store read leaves the notes out, never the write", async () => {
    const { prolog } = scriptedProlog([fail("engine down")]);
    expect(
      await subjectLayerWarnings(
        { id: "REQ-A", type: "req" },
        { semantic_inventory: [claim("C1", { subjects: ["shop.cart"] })] },
        "",
        prolog,
        workspace(),
      ),
    ).toEqual([]);
  });

  test("a subject fact without a definition, or reading like an existing subject", async () => {
    const { prolog } = scriptedProlog([
      json([
        ...VOCABULARY,
        { factId: "F-BAG", subjectKey: "shop_bag", title: "Shopping bag" },
        { factId: "F-OTHER", subjectKey: "shop.cart.lines", title: "Shopping cart" },
      ]),
    ]);
    const warnings = await subjectLayerWarnings(
      { id: "F-NEW", type: "fact" },
      { fact_kind: "subject", subject_key: "shop_cart", title: "Shopping cart", distinct_from: ["shop_bag"] },
      "Cart.",
      prolog,
      workspace(),
    );
    expect(warnings).toEqual([
      "subject-definition-missing: subject shop_cart (F-NEW) needs a definition as its body: at least 8 words saying what it is in the product and what it is not. kb_check blocks a subject without one.",
      "subject-duplicate: subject shop_cart reads like existing shop.cart (F-CART), shop.cart.lines (F-OTHER). Reuse the existing subject, or name it under distinct_from (or part_of or kind_of when this subject is a part or kind of it) and say in the definition how they differ; kb_check blocks the pair otherwise.",
    ]);
    const quiet = scriptedProlog([json(VOCABULARY)]);
    expect(
      await subjectLayerWarnings(
        { id: "F-NEW", type: "fact" },
        { fact_kind: "subject", subject_key: "shop.wishlist", title: "Wishlist", part_of: ["shop"] },
        DEFINITION,
        quiet.prolog,
        workspace(),
      ),
    ).toEqual([]);
    expect(
      await subjectLayerWarnings(
        { id: "F-P", type: "fact" },
        { fact_kind: "property_value" },
        "",
        quiet.prolog,
        workspace(),
      ),
    ).toEqual([]);
  });
});
