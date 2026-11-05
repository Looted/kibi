import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { LOGIC_IR_VERSION, type LogicRuleIR } from "../../../src/logic/ir.js";
import * as logicModeling from "../../../src/operations/modeling/logic-modeling.js";
import {
  annotateModelRequirementStep,
  executeModelRequirement,
  extractRequirementClaim,
  getWorkspaceMigrationWarning,
  handleKbModelRequirement,
  reuseExistingSubject,
  strictWriteSetToApplyPlan,
} from "../../../src/operations/modeling/model-requirement.js";
import * as vocabulary from "../../../src/operations/modeling/vocabulary-alignment.js";
import {
  modeledClaimRole,
  normalizeSemanticClause,
  semanticClaimKey,
} from "../../../src/operations/semantic-advisor/clauses.js";
import { advisorPropositionRole } from "../../../src/operations/semantic-advisor/proposition-role.js";
import { semanticSourceHash } from "../../../src/operations/semantic-advisor/shared.js";
import { buildStrictWriteSet } from "../../../src/public/check-types.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";
import * as manifest from "../../../src/utils/kb-manifest.js";

const restores: Array<() => void> = [];
afterEach(() => {
  for (const restore of restores.splice(0).reverse()) restore();
});

type Spy = { mock: { calls: unknown[][] }; mockRestore: () => void };
function spy<T extends object, K extends keyof T>(
  target: T,
  key: K,
  implementation: unknown,
): Spy {
  const handle = spyOn(target, key as never).mockImplementation(
    implementation as never,
  ) as unknown as Spy;
  restores.push(() => handle.mockRestore());
  return handle;
}

type Row = Record<string, unknown>;
type Step = {
  type: string;
  id: string;
  properties: Row;
  relationships?: Row[];
};
type Content = Row & {
  warnings: Row[];
  applyPlan: Step[];
  claimKey: string;
  logicClaims: string[];
  writeSet: Row;
};

/** Every model call reads the manifest; this one is current unless a test says otherwise. */
function manifestState(status: Row = { state: "ok" }): Spy {
  return spy(manifest, "readKbManifestStatus", () => status);
}

const STATEMENT = "Orders must be kept at most 7 days.";
const PROVIDED = {
  subjectKey: "order.retention",
  propertyKey: "max_days",
  operator: "lte",
  value: 7,
};
const prolog = { prolog: {} } as unknown as OperationContext;

function aligned(subject: Row, redundancyCandidates: Row[] = []) {
  return {
    subject: {
      confidence: 0.9,
      candidates: [],
      existingFactId: null,
      ...subject,
    },
    redundancyCandidates,
    stamps: [],
    fallbackUsed: false,
    diagnostics: [],
  };
}

function alignment(outcome: unknown): Spy {
  return spy(vocabulary, "alignRequirementVocabulary", async () => outcome);
}

async function model(
  args: Row = {},
  context: OperationContext | null = prolog,
) {
  const result = await handleKbModelRequirement(
    null,
    { text: STATEMENT, source: "docs/r.md", ...args } as never,
    "/w",
    context ?? undefined,
  );
  return { result, content: result.structuredContent as unknown as Content };
}

const subjectSteps = (plan: Step[]) =>
  plan.filter((step) => step.properties.fact_kind === "subject");
const reqStep = (plan: Step[]) =>
  plan.find((step) => step.type === "req") as Step;

