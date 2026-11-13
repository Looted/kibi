import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AuthoredEntity } from "../../src/public/operations/entity-context.js";
import {
  DEFINITION_TEMPLATE_MIN_SHARED,
  MIN_DEFINITION_CONTENT_WORDS,
  MIN_DEFINITION_WORDS,
  SUBJECT_DEFINITION_MISSING_RULE,
  SUBJECT_DUPLICATE_JACCARD,
  SUBJECT_DUPLICATE_RULE,
  SUBJECT_HIERARCHY_INVALID_RULE,
  SUBJECT_LAYER_RULES,
  SUBJECT_LAYER_SCHEMA_VERSION,
  type SubjectEntry,
  activeSubjects,
  assessDefinition,
  collectSubjectLayerViolations,
  declaredRelated,
  definitionTemplate,
  definitionTokens,
  evaluateSubjectLayer,
  isAncestorKey,
  isKeyPrefix,
  isNotStatedDefinition,
  keySegments,
  notStatedDefinition,
  subjectDuplicatePairs,
  subjectHierarchyCycles,
  subjectLayerApplies,
  subjectSimilarity,
  templatedDefinitionIds,
  underDifferentParents,
} from "../../src/public/operations/subject-layer.js";

const DEFINITION =
  "The shopping cart a signed-in customer fills before checkout; it is not the saved wishlist.";

function subjectFact(
  id: string,
  subjectKey: string,
  body: string,
  extra: Record<string, unknown> = {},
): AuthoredEntity {
  return {
    id,
    type: "fact",
    path: `.kb/facts/${id}.md`,
    data: {
      id,
      type: "fact",
      fact_kind: "subject",
      subject_key: subjectKey,
      title: extra.title ?? subjectKey,
      status: "active",
      ...extra,
    },
    body,
  };
}

function entry(
  id: string,
  subjectKey: string,
  definition: string,
  extra: Partial<SubjectEntry> = {},
): SubjectEntry {
  return {
    id,
    subjectKey,
    title: subjectKey,
    definition,
    distinctFrom: [],
    broader: [],
    partOf: [],
    kindOf: [],
    path: `.kb/facts/${id}.md`,
    ...extra,
  };
}

describe("subject definitions", () => {
  test("constants", () => {
    expect(MIN_DEFINITION_WORDS).toBe(8);
    expect(SUBJECT_DUPLICATE_JACCARD).toBe(0.7);
  });

  test("a definition needs enough words that do not restate the title or key", () => {
    expect(
      assessDefinition({
        subjectKey: "shop.cart",
        title: "Cart",
        definition: "",
      }),
    ).toEqual({ ok: false, reason: "none", words: 0 });
    expect(
      assessDefinition({
        subjectKey: "shop.cart",
        title: "Cart",
        definition: "The customer cart.",
      }),
    ).toEqual({ ok: false, reason: "too_short", words: 3 });
    expect(
      assessDefinition({
        subjectKey: "shop.cart",
        title: "Shop cart of the web shop for the customer",
        definition: "Shop cart of the web shop for the customer.",
      }),
    ).toMatchObject({ ok: false, reason: "restatement" });
    expect(
      assessDefinition({
        subjectKey: "shop.cart",
        title: "Cart",
        definition: DEFINITION,
      }),
    ).toMatchObject({ ok: true });
  });

  test("a definition other subjects repeat with only their key or title changed is a template", () => {
    const template = (key: string) =>
      `The ${key} component, as the structural requirements that name it constrain it.`;
    const subjects = [
      entry("F-A", "kibi.alpha.limits", template("kibi.alpha.limits")),
      entry("F-B", "kibi.beta.codes", template("kibi.beta.codes")),
      entry("F-C", "shop.cart", DEFINITION),
      entry("F-D", "shop.none", ""),
    ];
    expect(DEFINITION_TEMPLATE_MIN_SHARED).toBe(3);
    expect(definitionTemplate(subjects[0] as SubjectEntry)).toBe(
      definitionTemplate(subjects[1] as SubjectEntry),
    );
    // Two subjects sharing a phrase is a coincidence; three is boilerplate.
    expect([...templatedDefinitionIds(subjects)]).toEqual([]);
    const third = entry("F-E", "kibi.gamma.ids", template("kibi.gamma.ids"));
    expect([...templatedDefinitionIds([...subjects, third])].sort()).toEqual([
      "F-A",
      "F-B",
      "F-E",
    ]);
    const reasons = evaluateSubjectLayer(
      [
        subjectFact("F-A", "kibi.alpha.limits", template("kibi.alpha.limits")),
        subjectFact("F-B", "kibi.beta.codes", template("kibi.beta.codes")),
        subjectFact("F-E", "kibi.gamma.ids", template("kibi.gamma.ids")),
        subjectFact("F-C", "shop.cart", DEFINITION),
      ],
      new Set(),
      new Set([SUBJECT_DEFINITION_MISSING_RULE]),
    ).map((violation) => [violation.entityId, violation.evidence?.reason]);
    expect(reasons).toEqual([
      ["F-A", "template"],
      ["F-B", "template"],
      ["F-E", "template"],
    ]);
  });

  test("only active, current subject facts with a key count", () => {
    const entities: AuthoredEntity[] = [
      subjectFact("F-1", "shop.cart", DEFINITION),
      subjectFact("F-2", "shop.old", "", { status: "archived" }),
      subjectFact("F-3", "shop.replaced", ""),
      subjectFact("F-4", "", ""),
      { ...subjectFact("F-5", "shop.note", ""), data: { fact_kind: "meta" } },
      {
        ...subjectFact("F-6", "shop.wish", DEFINITION, {
          distinct_from: ["shop.cart"],
          part_of: ["shop"],
          kind_of: ["shop.list"],
        }),
      },
    ];
    const subjects = activeSubjects(entities, new Set(["F-3"]));
    expect(subjects.map((subject) => subject.id)).toEqual(["F-1", "F-6"]);
    expect(subjects[1]).toMatchObject({
      distinctFrom: ["shop.cart"],
      broader: ["shop", "shop.list"],
      partOf: ["shop"],
      kindOf: ["shop.list"],
    });
  });
});

