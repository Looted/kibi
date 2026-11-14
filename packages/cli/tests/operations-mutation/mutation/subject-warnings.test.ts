import { afterEach, describe, expect, test } from "bun:test";
import {
  anchoredSubjects,
  claimNeedsSubjects,
  pairReviewPartners,
  subjectLayerWarnings,
} from "../../../src/operations/mutation/subject-warnings.js";
import type { PrologQueryResult } from "../../../src/public/operations/runtime-types.js";
import { fail, ok, scriptedProlog } from "../fake-prolog.js";
import {
  workspace as bareWorkspace,
  cleanupWorkspaces,
  writeIn,
} from "../workspace.js";

afterEach(cleanupWorkspaces);

/** A workspace whose manifest is at schema `schemaVersion`. */
function workspace(schemaVersion = 18): string {
  const root = bareWorkspace();
  writeIn(
    root,
    ".kb/manifest.json",
    JSON.stringify({
      manifestVersion: 1,
      schemaVersion,
      semanticAdvisorBackfill: "not_applicable",
    }),
  );
  return root;
}

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

function neighbour(
  subjectKey: string,
  defined: boolean,
  requirements: readonly { id: string; title: string }[],
  source = "",
) {
  return {
    subjectKey,
    defined,
    subjectFacts: defined
      ? [
          {
            id: "F-CART",
            title: "Shopping cart",
            source,
            partOf: [],
            kindOf: [],
          },
        ]
      : [],
    requirements,
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
    expect(claimNeedsSubjects(claim("C1", { subjects: ["shop.cart"] }))).toBe(
      false,
    );
    expect(claimNeedsSubjects(claim("C1", { status: "modeled" }))).toBe(false);
    expect(claimNeedsSubjects(claim("C1", { role: "descriptive" }))).toBe(
      false,
    );
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

  test("a suggestion leaves out a title that only restates its key", async () => {
    const { prolog } = scriptedProlog([
      json([
        {
          factId: "F-PDF",
          subjectKey: "shop.cart_pdf",
          title: "Subject shop.cart_pdf",
        },
        { factId: "F-LINES", subjectKey: "shop.cart_lines", title: "" },
        {
          factId: "F-SIGN",
          subjectKey: "shop.cart_sign_out",
          title: "Leaving the cart on sign-out",
        },
      ]),
    ]);
    const [warning] = await subjectLayerWarnings(
      { id: "REQ-A", type: "req" },
      { semantic_inventory: [claim("C1")] },
      "",
      prolog,
      workspace(),
    );
    expect(warning).toContain("shop.cart_pdf");
    expect(warning).toContain("shop.cart_lines");
    expect(warning).not.toContain("Subject shop.cart_pdf");
    expect(warning).not.toContain('shop.cart_lines ("');
    expect(warning).toContain(
      'shop.cart_sign_out ("Leaving the cart on sign-out")',
    );
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
    expect(warning).toEndWith(
      "Define a missing subject as a subject fact first.",
    );
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
      json({
        subjects: [
          neighbour("shop.cart", true, many, ".kb/facts/F-CART.md"),
          neighbour("shop.ghost", false, []),
          neighbour("shop.lonely", true, []),
        ],
        notCurrent: [],
      }),
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
    // One store read for every subject.
    expect(goals).toHaveLength(1);
    expect(goals[0]).toContain(
      "domain_subjects:subject_neighbours_json(['shop.cart','shop.ghost','shop.lonely'], 'REQ-A', [], Json)",
    );
    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toStartWith(
      `Subject shop.cart (${DEFINITION}) is also governed by REQ-0 ("Rule 0"),`,
    );
    expect(warnings[0]).toContain(
      'REQ-7 ("Rule 7") and 2 more (on it, a narrower or a broader subject). Read them',
    );
    expect(warnings[0]).toContain(
      'kb_query {"factKind":"subject","subjectKey":"shop.cart"}',
    );
    expect(warnings[1]).toStartWith(
      "claim-subject-undefined: REQ-A names subject shop.ghost, which no active subject fact defines.",
    );
  });

  test("at most five subjects, and no store read without subjects or reviews", async () => {
    const { prolog, goals } = scriptedProlog([
      json({
        subjects: [neighbour("a", true, [{ id: "REQ-B", title: "B" }])],
        notCurrent: [],
      }),
    ]);
    const warnings = await subjectLayerWarnings(
      { id: "REQ-A", type: "req" },
      {
        semantic_inventory: [
          claim("C1", { subjects: ["a", "b", "c", "d", "e", "f"] }),
        ],
      },
      "",
      prolog,
      workspace(),
    );
    expect(goals[0]).toContain(
      "subject_neighbours_json([a,b,c,d,e], 'REQ-A', [], Json)",
    );
    expect(warnings).toEqual([
      'Subject a is also governed by REQ-B ("B") (on it, a narrower or a broader subject). Read them: if one contradicts REQ-A, or restricts what REQ-A describes in a way its text does not say, ask the human which rule holds before relying on either. kb_query {"factKind":"subject","subjectKey":"a"} shows the whole subject.',
    ]);
    const quiet = scriptedProlog([fail("not asked")]);
    expect(
      await subjectLayerWarnings(
        { id: "REQ-A", type: "req" },
        { semantic_inventory: [claim("C1", { status: "modeled" })] },
        "",
        quiet.prolog,
        workspace(),
      ),
    ).toEqual([]);
    expect(quiet.goals).toEqual([]);
  });

  test("a pair review naming no current requirement is reported", async () => {
    const { prolog, goals } = scriptedProlog([
      json({ subjects: [], notCurrent: ["REQ-TYPO", "REQ-GONE"] }),
    ]);
    const warnings = await subjectLayerWarnings(
      { id: "REQ-A", type: "req" },
      {
        semantic_inventory: [claim("C1", { status: "modeled" })],
        pair_reviews: [
          { with: "REQ-TYPO", verdict: "no_conflict" },
          { with: "REQ-GONE" },
          { with: "REQ-TYPO" },
        ],
      },
      "",
      prolog,
      workspace(),
    );
    expect(goals[0]).toContain(
      "subject_neighbours_json([], 'REQ-A', ['REQ-GONE','REQ-TYPO'], Json)",
    );
    expect(warnings).toEqual([
      "related-requirement-unmodeled: a pair review on REQ-A names REQ-TYPO, REQ-GONE, which are not current requirements, so those reviews settle nothing. Check the id in its with field; a review of a superseded or removed requirement can be dropped.",
    ]);
    const one = scriptedProlog([
      json({ subjects: [], notCurrent: ["REQ-TYPO"] }),
    ]);
    expect(
      await subjectLayerWarnings(
        { id: "REQ-A", type: "req" },
        { pair_reviews: [{ with: "REQ-TYPO" }] },
        "",
        one.prolog,
        workspace(),
      ),
    ).toEqual([
      "related-requirement-unmodeled: a pair review on REQ-A names REQ-TYPO, which is not a current requirement, so that review settles nothing. Check the id in its with field; a review of a superseded or removed requirement can be dropped.",
    ]);
  });

  test("a pair review naming a current requirement kibi check never pairs is reported", async () => {
    const { prolog, goals } = scriptedProlog([
      json({ subjects: [], notCurrent: ["REQ-GONE"] }),
      json(["REQ-FAR", "REQ-OFF"]),
    ]);
    const warnings = await subjectLayerWarnings(
      { id: "REQ-A", type: "req" },
      {
        pair_reviews: [
          { with: "REQ-FAR" },
          { with: "REQ-GONE" },
          { with: "REQ-NEAR" },
          { with: "REQ-OFF" },
        ],
      },
      "",
      prolog,
      workspace(),
    );
    // Only the current partners are asked about.
    expect(goals[1]).toContain(
      "kb:current_req('REQ-A'), findall(W, (member(W, ['REQ-FAR','REQ-NEAR','REQ-OFF']), W \\== 'REQ-A', kb:current_req(W), \\+ ( call(domain_subjects:requirement_subject_pair('REQ-A', W, _)) ; call(domain_subjects:requirement_subject_pair(W, 'REQ-A', _)) ; kb:kb_relationship(relates_to, 'REQ-A', W) ; kb:kb_relationship(relates_to, W, 'REQ-A') )), Found)",
    );
    expect(warnings).toEqual([
      "related-requirement-unmodeled: a pair review on REQ-A names REQ-FAR, REQ-OFF, which share no subject with REQ-A (on it, a narrower or a broader one) and have no relates_to edge to it, so kibi check never pairs them with REQ-A and those reviews settle nothing. Check the id in its with field; if the requirements do interact, add a relates_to link between them (a verdict counts only while one links the pair), otherwise drop the review.",
      "related-requirement-unmodeled: a pair review on REQ-A names REQ-GONE, which is not a current requirement, so that review settles nothing. Check the id in its with field; a review of a superseded or removed requirement can be dropped.",
    ]);
    for (const [answer, expected] of [
      [json(["REQ-FAR"]), 1],
      [ok({ Json: JSON.stringify(JSON.stringify(["REQ-FAR"])) }), 1],
      [json([]), 0],
      [json({ not: "a list" }), 0],
      [fail("REQ-A is not current"), 0],
    ] as const) {
      const one = scriptedProlog([
        json({ subjects: [], notCurrent: [] }),
        answer,
      ]);
      const notes = await subjectLayerWarnings(
        { id: "REQ-A", type: "req" },
        { pair_reviews: [{ with: "REQ-FAR" }] },
        "",
        one.prolog,
        workspace(),
      );
      expect(notes).toHaveLength(expected);
      if (expected === 1)
        expect(notes[0]).toContain(
          "names REQ-FAR, which shares no subject with REQ-A (on it, a narrower or a broader one) and has no relates_to edge to it, so kibi check never pairs the two and that review settles nothing.",
        );
    }
  });

  test("the partners a payload's pair reviews name", () => {
    expect(pairReviewPartners({})).toEqual([]);
    expect(pairReviewPartners({ pair_reviews: "REQ-B" })).toEqual([]);
    expect(
      pairReviewPartners({
        pair_reviews: [
          { with: " REQ-C " },
          { with: "REQ-B" },
          { with: "" },
          { with: 3 },
          null,
          "REQ-X",
          { with: "REQ-B" },
        ],
      }),
    ).toEqual(["REQ-B", "REQ-C"]);
  });

  test("a store below schema 16 gets no subject notes", async () => {
    const { prolog, goals } = scriptedProlog([json(VOCABULARY)]);
    for (const root of [workspace(15), bareWorkspace()]) {
      expect(
        await subjectLayerWarnings(
          { id: "REQ-A", type: "req" },
          { semantic_inventory: [claim("C1")] },
          "",
          prolog,
          root,
        ),
      ).toEqual([]);
    }
    expect(goals).toEqual([]);
    const at16 = scriptedProlog([json(VOCABULARY)]);
    expect(
      await subjectLayerWarnings(
        { id: "REQ-A", type: "req" },
        { semantic_inventory: [claim("C1")] },
        "",
        at16.prolog,
        workspace(16),
      ),
    ).toHaveLength(1);
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
    const { prolog, goals } = scriptedProlog([
      json([
        ...VOCABULARY,
        { factId: "F-BAG", subjectKey: "shop_bag", title: "Shopping bag" },
        {
          factId: "F-OTHER",
          subjectKey: "shop.cart.lines",
          title: "Shopping cart",
        },
      ]),
      json({ subjects: [neighbour("shop_cart", false, [])], notCurrent: [] }),
    ]);
    const warnings = await subjectLayerWarnings(
      { id: "F-NEW", type: "fact" },
      {
        fact_kind: "subject",
        subject_key: "shop_cart",
        title: "Shopping cart",
        distinct_from: ["shop_bag"],
      },
      "Cart.",
      prolog,
      workspace(),
    );
    expect(goals[1]).toContain(
      "subject_neighbours_json([shop_cart], '', [], Json)",
    );
    expect(warnings).toEqual([
      "subject-definition-missing: subject shop_cart (F-NEW) needs a definition as its body: at least 8 words saying what it is in the product and what it is not. kb_check blocks a subject without one.",
      "subject-duplicate: subject shop_cart reads like existing shop.cart (F-CART). Reuse the existing subject, or name it under distinct_from (or part_of or kind_of when this subject is a part or kind of it) and say in the definition how they differ; kb_check blocks the pair otherwise.",
    ]);
    const quiet = scriptedProlog([
      json(VOCABULARY),
      json({
        subjects: [neighbour("shop.wishlist", false, [])],
        notCurrent: [],
      }),
    ]);
    expect(
      await subjectLayerWarnings(
        { id: "F-NEW", type: "fact" },
        {
          fact_kind: "subject",
          subject_key: "shop.wishlist",
          title: "Wishlist",
          part_of: ["shop"],
        },
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

  test("a second active subject fact with the same key is reported", async () => {
    const twin = {
      subjects: [
        {
          ...neighbour("shop.cart", true, []),
          subjectFacts: [
            { id: "F-NEW", title: "Cart", source: "", partOf: [], kindOf: [] },
            { id: "F-CART", title: "Cart", source: "", partOf: [], kindOf: [] },
          ],
        },
      ],
      notCurrent: [],
    };
    const { prolog } = scriptedProlog([json(VOCABULARY), json(twin)]);
    expect(
      await subjectLayerWarnings(
        { id: "F-NEW", type: "fact" },
        { fact_kind: "subject", subject_key: "shop.cart", title: "Cart" },
        DEFINITION,
        prolog,
        workspace(),
      ),
    ).toEqual([
      "subject-duplicate: subject shop.cart is already defined by F-CART. Two active subject facts with one key make the term mean two things: extend the existing definition instead, or retire one of them.",
    ]);
  });

  test("a subject that names itself or closes a cycle with the authored subjects is reported", async () => {
    const root = workspace();
    const subjectFile = (
      id: string,
      key: string,
      extra: string,
      status = "active",
    ) =>
      writeIn(
        root,
        `.kb/facts/${id}.md`,
        `---\nid: ${id}\ntype: fact\ntitle: ${key}\nstatus: ${status}\nfact_kind: subject\nsubject_key: ${key}\n${extra}---\n${DEFINITION}\n`,
      );
    subjectFile("F-ALPHA", "cyc.alpha", "");
    subjectFile("F-GAMMA", "cyc.gamma", "part_of:\n  - cyc.beta\n");
    subjectFile("F-OLD", "cyc.old", "part_of:\n  - cyc.beta\n", "retired");
    writeIn(root, ".kb/facts/README.md", "not an entity");
    writeIn(root, ".kb/facts/broken.md", "no front matter");
    const write = async (
      id: string,
      subjectKey: string,
      extra: Record<string, unknown>,
    ) => {
      const { prolog } = scriptedProlog([
        json([]),
        json({ subjects: [neighbour(subjectKey, false, [])], notCurrent: [] }),
      ]);
      return subjectLayerWarnings(
        { id, type: "fact" },
        { fact_kind: "subject", subject_key: subjectKey, title: id, ...extra },
        DEFINITION,
        prolog,
        root,
      );
    };
    expect(
      await write("F-BETA", "cyc.beta", { part_of: ["cyc.alpha"] }),
    ).toEqual([]);
    expect(
      await write("F-BETA", "cyc.beta", {
        part_of: ["cyc.beta", "cyc.gamma"],
        kind_of: ["cyc.beta"],
        distinct_from: ["cyc.beta"],
      }),
    ).toEqual([
      "subject-hierarchy-invalid: subject cyc.beta (F-BETA) names itself under part_of, kind_of, distinct_from; kb_check blocks it. part_of and kind_of name broader subjects and distinct_from other subjects, never the subject itself: remove cyc.beta from part_of, kind_of, distinct_from.",
      "subject-hierarchy-invalid: subjects cyc.beta, cyc.gamma sit under each other through part_of, kind_of or dotted keys, so none of them is broader and kb_check blocks them. Remove the link that points the wrong way: keep the one that says which subject contains or generalizes the other.",
    ]);
    // Rewriting the subject that closes a cycle replaces its stored links.
    subjectFile("F-BETA", "cyc.beta", "part_of:\n  - cyc.gamma\n");
    expect(
      await write("F-BETA", "cyc.beta", { kind_of: ["cyc.alpha"] }),
    ).toEqual([]);
    // A cycle elsewhere is not this subject's to report.
    expect(await write("F-DELTA", "cyc.delta", {})).toEqual([]);
  });
});