describe("reusing an existing subject", () => {
  const claim = (confidence?: number) =>
    extractRequirementClaim({
      text: STATEMENT,
      source: "docs/r.md",
      ...PROVIDED,
      ...(confidence === undefined ? {} : { confidence }),
    } as never).claim;

  test("names the existing fact in the subject and its constrains links", () => {
    const writeSet = buildStrictWriteSet({
      claim: claim(),
      statement: STATEMENT,
    });
    if (!writeSet.isStrict) throw new Error("expected a strict write set");
    const reused = reuseExistingSubject(writeSet, "FACT-SUBJ-OLD");
    expect(reused.replacedSubjectId).toBe(writeSet.subjectFact.id);
    expect(reused.writeSet).toStrictEqual({
      ...writeSet,
      subjectFact: {
        ...writeSet.subjectFact,
        id: "FACT-SUBJ-OLD",
        properties: {
          ...writeSet.subjectFact.properties,
          id: "FACT-SUBJ-OLD",
          source: ".kb/facts/FACT-SUBJ-OLD.md",
        },
      },
      relationships: writeSet.relationships.map((relationship) =>
        relationship.type === "constrains"
          ? { ...relationship, to: "FACT-SUBJ-OLD" }
          : relationship,
      ),
    });
    expect(
      writeSet.relationships.map((relationship) => relationship.type),
    ).toEqual(["constrains", "requires_property"]);
  });

  test("leaves a write set below the threshold as it is", () => {
    const writeSet = buildStrictWriteSet({
      claim: claim(0.3),
      statement: STATEMENT,
    });
    expect(writeSet.isStrict).toBe(false);
    const reused = reuseExistingSubject(writeSet, "FACT-SUBJ-OLD");
    expect(reused.writeSet).toBe(writeSet);
    expect(reused.replacedSubjectId).toBeNull();
  });
});