describe("subjects nobody has defined", () => {
  test("a generated body records where the subject is named and passes", () => {
    const body = notStatedDefinition(
      "shop.cart",
      'requirement REQ-A ("The cart keeps its lines")',
    );
    expect(body).toStartWith(
      'Definition not stated: the subject shop.cart is named by requirement REQ-A ("The cart keeps its lines").',
    );
    expect(isNotStatedDefinition(`  ${body}`)).toBe(true);
    expect(isNotStatedDefinition(DEFINITION)).toBe(false);
    expect(
      assessDefinition({
        subjectKey: "shop.cart",
        title: "Shop cart",
        definition: body,
      }),
    ).toMatchObject({ ok: true });
  });

  test("recorded gaps are never counted as a shared template", () => {
    const gaps = ["a.one", "b.two", "c.three"].map((key, index) =>
      entry(`F-${index}`, key, notStatedDefinition(key, "the same source")),
    );
    expect([...templatedDefinitionIds(gaps)]).toEqual([]);
  });
});

describe("subject duplicates", () => {
  test("pairs whose key and title words coincide, except parents and declared relations", () => {
    const subjects = [
      entry("F-1", "kibi.entity_body_context", DEFINITION),
      entry("F-2", "kibi.entity_body.context", DEFINITION),
      entry("F-3", "kibi.entity_body_context.settings", DEFINITION),
      entry("F-4", "kibi.telemetry.acceptance", DEFINITION),
      entry("F-5", "kibi.telemetry.acceptance_policy", DEFINITION, {
        broader: ["kibi.telemetry.acceptance"],
      }),
      entry("F-6", "kibi.tree_sitter_references", DEFINITION),
      entry("F-7", "kibi.tree_sitter_script_references", DEFINITION, {
        distinctFrom: ["kibi.tree_sitter_references"],
      }),
      entry("F-8", "kibi.entity_body_context", DEFINITION),
    ];
    expect(
      subjectDuplicatePairs(subjects).map(({ left, right, similarity }) => [
        left.id,
        right.id,
        similarity,
      ]),
    ).toEqual([
      ["F-1", "F-2", 1],
      ["F-1", "F-8", 1],
      ["F-2", "F-8", 1],
    ]);
    expect(isKeyPrefix("a.b", "a.b.c")).toBe(true);
    expect(isKeyPrefix("a.b", "a.bc")).toBe(false);
    expect(
      declaredRelated(subjects[4] as SubjectEntry, subjects[3] as SubjectEntry),
    ).toBe(true);
    expect(
      declaredRelated(subjects[5] as SubjectEntry, subjects[6] as SubjectEntry),
    ).toBe(true);
    expect(
      declaredRelated(subjects[0] as SubjectEntry, subjects[1] as SubjectEntry),
    ).toBe(false);
  });

  test("the violation names both subjects and the way out", () => {
    const [violation] = evaluateSubjectLayer(
      [
        subjectFact("F-1", "kibi.entity_body_context", DEFINITION),
        subjectFact("F-2", "kibi.entity_body.context", `${DEFINITION} Again.`),
      ],
      new Set(),
      new Set([SUBJECT_DUPLICATE_RULE]),
    );
    expect(violation).toMatchObject({
      rule: SUBJECT_DUPLICATE_RULE,
      entityId: "F-1",
      source: ".kb/facts/F-1.md",
      evidence: {
        subjectKey: "kibi.entity_body_context",
        other: "kibi.entity_body.context",
        otherId: "F-2",
        similarity: 1,
      },
    });
    expect(violation?.suggestion).toContain("distinct_from");
    expect(violation?.suggestion).toContain("part_of or kind_of");
  });
});

