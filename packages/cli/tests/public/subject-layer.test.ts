import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AuthoredEntity } from "../../src/public/operations/entity-context.js";
import {
  DEFINITION_TEMPLATE_MIN_SHARED,
  MIN_DEFINITION_WORDS,
  SUBJECT_DEFINITION_MISSING_RULE,
  SUBJECT_DUPLICATE_JACCARD,
  SUBJECT_DUPLICATE_RULE,
  type SubjectEntry,
  activeSubjects,
  assessDefinition,
  collectSubjectLayerViolations,
  declaredRelated,
  definitionTemplate,
  evaluateSubjectLayer,
  isKeyPrefix,
  isNotStatedDefinition,
  notStatedDefinition,
  subjectDuplicatePairs,
  templatedDefinitionIds,
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
      ["F-2", "F-3", 0.8],
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

  test("reads authored subject facts and skips work no selected rule needs", () => {
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