describe("vocabulary alignment", () => {
  test("is not consulted without a store or for a claim below the threshold", async () => {
    manifestState();
    const calls = alignment(
      aligned({ decision: "declare_new", subjectKey: "order.retention" }),
    );
    for (const [args, context] of [
      [PROVIDED, null],
      [PROVIDED, {} as OperationContext],
      [{ ...PROVIDED, confidence: 0.3 }, prolog],
    ] as const) {
      const { content } = await model(args, context);
      expect("vocabularyAlignment" in content).toBe(false);
    }
    expect(calls.mock.calls).toHaveLength(0);
  });

  test("asks with the claim key, statement and normalized subject key", async () => {
    manifestState();
    const calls = alignment(null);
    const { content } = await model({
      ...PROVIDED,
      subjectKey: "Order.Retention",
    });
    expect(calls.mock.calls).toEqual([
      [
        prolog,
        {
          claimKey: content.claimKey,
          statement: STATEMENT,
          proposedSubjectKey: "order.retention",
        },
      ],
    ]);
    expect("vocabularyAlignment" in content).toBe(false);
    expect(content.warnings).toEqual([]);
    expect(subjectSteps(content.applyPlan)).toHaveLength(1);
  });

  test("reuses the chosen subject for a heuristic or matching provided key", async () => {
    manifestState();
    const outcome = aligned({
      decision: "reuse_existing",
      subjectKey: "order.retention",
      existingFactId: "FACT-SUBJ-CART",
    });
    alignment(outcome);
    for (const args of [{}, PROVIDED]) {
      const { content } = await model(args);
      expect(subjectSteps(content.applyPlan)).toEqual([]);
      expect(
        reqStep(content.applyPlan).relationships?.find(
          (rel) => rel.type === "constrains",
        )?.to,
      ).toBe("FACT-SUBJ-CART");
      expect(content.warnings).toEqual([]);
      expect(content.vocabularyAlignment).toStrictEqual({
        ...outcome,
        reviewPlan: [],
      });
    }
    const property = (await model()).content.applyPlan.find(
      (step) => step.properties.fact_kind === "property_value",
    );
    expect(property?.properties.subject_key).toBe("order.retention");
  });

  test("keeps a different provided key and asks to review it", async () => {
    manifestState();
    alignment(
      aligned({
        decision: "reuse_existing",
        subjectKey: "cart.window",
        existingFactId: "FACT-SUBJ-CART",
      }),
    );
    const { content } = await model(PROVIDED);
    expect(content.warnings).toEqual([
      {
        kind: "subject_reuse_review",
        message:
          "Provided subjectKey order.retention is new, but existing subject cart.window (FACT-SUBJ-CART) matches this clause.",
        nextAction:
          "Reuse subjectKey cart.window so this requirement can be compared with the others on that subject, or keep order.retention if it is genuinely a different component.",
      },
    ]);
    const [subject] = subjectSteps(content.applyPlan);
    expect(subject?.properties.subject_key).toBe("order.retention");
    expect(subject?.properties.tags).not.toContain("vocabulary:new-subject");
  });

  test("declares a reused subject without a fact as new, untagged", async () => {
    manifestState();
    alignment(
      aligned({
        decision: "reuse_existing",
        subjectKey: "order.retention",
        existingFactId: null,
      }),
    );
    const { content } = await model(PROVIDED);
    expect(content.warnings).toEqual([]);
    const [subject] = subjectSteps(content.applyPlan);
    expect(subject?.properties.tags).not.toContain("vocabulary:new-subject");
  });

  test("reuses a subject fact only when the decision is to reuse it", async () => {
    manifestState();
    alignment(
      aligned({
        decision: "declare_new",
        subjectKey: "order.retention",
        existingFactId: "FACT-SUBJ-CART",
      }),
    );
    const { content } = await model(PROVIDED);
    expect(subjectSteps(content.applyPlan)).toHaveLength(1);
    expect(JSON.stringify(content.applyPlan)).not.toContain("FACT-SUBJ-CART");
  });

  test("keeps a named requirement when it reuses a subject", async () => {
    manifestState();
    alignment(
      aligned({
        decision: "reuse_existing",
        subjectKey: "order.retention",
        existingFactId: "FACT-SUBJ-CART",
      }),
    );
    const { content } = await model({
      ...PROVIDED,
      requirementId: "REQ-NAMED",
    });
    expect(reqStep(content.applyPlan).id).toBe("REQ-NAMED");
    expect(subjectSteps(content.applyPlan)).toEqual([]);
  });

  test("tags a declared subject and names its nearest neighbour from the review score", async () => {
    manifestState();
    const shape = {
      kind: "subject_key_shape_review",
      message:
        "New subject key Orders does not follow the component.aspect[.sub] convention checked by subject-key-shape.",
      nextAction:
        "Pass subjectKey as a dotted key with lowercase snake segments (for example kibi.cli.gc) so later requirements about the same component can reuse it.",
    };
    const nearest = (score: number) => ({
      kind: "new_subject_declared",
      message: `Declaring new subject order.retention; nearest existing subject is cart.window (score ${score}).`,
      nextAction:
        "Confirm the new subject is a different component, or pass subjectKey set to the existing subject to reuse it.",
    });
    const cases: [Row, Row[]][] = [
      [
        {
          subjectKey: "order.retention",
          candidates: [
            { subjectKey: "cart.window", score: 0.3 },
            { subjectKey: "x.y", score: 0.9 },
          ],
        },
        [nearest(0.3)],
      ],
      [
        {
          subjectKey: "order.retention",
          candidates: [{ subjectKey: "cart.window", score: 0.29 }],
        },
        [],
      ],
      [{ subjectKey: "Orders", candidates: [] }, [shape]],
    ];
    for (const [subject, warnings] of cases) {
      for (const restore of restores.splice(0).reverse()) restore();
      manifestState();
      alignment(aligned({ decision: "declare_new", ...subject }));
      const { content } = await model(PROVIDED);
      expect(content.warnings).toEqual(warnings);
      const [step] = subjectSteps(content.applyPlan);
      const tags = step?.properties.tags as string[];
      expect(tags.at(-1)).toBe("vocabulary:new-subject");
      expect(
        tags.filter((tag) => tag === "vocabulary:new-subject"),
      ).toHaveLength(1);
      expect(
        content.applyPlan
          .filter((other) => other !== step)
          .flatMap((other) => other.properties.tags as string[]),
      ).not.toContain("vocabulary:new-subject");
    }
  });

  test("returns a review observation for claims it may restate", async () => {
    manifestState();
    const candidates = [
      {
        factId: "FACT-A",
        subjectKey: "order.retention",
        requirementIds: [],
        claimText: "a",
        signature: "s",
        confidence: 0.9,
      },
      {
        factId: "FACT-B",
        subjectKey: "order.retention",
        requirementIds: [],
        claimText: "b",
        signature: "s",
        confidence: 0.8,
      },
    ];
    const outcome = aligned(
      { decision: "declare_new", subjectKey: "order.retention" },
      candidates,
    );
    alignment(outcome);
    const { content } = await model(PROVIDED);
    const id = `FACT-OBS-POSSIBLE-DUPLICATE-${content.claimKey.slice(6)}`;
    expect(content.vocabularyAlignment).toStrictEqual({
      ...outcome,
      reviewPlan: [
        {
          type: "fact",
          id,
          properties: {
            id,
            title: `Possible duplicate: ${STATEMENT}`,
            status: "active",
            source: "docs/r.md",
            fact_kind: "observation",
            tags: ["review:possible-duplicate", "vocabulary-alignment"],
          },
          relationships: [
            { type: "relates_to", from: id, to: "FACT-A" },
            { type: "relates_to", from: id, to: "FACT-B" },
          ],
        },
      ],
    });
    expect(content.warnings).toEqual([
      {
        kind: "possible_duplicate",
        message:
          "This clause may restate existing claim(s) FACT-A, FACT-B on order.retention.",
        nextAction:
          "Review the candidates: reuse the existing fact, supersede or restate the existing requirement, or record the returned review:possible-duplicate observation. This is advice, not a check verdict.",
      },
    ]);
  });
});