describe("collectSubjectLayerViolations", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), "kibi-subject-layer-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  function write(relative: string, content: string): void {
    const file = path.join(root, relative);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  }

  function manifest(schemaVersion: number): void {
    write(
      ".kb/manifest.json",
      JSON.stringify({
        manifestVersion: 1,
        schemaVersion,
        semanticAdvisorBackfill: "not_applicable",
      }),
    );
  }

  test("a KB before schema 16 has no subject layer until kibi migrate", () => {
    write(
      ".kb/facts/F-1.md",
      "---\nid: F-1\ntype: fact\ntitle: Cart\nstatus: active\nfact_kind: subject\nsubject_key: shop.cart\n---\n\nCart.\n",
    );
    const all = new Set<string>(SUBJECT_LAYER_RULES);
    expect(SUBJECT_LAYER_SCHEMA_VERSION).toBe(16);
    expect(subjectLayerApplies(root)).toBe(false);
    expect(collectSubjectLayerViolations(all, root)).toEqual([]);
    manifest(15);
    expect(subjectLayerApplies(root)).toBe(false);
    expect(collectSubjectLayerViolations(all, root)).toEqual([]);
    manifest(16);
    expect(subjectLayerApplies(root)).toBe(true);
    expect(collectSubjectLayerViolations(all, root).map((v) => v.rule)).toEqual(
      [SUBJECT_DEFINITION_MISSING_RULE],
    );
  });

  test("reads authored subject facts and skips work no selected rule needs", () => {
    manifest(18);
    write(
      ".kb/facts/F-1.md",
      "---\nid: F-1\ntype: fact\ntitle: Cart\nstatus: active\nfact_kind: subject\nsubject_key: shop.cart\n---\n\nCart.\n",
    );
    expect(
      collectSubjectLayerViolations(new Set(["must-priority-coverage"]), root),
    ).toEqual([]);
    const [violation] = collectSubjectLayerViolations(
      new Set([SUBJECT_DEFINITION_MISSING_RULE]),
      root,
    );
    expect(violation).toMatchObject({
      rule: SUBJECT_DEFINITION_MISSING_RULE,
      entityId: "F-1",
      evidence: { subjectKey: "shop.cart", reason: "too_short", words: 1 },
    });
    expect(violation?.description).toContain("is shorter than 8 words");
  });
});

describe("definitions in scripts written without spaces", () => {
  test("each Han or kana character counts as a word; Hangul splits on spaces", () => {
    expect(definitionTokens("购物车是顾客")).toEqual([
      "购",
      "物",
      "车",
      "是",
      "顾",
      "客",
    ]);
    expect(definitionTokens("カートは、商品。Cart2")).toEqual([
      "カ",
      "ー",
      "ト",
      "は",
      "商",
      "品",
      "cart2",
    ]);
    expect(definitionTokens("장바구니는 고객이 담은 상품")).toEqual([
      "장바구니는",
      "고객이",
      "담은",
      "상품",
    ]);
  });

  test("a Chinese or Japanese definition is judged by its characters", () => {
    expect(
      assessDefinition({
        subjectKey: "shop.cart",
        title: "购物车",
        definition:
          "购物车是已登录顾客在结账之前放入商品的临时清单，它不是保存起来的收藏夹，也不是订单。",
      }),
    ).toMatchObject({ ok: true });
    expect(
      assessDefinition({
        subjectKey: "shop.cart",
        title: "カート",
        definition:
          "カートは、ログインした顧客が購入前に商品を入れておく一時的な一覧です。お気に入りではありません。",
      }),
    ).toMatchObject({ ok: true });
    expect(
      assessDefinition({
        subjectKey: "shop.cart",
        title: "购物车",
        definition: "购物车。",
      }),
    ).toEqual({ ok: false, reason: "too_short", words: 3 });
    expect(
      assessDefinition({
        subjectKey: "shop.cart",
        title: "购物车",
        definition: "购物车的购物车是购物车的购物车。",
      }),
    ).toMatchObject({ ok: false, reason: "restatement" });
  });
});