describe("annotating steps", () => {
  const context = {
    claimKey: "CLAIM-1",
    statement: "  Café orders must ship. ",
    logicClaims: ["CLAIM-0", "CLAIM-1"],
  };

  test("give a fact its claim", () => {
    expect(
      annotateModelRequirementStep(
        { type: "fact", id: "F", properties: { a: 1 } },
        context,
      ),
    ).toStrictEqual({
      type: "fact",
      id: "F",
      properties: {
        a: 1,
        claim_key: "CLAIM-1",
        claim_text: "  Café orders must ship. ",
      },
    });
    for (const properties of [null, undefined, "x"])
      expect(
        annotateModelRequirementStep({ type: "fact", properties }, context)
          .properties,
      ).toStrictEqual({
        claim_key: "CLAIM-1",
        claim_text: "  Café orders must ship. ",
      });
  });

  test("give a requirement its semantic inventory", () => {
    const text = "Café orders must ship.";
    const normalized = normalizeSemanticClause(text);
    expect(
      annotateModelRequirementStep(
        { type: "req", id: "R", properties: { title: "t" } },
        context,
      ),
    ).toStrictEqual({
      type: "req",
      id: "R",
      properties: {
        title: "t",
        semantic_text: text,
        logic_claims: ["CLAIM-0", "CLAIM-1"],
        semantic_clauses: [text],
        semantic_inventory_version: "kibi.semantic-inventory.v1",
        semantic_source_field: "semantic_text",
        semantic_source_hash: semanticSourceHash(text),
        semantic_inventory: [
          {
            claim_key: "CLAIM-1",
            claim_text: normalized,
            role:
              advisorPropositionRole(text, "CLAIM-1", [text]) ??
              modeledClaimRole(text),
            status: "modeled",
            span: { start: 0, end: Buffer.byteLength(normalized, "utf8") },
          },
        ],
      },
    });
    expect(Buffer.byteLength(normalized, "utf8")).toBeGreaterThan(
      normalized.length,
    );
    const key = semanticClaimKey(text);
    expect(
      (
        annotateModelRequirementStep(
          { type: "req" },
          { ...context, claimKey: key },
        ).properties as Row
      ).semantic_inventory,
    ).toEqual([
      expect.objectContaining({
        role: advisorPropositionRole(text, key, [text]),
      }),
    ]);
    expect(advisorPropositionRole(text, key, [text])).not.toBeNull();
  });

  test("leave any other step as it is", () => {
    const step = { type: "rule", properties: { a: 1 } };
    expect(annotateModelRequirementStep(step, context)).toBe(step);
  });
});

describe("modeling a strict requirement", () => {
  test("annotates every step and summarizes the plan", async () => {
    manifestState();
    const { result, content } = await model(PROVIDED, null);
    const writeSet = buildStrictWriteSet({
      claim: extractRequirementClaim({
        text: STATEMENT,
        source: "docs/r.md",
        ...PROVIDED,
      } as never).claim,
      statement: STATEMENT,
    });
    const claimKey = semanticClaimKey(STATEMENT);
    const plan = strictWriteSetToApplyPlan(writeSet).map((step) =>
      annotateModelRequirementStep(step, {
        claimKey,
        statement: STATEMENT,
        logicClaims: [claimKey],
      }),
    );
    expect(result.applyPlan).toStrictEqual(plan);
    expect(result.writeSet).toStrictEqual(writeSet);
    expect(result.migrationWarning).toBeNull();
    expect(result.content).toEqual([
      {
        type: "text",
        text: `Modeled strict requirement into ${plan.length} sequential applyPlan step(s).`,
      },
    ]);
    expect(content).toMatchObject({
      statement: STATEMENT,
      claimKey,
      logicClaims: [claimKey],
      source: "docs/r.md",
      sourceFiles: [],
      isStrict: true,
      confidence: writeSet.confidence,
      extractionMode: "provided",
      warnings: [],
      migrationWarning: null,
    });
  });

  test("keeps earlier logic claims once and names a migration warning", async () => {
    manifestState({ state: "missing", warning: "migrate the KB" });
    const claimKey = semanticClaimKey(STATEMENT);
    const { result, content } = await model(
      { ...PROVIDED, existingLogicClaims: ["CLAIM-OLD", claimKey] },
      null,
    );
    expect(content.logicClaims).toEqual(["CLAIM-OLD", claimKey]);
    expect(reqStep(content.applyPlan).properties.logic_claims).toEqual([
      "CLAIM-OLD",
      claimKey,
    ]);
    expect(result.migrationWarning).toBe("migrate the KB");
    expect(content.migrationWarning).toBe("migrate the KB");
    expect((result.content[0] as Row).text).toBe(
      `Modeled strict requirement into ${content.applyPlan.length} sequential applyPlan step(s). Migration warning included.`,
    );
  });

  test("keeps a named requirement's id", async () => {
    manifestState();
    alignment(
      aligned({ decision: "declare_new", subjectKey: "order.retention" }),
    );
    const { content } = await model({
      ...PROVIDED,
      requirementId: "REQ-NAMED",
    });
    expect(reqStep(content.applyPlan).id).toBe("REQ-NAMED");
    const { content: heuristic } = await model({ requirementId: "REQ-NAMED" });
    expect(reqStep(heuristic.applyPlan).id).toBe("REQ-NAMED");
  });

  test("reads the source from the sources list, then a default", async () => {
    manifestState();
    for (const [args, source] of [
      [{ source: "  ", sourceFiles: ["docs/a.md", "docs/b.md"] }, "docs/a.md"],
      [{ source: undefined, sourceFiles: [] }, "mcp://kibi/model-requirement"],
    ] as const) {
      const { content } = await model({ ...PROVIDED, ...args }, null);
      expect(content.source).toBe(source);
    }
  });
});