describe("restatements padded with function words", () => {
  test("a definition must add its own words beyond the title and key", () => {
    expect(MIN_DEFINITION_CONTENT_WORDS).toBe(3);
    expect(
      assessDefinition({
        subjectKey: "shop.cart",
        title: "Cart",
        definition: "The cart is the cart of the cart the cart is.",
      }),
    ).toEqual({ ok: false, reason: "restatement", words: 11 });
    // Two words of its own are not yet a definition; three are.
    expect(
      assessDefinition({
        subjectKey: "shop.cart",
        title: "Cart",
        definition: "The shop cart is the cart of the shop with lines.",
      }),
    ).toMatchObject({ ok: false, reason: "restatement" });
    expect(
      assessDefinition({
        subjectKey: "shop.cart",
        title: "Cart",
        definition:
          "The shop cart is the cart of the shop with priced lines and totals.",
      }),
    ).toMatchObject({ ok: true });
  });
});

describe("legacy bootstrap subject bodies", () => {
  test("read as a recorded gap, not a definition, and never as a template", () => {
    const legacy = (key: string) =>
      `Subject ${key}, shared by the requirements bootstrap planned from docs/a.md, docs/b.md. Each of them links to this fact through constrains.\n`;
    expect(isNotStatedDefinition(legacy("shop.cart"))).toBe(true);
    expect(
      isNotStatedDefinition(
        "Subject matter experts, shared by the requirements bootstrap of the team.",
      ),
    ).toBe(false);
    const subjects = ["a.one", "b.two", "c.three"].map((key, index) =>
      entry(`F-${index}`, key, legacy(key)),
    );
    expect([...templatedDefinitionIds(subjects)]).toEqual([]);
  });
});

describe("subject duplicate similarity", () => {
  const subject = (
    subjectKey: string,
    title: string,
    extra: Partial<SubjectEntry> = {},
  ) => entry(subjectKey, subjectKey, DEFINITION, { title, ...extra });

  test("key segments are singular words", () => {
    expect(keySegments("Report.Exports_Pdf")).toEqual(["report", "export pdf"]);
    expect(keySegments("text.slugs")).toEqual(["text", "slug"]);
    expect(keySegments("access.status")).toEqual(["access", "status"]);
  });

  test("ancestors and descendants are never duplicates, whatever their separator", () => {
    expect(isAncestorKey("report_export", "report.export.pdf")).toBe(true);
    expect(isAncestorKey("report.export.pdf", "report.export")).toBe(true);
    expect(isAncestorKey("report.export", "report.exports")).toBe(false);
    expect(isAncestorKey("report.pdf", "report.export.pdf")).toBe(false);
    expect(
      subjectSimilarity(
        subject("report_export", "Report export"),
        subject("report.export.pdf", "Report export"),
      ),
    ).toBeNull();
  });

  test("plural keys are one subject", () => {
    expect(
      subjectSimilarity(
        subject("report.export", "Report export"),
        subject("report.exports", "Report exports"),
      ),
    ).toBe(1);
    expect(
      subjectSimilarity(
        subject("text.slug", "Slug"),
        subject("text.slugs", "Slugs"),
      ),
    ).toBe(1);
  });

  test("siblings under different parents are not merged", () => {
    expect(
      underDifferentParents(
        "web.drawing.canvas.read_only_view",
        "mobile.drawing.canvas.read_only_view",
      ),
    ).toBe(true);
    expect(underDifferentParents("shop.cart", "shop.carts")).toBe(false);
    expect(underDifferentParents("shop.cart.line", "shop.cart")).toBe(false);
    expect(underDifferentParents("a.b", "a.b")).toBe(false);
    expect(
      subjectSimilarity(
        subject("web.drawing.canvas.read_only_view", "Web Read Only View"),
        subject("mobile.drawing.canvas.read_only_view", "Read Only View"),
      ),
    ).toBeNull();
    // Leaves that differ under one parent are still compared.
    expect(
      subjectSimilarity(
        subject("shop.cart_view", "Cart view"),
        subject("shop.view_cart", "Cart view"),
      ),
    ).toBe(1);
  });

  test("distinct_from, part_of and kind_of still exempt a pair; one key on two facts never is", () => {
    expect(
      subjectSimilarity(
        subject("report.export", "Report export"),
        subject("report.exports", "Report exports", {
          distinctFrom: ["report.export"],
        }),
      ),
    ).toBeNull();
    expect(
      subjectSimilarity(
        subject("shop.cart", "Cart"),
        subject("shop.cart", "Cart", { distinctFrom: ["shop.cart"] }),
      ),
    ).toBe(1);
    expect(
      subjectSimilarity(
        subject("kibi.check", "Check"),
        subject("kibi.check_policy", "Check policy"),
      ),
    ).toBeNull();
    expect(
      subjectSimilarity(
        subject("shop.cart", "Shopping cart"),
        subject("shop.basket", "Shopping basket"),
      ),
    ).toBe(0.5);
  });

  test("two facts with one subject_key are reported as one subject defined twice", () => {
    const violations = evaluateSubjectLayer(
      [
        subjectFact("F-1", "shop.cart", DEFINITION),
        subjectFact("F-2", "shop.cart", `${DEFINITION} Again.`, {
          title: "Basket",
        }),
      ],
      new Set(),
      new Set([SUBJECT_DUPLICATE_RULE]),
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      rule: SUBJECT_DUPLICATE_RULE,
      entityId: "F-1",
      evidence: {
        subjectKey: "shop.cart",
        other: "shop.cart",
        otherId: "F-2",
        similarity: 1,
        sameKey: true,
      },
    });
    expect(violations[0]?.description).toContain(
      "F-1 and F-2 both define subject_key shop.cart",
    );
    expect(violations[0]?.suggestion).toContain("Keep one subject fact");
  });
});