describe("modeling below the threshold", () => {
  test("tags each fact as an open ontology gap and explains the downgrade", async () => {
    manifestState();
    const { result, content } = await model(
      { ...PROVIDED, confidence: 0.3 },
      null,
    );
    expect(content.isStrict).toBe(false);
    const facts = content.applyPlan.filter((step) => step.type === "fact");
    expect(facts.length).toBeGreaterThan(0);
    for (const fact of facts) {
      const tags = fact.properties.tags as string[];
      expect(tags.filter((tag) => tag === "review:ontology-gap")).toHaveLength(
        1,
      );
      expect(fact.properties.claim_key).toBeUndefined();
    }
    for (const step of content.applyPlan.filter(
      (other) => other.type !== "fact",
    ))
      expect(step.properties.tags as string[]).not.toContain(
        "review:ontology-gap",
      );
    expect(content.warnings).toEqual([
      {
        kind: "low_confidence_observation_downgrade",
        message:
          "Claim confidence 0.30 is below the strict threshold 0.70, so Kibi emitted a review:ontology-gap observation instead of strict subject/property facts. The clause stays unresolved: the observation does not ground it.",
        nextAction:
          "If this is normative, provide subjectKey, propertyKey, operator, and value explicitly, then apply the returned strict write-set sequentially.",
      },
    ]);
    expect((result.content[0] as Row).text).toBe(
      "Modeled a non-blocking observation review artifact; deterministic claim extraction stayed below the strict threshold.",
    );
  });
});

function validRule(): LogicRuleIR {
  return {
    version: LOGIC_IR_VERSION,
    kind: "rule",
    modality: "oblige",
    variables: [{ name: "X", type: "entity" }],
    head: {
      kind: "atom",
      name: "retain",
      args: [{ kind: "var", name: "X", type: "entity" }],
    },
    body: {
      kind: "atom",
      name: "customer",
      args: [{ kind: "var", name: "X", type: "entity" }],
    },
  };
}

describe("modeling a typed rule", () => {
  const TEXT = "Customer data must be retained.";
  const semanticText = TEXT;
  const key = semanticClaimKey(TEXT);

  function fakePlan(applyPlan: Row[]) {
    return spy(logicModeling, "buildLogicApplyPlan", () => ({
      claimKey: "CLAIM-L",
      semanticKey: "SEM-L",
      claimText: "claim text",
      renderedProlog: "p :- q.",
      normalized: { n: 1 },
      applyPlan,
    }));
  }

  test("hands every optional argument to the rule planner", async () => {
    manifestState();
    const planner = fakePlan([]);
    await model({
      text: TEXT,
      logic: validRule(),
      requirementId: "REQ-R",
      existingLogicClaims: ["CLAIM-A"],
      claimKey: "CLAIM-K",
      claimText: "k",
    });
    await model({ text: TEXT, logic: validRule(), requirementId: 5 });
    expect(planner.mock.calls).toStrictEqual([
      [
        {
          text: TEXT,
          logic: validRule(),
          source: "docs/r.md",
          requirementId: "REQ-R",
          existingLogicClaims: ["CLAIM-A"],
          claimKey: "CLAIM-K",
          claimText: "k",
        },
      ],
      [{ text: TEXT, logic: validRule(), source: "docs/r.md" }],
    ]);
  });

  test("returns the rule plan with the advisor's roles", async () => {
    manifestState({ state: "missing", warning: "W" });
    const fact = {
      type: "fact",
      properties: {
        semantic_text: semanticText,
        semantic_inventory: [{ claim_key: key, role: "old" }],
      },
    };
    const noText = {
      type: "req",
      properties: {
        semantic_text: 3,
        semantic_inventory: [{ claim_key: key }],
      },
    };
    const noInventory = {
      type: "req",
      properties: { semantic_text: semanticText, semantic_inventory: "x" },
    };
    const inventory = [
      null,
      3,
      { claim_key: 5, role: "kept" },
      { claim_key: "CLAIM-NONE", role: "kept" },
      { claim_key: key, role: "old" },
    ];
    fakePlan([
      fact,
      noText,
      noInventory,
      {
        type: "req",
        properties: {
          semantic_text: semanticText,
          semantic_inventory: inventory,
        },
      },
    ]);
    const { result, content } = await model({
      text: TEXT,
      logic: validRule(),
      existingLogicClaims: ["CLAIM-A", "CLAIM-L"],
    });
    const role = advisorPropositionRole(semanticText, key);
    expect(role).not.toBeNull();
    expect(result.applyPlan[0]).toBe(fact);
    expect(result.applyPlan[1]).toBe(noText);
    expect(result.applyPlan[2]).toBe(noInventory);
    expect(result.applyPlan[3]).toStrictEqual({
      type: "req",
      properties: {
        semantic_text: semanticText,
        semantic_inventory: [
          null,
          3,
          { claim_key: 5, role: "kept" },
          { claim_key: "CLAIM-NONE", role: "kept" },
          { claim_key: key, role },
        ],
      },
    });
    const writeSet = buildStrictWriteSet({
      claim: extractRequirementClaim({
        text: TEXT,
        source: "docs/r.md",
      } as never).claim,
      statement: TEXT,
    });
    expect(result.writeSet).toStrictEqual(writeSet);
    expect(result.migrationWarning).toBe("W");
    expect(result.content).toEqual([
      {
        type: "text",
        text: "Modeled typed kibi.logic.v1 rule SEM-L; apply the returned schema, rule, and requirement steps sequentially.",
      },
    ]);
    expect(content).toMatchObject({
      statement: TEXT,
      claimKey: "CLAIM-L",
      logicClaims: ["CLAIM-A", "CLAIM-L"],
      source: "docs/r.md",
      isStrict: false,
      confidence: 1,
      warnings: [],
      migrationWarning: "W",
      logic: {
        semanticKey: "SEM-L",
        claimKey: "CLAIM-L",
        claimText: "claim text",
        renderedProlog: "p :- q.",
        normalized: { n: 1 },
      },
    });
    expect(content.writeSet as unknown).toStrictEqual(writeSet);
    expect(content.applyPlan as unknown).toBe(result.applyPlan);
    expect(
      (await model({ text: TEXT, logic: validRule(), confidence: 0.4 })).content
        .confidence,
    ).toBe(0.4);
    expect(
      (await model({ text: TEXT, logic: validRule() })).content.logicClaims,
    ).toEqual(["CLAIM-L"]);
    expect(
      (await model({ text: TEXT, logic: validRule(), confidence: 0 })).content
        .confidence,
    ).toBe(0);
  });

  test("routes a translatable conditional clause to the rule lane", async () => {
    manifestState();
    const planner = fakePlan([]);
    const text = "Checkout may happen only when the cart total is positive.";
    const { content } = await model({ text });
    expect(planner.mock.calls).toHaveLength(1);
    expect(content.confidence).toBe(0.8);
    expect((await model({ text, confidence: 0.5 })).content.confidence).toBe(
      0.5,
    );
    // A provided claim is never read as a conditional clause.
    const provided = await model({ text, ...PROVIDED }, null);
    expect(planner.mock.calls).toHaveLength(2);
    expect(provided.content.isStrict).toBe(true);
  });
});

describe("an untranslatable conditional clause", () => {
  const TEXT =
    "  Café refunds must not be issued unless the manager approves.  ";
  const statement =
    "Café refunds must not be issued unless the manager approves.";

  test("records the clause as an ontology gap on a named requirement", async () => {
    manifestState({ state: "missing", warning: "W" });
    const { result, content } = await model(
      { text: TEXT, requirementId: "REQ-C", existingLogicClaims: ["CLAIM-A"] },
      null,
    );
    const claimText = normalizeSemanticClause(content.statement as string);
    const claimKey = semanticClaimKey(claimText);
    const semanticText = TEXT.trim();
    const start = semanticText.indexOf(claimText);
    expect(start).toBe(0);
    const reason = (content.warnings[0]?.message as string).replace(
      / The clause stays unresolved: Kibi emitted no strict property and no observation for it\.$/,
      "",
    );
    expect(result.applyPlan).toStrictEqual([
      {
        type: "req",
        id: "REQ-C",
        properties: {
          title: "Café refunds must not be issued unless the manager approves",
          status: "open",
          source: "docs/r.md",
          semantic_text: semanticText,
          logic_claims: ["CLAIM-A", claimKey],
          semantic_clauses: [claimText],
          semantic_inventory_version: "kibi.semantic-inventory.v1",
          semantic_source_field: "semantic_text",
          semantic_source_hash: semanticSourceHash(semanticText),
          semantic_inventory: [
            {
              claim_key: claimKey,
              claim_text: claimText,
              role:
                advisorPropositionRole(semanticText, claimKey) ??
                modeledClaimRole(claimText),
              status: "ontology_gap",
              span: { start: 0, end: Buffer.byteLength(claimText, "utf8") },
              reason,
            },
          ],
        },
        relationships: [],
      },
    ]);
    expect(reason.length).toBeGreaterThan(0);
    expect(result.content).toEqual([
      {
        type: "text",
        text: "Recognised a conditional requirement but could not translate it; it stays unresolved until a typed kibi.logic.v1 rule is supplied.",
      },
    ]);
    const writeSet = buildStrictWriteSet({
      claim: extractRequirementClaim({
        text: TEXT,
        source: "docs/r.md",
      } as never).claim,
      statement,
    });
    expect(result.writeSet).toStrictEqual(writeSet);
    expect(result.migrationWarning).toBe("W");
    expect(content).toMatchObject({
      statement,
      claimKey,
      logicClaims: ["CLAIM-A", claimKey],
      source: "docs/r.md",
      sourceFiles: [],
      isStrict: false,
      confidence: 0,
      migrationWarning: "W",
      warnings: [
        {
          kind: "unresolved_conditional_clause",
          message: `${reason} The clause stays unresolved: Kibi emitted no strict property and no observation for it.`,
          nextAction:
            "Pass logic with a kibi.logic.v1 rule that forbids the action unless the condition holds, or call kb_model with mode predicates when the condition is a domain relation, then apply the returned steps sequentially.",
        },
      ],
    });
    expect(content.writeSet as unknown).toStrictEqual(writeSet);
    expect(content.applyPlan as unknown).toBe(result.applyPlan);
  });

  test("places the clause by bytes after a prefix, with no plan for an unnamed requirement", async () => {
    manifestState();
    const text =
      "- Café refunds must not be issued unless the manager approves.";
    const { result, content } = await model(
      { text, requirementId: "REQ-C" },
      null,
    );
    const claimText = normalizeSemanticClause(content.statement as string);
    expect(claimText).toBe(
      "Café refunds must not be issued unless the manager approves",
    );
    const properties = result.applyPlan[0]?.properties as Row;
    expect(properties.logic_claims).toEqual([semanticClaimKey(claimText)]);
    expect(properties.title).toBe(claimText);
    expect((properties.semantic_inventory as Row[])[0]?.span).toEqual({
      start: 2,
      end: 62,
    });
    const untitled = await model(
      {
        text: ". Refunds must not be issued unless the manager approves.",
        requirementId: "REQ-C",
      },
      null,
    );
    expect((untitled.result.applyPlan[0]?.properties as Row).title).toBe(
      "Conditional requirement",
    );
    expect((await model({ text: TEXT }, null)).result.applyPlan).toEqual([]);
    expect(
      (await model({ text: TEXT, requirementId: 7 }, null)).result.applyPlan,
    ).toEqual([]);
  });
});

describe("the migration warning", () => {
  test("is the manifest's warning unless it is current", async () => {
    manifestState({ state: "missing", warning: "W" });
    expect(await getWorkspaceMigrationWarning("/w")).toBe("W");
    for (const restore of restores.splice(0)) restore();
    manifestState({ state: "ok", warning: "ignored" });
    expect(await getWorkspaceMigrationWarning("/w")).toBeNull();
  });
});

describe("the operation", () => {
  test("models with the context's store and workspace", async () => {
    const status = manifestState();
    const calls = alignment(null);
    const context = {
      workspaceRoot: "/ws",
      prolog: {},
    } as unknown as OperationContext;
    await executeModelRequirement(
      { text: STATEMENT, source: "docs/r.md", ...PROVIDED } as never,
      context,
    );
    expect(calls.mock.calls[0]?.[0]).toBe(context);
    expect(status.mock.calls).toEqual([["/ws"]]);
  });
});