describe("subject hierarchy", () => {
  test("cycles through part_of, kind_of and dotted keys", () => {
    const subjects = [
      entry("F-A", "shop", DEFINITION, {
        broader: ["shop.cart"],
        partOf: ["shop.cart"],
      }),
      entry("F-B", "shop.cart", DEFINITION),
      entry("F-C", "x", DEFINITION, { broader: ["y"], kindOf: ["y"] }),
      entry("F-D", "y", DEFINITION, { broader: ["z"], partOf: ["z"] }),
      entry("F-E", "z", DEFINITION, { broader: ["x"], partOf: ["x"] }),
      entry("F-F", "free", DEFINITION, {
        broader: ["missing", "free"],
        partOf: ["missing", "free"],
      }),
      entry("F-G", "shop.cart.line", DEFINITION, {
        broader: ["shop"],
        partOf: ["shop"],
      }),
    ];
    expect(subjectHierarchyCycles(subjects)).toEqual([
      // shop.cart.line leads into the cycle but nothing leads back to it.
      ["shop", "shop.cart"],
      ["x", "y", "z"],
    ]);
    expect(
      subjectHierarchyCycles([
        subjects[1],
        subjects[5],
        subjects[6],
      ] as SubjectEntry[]),
    ).toEqual([]);
  });

  test("self references and cycles are subject-hierarchy-invalid", () => {
    const violations = evaluateSubjectLayer(
      [
        subjectFact("F-1", "shop.cart", DEFINITION, {
          part_of: ["shop.cart"],
          distinct_from: ["shop.cart"],
        }),
        subjectFact("F-2", "shop.basket", DEFINITION, {
          kind_of: ["shop.bag"],
        }),
        subjectFact("F-3", "shop.bag", DEFINITION, {
          part_of: ["shop.basket"],
        }),
        subjectFact("F-4", "shop.list", DEFINITION, { kind_of: ["shop.list"] }),
      ],
      new Set(),
      new Set([SUBJECT_HIERARCHY_INVALID_RULE]),
    );
    expect(
      violations.map((violation) => [violation.entityId, violation.evidence]),
    ).toEqual([
      [
        "F-1",
        {
          subjectKey: "shop.cart",
          selfReference: ["part_of", "distinct_from"],
        },
      ],
      ["F-4", { subjectKey: "shop.list", selfReference: ["kind_of"] }],
      [
        "F-2",
        { subjectKey: "shop.basket", cycle: ["shop.bag", "shop.basket"] },
      ],
    ]);
    expect(violations[0]?.description).toBe(
      "Subject shop.cart (F-1) names itself under part_of, distinct_from, so it cannot be read as broader than, or distinct from, another subject",
    );
    expect(violations[2]?.description).toContain(
      "Subjects shop.bag, shop.basket sit under each other",
    );
    expect(violations[2]?.suggestion).toContain("Remove the link");
  });
});
