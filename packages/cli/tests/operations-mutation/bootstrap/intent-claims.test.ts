import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import { renderRequirementBody } from "../../../src/entity-body-context.js";
import * as helpers from "../../../src/operations/bootstrap/candidate-helpers.js";
import { asImportedRule } from "../../../src/operations/bootstrap/candidate-helpers.js";
import * as restatement from "../../../src/operations/bootstrap/claim-restatement.js";
import { buildIntentClaimCandidates } from "../../../src/operations/bootstrap/intent-claims.js";
import * as claims from "../../../src/operations/bootstrap/requirement-claims.js";
import type {
  BootstrapDeclaredContext,
  BootstrapIntentClaim,
  BootstrapKnowledgeSource,
} from "../../../src/operations/bootstrap/types.js";
import * as strict from "../../../src/utils/strict-modeling.js";

const spies: { mockRestore: () => void }[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
});

const digest = (...parts: string[]) =>
  createHash("sha256")
    .update(parts.join("\u0000"))
    .digest("hex")
    .slice(0, 16)
    .toUpperCase();

const SOURCE: BootstrapKnowledgeSource = {
  id: "jira",
  kind: "issue_tracker",
  title: "Billing epic",
  locator: "https://jira/BILL-1",
  authority: "authoritative",
} as BootstrapKnowledgeSource;

const CLAIM: BootstrapIntentClaim = {
  statement: "The invoice must be enabled.",
  sourceId: "jira",
  reference: "BILL-1#c2",
  excerpt: "invoice must be enabled",
};

const NONE = new Set<string>();

function context(
  intentClaims: readonly BootstrapIntentClaim[] | undefined,
  knowledgeSources: readonly BootstrapKnowledgeSource[] | undefined = [SOURCE],
  conflicts?: BootstrapDeclaredContext["conflicts"],
): BootstrapDeclaredContext {
  return {
    sourceOfTruthPaths: [],
    sourceOfTruthNotes: [],
    priorityRoots: [],
    verificationAnchors: [],
    ...(knowledgeSources ? { knowledgeSources } : {}),
    ...(intentClaims ? { intentClaims } : {}),
    ...(conflicts ? { conflicts } : {}),
  };
}

/** Replace the strict write set with a small plan built from the claim. */
function fakeStrictPlan(isStrict = true) {
  const writeSet = spyOn(strict, "buildStrictWriteSet").mockImplementation(
    () =>
      ({
        isStrict,
        req: { id: "REQ-A" },
        relationships: [
          { type: "constrains", from: "REQ-A", to: "FACT-S", extra: 1 },
        ],
      }) as unknown as ReturnType<typeof strict.buildStrictWriteSet>,
  );
  const plan = spyOn(helpers, "strictPlan").mockImplementation(() => [
    { type: "fact", id: "FACT-S", properties: { title: "s" } },
    { type: "req", id: "REQ-A", properties: { title: "t" } },
  ]);
  spies.push(writeSet, plan);
  return writeSet;
}

function noRestatement() {
  const spy = spyOn(restatement, "findRestatement").mockImplementation(
    () => null,
  );
  spies.push(spy);
  return spy;
}

const body = (claim: BootstrapIntentClaim, source = SOURCE) =>
  renderRequirementBody({
    statement: claim.statement,
    context: claim.rationale,
    source: {
      excerpt: claim.excerpt,
      title: source.title,
      reference: claim.reference,
    },
  });

describe("intent claims that become requirements", () => {
  test("a modeled claim becomes a cited requirement candidate", () => {
    const writeSet = fakeStrictPlan();
    const restate = noRestatement();
    const claim = { ...CLAIM, rationale: "Customers need it." };
    const result = buildIntentClaimCandidates(
      context([claim], [{ ...SOURCE, connector: "jira-mcp" }]),
      NONE,
      0.5,
      undefined,
      [{ id: "REQ-OLD", title: "x", semanticText: "y" }],
    );
    expect(restate.mock.calls).toStrictEqual([
      [
        [claim.statement, claim.excerpt],
        [{ id: "REQ-OLD", title: "x", semanticText: "y" }],
      ],
    ]);
    expect(writeSet.mock.calls[0]?.[0]).toStrictEqual({
      claim: {
        source: "knowledge-source:jira",
        subjectKey: "invoice.enabled",
        propertyKey: "enabled",
        operator: "bool",
        value: true,
        confidence: 0.9,
        provenance: "jira:BILL-1#c2",
      },
      statement: claim.statement,
    });
    expect(result).toStrictEqual({
      candidates: [
        {
          candidateId: "claim:jira:req-a",
          entityType: "req",
          title: claim.statement,
          sourceKind: "intent_claim",
          sourcePath: "BILL-1#c2",
          confidence: 0.9,
          confidenceBand: "high",
          evidence: [
            "intent_claim:jira:BILL-1#c2",
            "knowledge_source:issue_tracker:https://jira/BILL-1",
            "source_authority:authoritative",
            "connector:jira-mcp",
          ],
          relationships: [{ type: "constrains", from: "REQ-A", to: "FACT-S" }],
          applyPlan: [
            { type: "fact", id: "FACT-S", properties: { title: "s" } },
            {
              ...asImportedRule(
                {
                  type: "req",
                  id: "REQ-A",
                  properties: { title: "t", rationale: "Customers need it." },
                },
                "jira:BILL-1#c2",
              ),
              document: {
                body: body(claim, { ...SOURCE, connector: "jira-mcp" }),
              },
            },
          ],
        },
      ],
      sourceOnlySignals: [],
      suppressed: [],
      diagnostics: [],
    });
  });

  test("the claim's component wins over its source's", () => {
    fakeStrictPlan();
    noRestatement();
    const plan = spyOn(claims, "planSubjectKey");
    spies.push(plan);
    const registry = {} as claims.SubjectKeyRegistry;
    buildIntentClaimCandidates(
      context(
        [CLAIM, { ...CLAIM, reference: "r2", component: "ledger" }],
        [{ ...SOURCE, component: "billing" }],
      ),
      NONE,
      0.5,
      registry,
    );
    expect(plan.mock.calls.map((call) => [call[2], call[3], call[4]])).toEqual([
      ["billing", registry, "jira:BILL-1#c2"],
      ["ledger", registry, "jira:r2"],
    ]);
  });

  test("a supporting source and a step with no properties object", () => {
    fakeStrictPlan();
    noRestatement();
    spyOn(helpers, "strictPlan").mockImplementation(() => [
      { type: "req", id: "REQ-A", properties: null },
    ]);
    const result = buildIntentClaimCandidates(
      context(
        [{ ...CLAIM, rationale: "Why." }],
        [{ ...SOURCE, authority: "supporting" }],
      ),
      NONE,
      0.5,
    );
    const [candidate] = result.candidates;
    expect(candidate?.confidence).toBe(0.82);
    expect(candidate?.confidenceBand).toBe("medium");
    expect(candidate?.evidence).toContain("source_authority:supporting");
    expect(
      (candidate?.applyPlan[0] as { properties: Record<string, unknown> })
        .properties.rationale,
    ).toBe("Why.");
  });

  test("a requirement with no rationale keeps its properties", () => {
    fakeStrictPlan();
    noRestatement();
    const result = buildIntentClaimCandidates(context([CLAIM]), NONE, 0.5);
    expect(
      (result.candidates[0]?.applyPlan[1] as { properties: unknown })
        .properties,
    ).toStrictEqual(
      asImportedRule(
        { type: "req", id: "REQ-A", properties: { title: "t" } },
        "jira:BILL-1#c2",
      ).properties,
    );
  });

  test("subject key diagnostics are reported", () => {
    fakeStrictPlan();
    noRestatement();
    spies.push(
      spyOn(claims, "planSubjectKey").mockImplementation(() => ({
        resolution: { ok: true, subjectKey: "billing.invoice" },
        diagnostics: ["subject-key-shortened: x"],
      })),
    );
    expect(
      buildIntentClaimCandidates(context([CLAIM]), NONE, 0.5).diagnostics,
    ).toStrictEqual(["subject-key-shortened: x"]);
  });

  test("a near restatement is planned with a review diagnostic", () => {
    fakeStrictPlan();
    spies.push(
      spyOn(restatement, "findRestatement").mockImplementation(() => ({
        kind: "near",
        requirementId: "REQ-OLD",
        field: "title",
        score: 0.8,
      })),
    );
    const result = buildIntentClaimCandidates(context([CLAIM]), NONE, 0.5);
    expect(result.candidates[0]?.evidence).toStrictEqual([
      "intent_claim:jira:BILL-1#c2",
      "knowledge_source:issue_tracker:https://jira/BILL-1",
      "source_authority:authoritative",
      "possible_restatement:REQ-OLD",
    ]);
    expect(result.diagnostics).toStrictEqual([
      "Intent claim at jira:BILL-1#c2 closely restates current requirement REQ-OLD (token overlap 0.8 with its title, not an exact match); it is still planned. Review it before apply: drop the claim if it states the same rule, or keep it and link the two with restates or supersedes.",
    ]);
  });

  test("a near restatement of semantic text that needs authoring", () => {
    fakeStrictPlan(false);
    spies.push(
      spyOn(restatement, "findRestatement").mockImplementation(() => ({
        kind: "near",
        requirementId: "REQ-OLD",
        field: "semantic_text",
        score: 0.75,
      })),
    );
    const result = buildIntentClaimCandidates(context([CLAIM]), NONE, 0.5);
    expect(result.candidates).toStrictEqual([]);
    expect(result.sourceOnlySignals).toStrictEqual([
      {
        kind: "req",
        title:
          "Author requirement from Billing epic BILL-1#c2: The invoice must be enabled.",
        sourcePath: "BILL-1#c2",
        confidence: 0.9,
        evidence: [
          "intent_claim:jira:BILL-1#c2",
          "knowledge_source:issue_tracker:https://jira/BILL-1",
          "source_authority:authoritative",
          "possible_restatement:REQ-OLD",
        ],
        claimStatement: "The invoice must be enabled.",
      },
    ]);
    expect(result.diagnostics).toStrictEqual([
      "Intent claim at jira:BILL-1#c2 closely restates current requirement REQ-OLD (token overlap 0.75 with its semantic text, not an exact match); it is still planned. Review it before apply: drop the claim if it states the same rule, or keep it and link the two with restates or supersedes.",
    ]);
  });

  test("an exact restatement is counted as the existing requirement", () => {
    const writeSet = fakeStrictPlan();
    spies.push(
      spyOn(restatement, "findRestatement").mockImplementation(() => ({
        kind: "exact",
        requirementId: "REQ-OLD",
        field: "semantic_text",
        score: 1,
      })),
    );
    expect(
      buildIntentClaimCandidates(context([CLAIM]), NONE, 0.5),
    ).toStrictEqual({
      candidates: [],
      sourceOnlySignals: [],
      suppressed: [
        {
          candidateId: "",
          reason: "entity_exists",
          sourcePath: "BILL-1#c2",
          entityType: "req",
          statement: CLAIM.statement,
          sourceId: "jira",
          matchedId: "REQ-OLD",
          matchedBy: "restatement",
          matchedField: "semantic_text",
        },
      ],
      diagnostics: [],
    });
    expect(writeSet).not.toHaveBeenCalled();
  });

  test("the real restatement check reads the current requirements", () => {
    fakeStrictPlan();
    const result = buildIntentClaimCandidates(context([CLAIM]), NONE, 0.5);
    expect(result.candidates).toHaveLength(1);
    const exact = buildIntentClaimCandidates(
      context([CLAIM]),
      NONE,
      0.5,
      undefined,
      [{ id: "REQ-OLD", title: CLAIM.statement, semanticText: "" }],
    );
    expect(exact.suppressed[0]?.matchedId).toBe("REQ-OLD");
  });

  test("a claim below the confidence floor is suppressed and left to author", () => {
    fakeStrictPlan();
    noRestatement();
    const result = buildIntentClaimCandidates(context([CLAIM]), NONE, 0.91);
    expect(result.candidates).toStrictEqual([]);
    expect(result.suppressed).toStrictEqual([
      {
        candidateId: "claim:jira:req-a",
        reason: "below_min_confidence",
        sourcePath: "BILL-1#c2",
        entityType: "req",
      },
    ]);
    expect(result.sourceOnlySignals.map((s) => s.title)).toStrictEqual([
      "Author requirement from Billing epic BILL-1#c2: The invoice must be enabled.",
    ]);
    expect(
      buildIntentClaimCandidates(context([CLAIM]), NONE, 0.9).candidates,
    ).toHaveLength(1);
  });

  test("a requirement that already exists is suppressed", () => {
    fakeStrictPlan();
    noRestatement();
    expect(
      buildIntentClaimCandidates(context([CLAIM]), new Set(["REQ-A"]), 0.5),
    ).toStrictEqual({
      candidates: [],
      sourceOnlySignals: [],
      suppressed: [
        {
          candidateId: "claim:jira:req-a",
          reason: "entity_exists",
          sourcePath: "BILL-1#c2",
          entityType: "req",
        },
      ],
      diagnostics: [],
    });
    const both = buildIntentClaimCandidates(
      context([CLAIM]),
      new Set(["REQ-A"]),
      0.95,
    );
    expect(both.suppressed.map((s) => s.reason)).toStrictEqual([
      "below_min_confidence",
      "entity_exists",
    ]);
    expect(both.sourceOnlySignals).toStrictEqual([]);
    const atFloor = buildIntentClaimCandidates(
      context([CLAIM]),
      new Set(["REQ-A"]),
      0.9,
    );
    expect(atFloor.suppressed.map((s) => s.reason)).toStrictEqual([
      "entity_exists",
    ]);
  });
});

describe("intent claims that need authoring", () => {
  test("a statement no claim reads", () => {
    const writeSet = fakeStrictPlan();
    noRestatement();
    const claim = { ...CLAIM, statement: "Is it enabled?" };
    const result = buildIntentClaimCandidates(context([claim]), NONE, 0.5);
    expect(writeSet).not.toHaveBeenCalled();
    expect(result.diagnostics).toStrictEqual([
      "Intent claim needs authoring at jira:BILL-1#c2: Is it enabled?",
    ]);
    expect(result.sourceOnlySignals).toHaveLength(1);
  });

  test("a subject key outside the convention", () => {
    const writeSet = fakeStrictPlan();
    noRestatement();
    spies.push(
      spyOn(claims, "planSubjectKey").mockImplementation(() => ({
        resolution: { ok: false, reason: "subject key is too deep" },
        diagnostics: [],
      })),
    );
    const result = buildIntentClaimCandidates(context([CLAIM]), NONE, 0.5);
    expect(writeSet).not.toHaveBeenCalled();
    expect(result.diagnostics).toStrictEqual([
      "Intent claim at jira:BILL-1#c2 was not planned as a requirement: its subject key is too deep. Declare component on the claim or on knowledge source jira and re-plan, or author it with kb_model: The invoice must be enabled.",
    ]);
  });

  test("an extraction error, thrown as an error or a value", () => {
    noRestatement();
    const thrower = spyOn(claims, "claimFor").mockImplementation(() => {
      throw new Error("bad claim");
    });
    spies.push(thrower);
    expect(
      buildIntentClaimCandidates(context([CLAIM]), NONE, 0.5).diagnostics,
    ).toStrictEqual([
      "Intent claim extraction failed at jira:BILL-1#c2: bad claim",
    ]);
    thrower.mockImplementation(() => {
      throw "boom";
    });
    const result = buildIntentClaimCandidates(context([CLAIM]), NONE, 0.5);
    expect(result.diagnostics).toStrictEqual([
      "Intent claim extraction failed at jira:BILL-1#c2: boom",
    ]);
    expect(result.sourceOnlySignals).toHaveLength(1);
  });
});

describe("claims that are not planned", () => {
  test("an undeclared source", () => {
    expect(
      buildIntentClaimCandidates(
        context([{ ...CLAIM, sourceId: "wiki" }], undefined),
        NONE,
        0.5,
      ),
    ).toStrictEqual({
      candidates: [],
      sourceOnlySignals: [],
      suppressed: [],
      diagnostics: [
        'Intent claim cites an undeclared knowledge source "wiki" (BILL-1#c2); declare it in knowledgeSources or drop the claim.',
      ],
    });
  });

  test("a stale source", () => {
    const stale = { ...SOURCE, authority: "stale" } as BootstrapKnowledgeSource;
    expect(
      buildIntentClaimCandidates(
        context(
          [CLAIM, { ...CLAIM, kind: "observation", reference: "r2" }],
          [stale],
        ),
        NONE,
        0.5,
      ).suppressed,
    ).toStrictEqual([
      {
        candidateId: "",
        reason: "stale_knowledge_source",
        sourcePath: "BILL-1#c2",
        entityType: "req",
        statement: CLAIM.statement,
        sourceId: "jira",
      },
      {
        candidateId: "",
        reason: "stale_knowledge_source",
        sourcePath: "r2",
        entityType: "fact",
        statement: CLAIM.statement,
        sourceId: "jira",
      },
    ]);
  });

  test("a claim without an excerpt, unless it is an open question", () => {
    const result = buildIntentClaimCandidates(
      context([
        { ...CLAIM, excerpt: undefined },
        { ...CLAIM, excerpt: "", kind: "observation", reference: "r2" },
        {
          ...CLAIM,
          excerpt: undefined,
          kind: "open_question",
          reference: "r3",
        },
      ]),
      NONE,
      0.5,
    );
    expect(result.suppressed).toStrictEqual([
      {
        candidateId: "",
        reason: "missing_excerpt",
        sourcePath: "BILL-1#c2",
        entityType: "req",
        statement: CLAIM.statement,
        sourceId: "jira",
      },
      {
        candidateId: "",
        reason: "missing_excerpt",
        sourcePath: "r2",
        entityType: "fact",
        statement: CLAIM.statement,
        sourceId: "jira",
      },
    ]);
    expect(result.diagnostics).toStrictEqual([
      "Claim at jira:BILL-1#c2 is an intent claim without an excerpt; quote the passage it came from in excerpt so the entity keeps it, then re-plan.",
      "Claim at jira:r2 is an observation claim without an excerpt; quote the passage it came from in excerpt so the entity keeps it, then re-plan.",
    ]);
    expect(result.candidates.map((c) => c.sourcePath)).toStrictEqual(["r3"]);
  });

  test("no declared claims or sources", () => {
    expect(
      buildIntentClaimCandidates(
        {
          sourceOfTruthPaths: [],
          sourceOfTruthNotes: [],
          priorityRoots: [],
          verificationAnchors: [],
        },
        NONE,
        0,
      ),
    ).toStrictEqual({
      candidates: [],
      sourceOnlySignals: [],
      suppressed: [],
      diagnostics: [],
    });
  });
});

describe("review claims", () => {
  const OBSERVATION: BootstrapIntentClaim = {
    ...CLAIM,
    statement: "Invoices are emailed today.",
    kind: "observation",
  };

  test("an observation becomes a cited observation fact", () => {
    const id = `FACT-BOOTSTRAP-OBSERVATION-${digest("jira", "BILL-1#c2", OBSERVATION.statement)}`;
    expect(
      buildIntentClaimCandidates(
        context([OBSERVATION], [{ ...SOURCE, authority: "supporting" }]),
        NONE,
        0.5,
      ),
    ).toStrictEqual({
      candidates: [
        {
          candidateId: `claim:jira:${id.toLowerCase()}`,
          entityType: "fact",
          title: OBSERVATION.statement,
          sourceKind: "intent_claim",
          sourcePath: "BILL-1#c2",
          confidence: 0.82,
          confidenceBand: "medium",
          evidence: [
            "intent_claim:jira:BILL-1#c2",
            "knowledge_source:issue_tracker:https://jira/BILL-1",
            "source_authority:supporting",
            "claim_kind:observation",
            "excerpt:invoice must be enabled",
          ],
          relationships: [],
          applyPlan: [
            {
              type: "fact",
              id,
              properties: {
                title: OBSERVATION.statement,
                status: "active",
                fact_kind: "observation",
                source: "knowledge-source:jira",
                text_ref: "jira:BILL-1#c2",
                tags: [
                  "bootstrap",
                  "knowledge-source:jira",
                  "claim:observation",
                ],
              },
              relationships: [],
              document: { body: body(OBSERVATION) },
            },
          ],
        },
      ],
      sourceOnlySignals: [],
      suppressed: [],
      diagnostics: [],
    });
  });

  test("an open question without an excerpt is tagged for review", () => {
    const question = {
      ...OBSERVATION,
      kind: "open_question" as const,
      excerpt: undefined,
    };
    const [candidate] = buildIntentClaimCandidates(
      context([question]),
      NONE,
      0.5,
    ).candidates;
    const id = `FACT-BOOTSTRAP-QUESTION-${digest("jira", "BILL-1#c2", question.statement)}`;
    expect(candidate?.applyPlan[0]?.id).toBe(id);
    expect(candidate?.evidence).toStrictEqual([
      "intent_claim:jira:BILL-1#c2",
      "knowledge_source:issue_tracker:https://jira/BILL-1",
      "source_authority:authoritative",
      "claim_kind:open_question",
    ]);
    expect(
      (candidate?.applyPlan[0] as { properties: { tags: string[] } }).properties
        .tags,
    ).toStrictEqual([
      "bootstrap",
      "knowledge-source:jira",
      "review:open-question",
    ]);
  });

  test("a review claim below the floor or already known is suppressed", () => {
    const id = `FACT-BOOTSTRAP-OBSERVATION-${digest("jira", "BILL-1#c2", OBSERVATION.statement)}`;
    const suppressed = (existing: ReadonlySet<string>, min: number) =>
      buildIntentClaimCandidates(context([OBSERVATION]), existing, min)
        .suppressed;
    expect(suppressed(NONE, 0.91)).toStrictEqual([
      {
        candidateId: `claim:jira:${id.toLowerCase()}`,
        reason: "below_min_confidence",
        sourcePath: "BILL-1#c2",
        entityType: "fact",
      },
    ]);
    expect(suppressed(new Set([id]), 0.5)).toStrictEqual([
      {
        candidateId: `claim:jira:${id.toLowerCase()}`,
        reason: "entity_exists",
        sourcePath: "BILL-1#c2",
        entityType: "fact",
      },
    ]);
    expect(suppressed(NONE, 0.9)).toStrictEqual([]);
    expect(suppressed(new Set([id]), 0.9)).toStrictEqual([
      {
        candidateId: `claim:jira:${id.toLowerCase()}`,
        reason: "entity_exists",
        sourcePath: "BILL-1#c2",
        entityType: "fact",
      },
    ]);
  });
});

describe("declared conflicts", () => {
  const A: BootstrapIntentClaim = {
    ...CLAIM,
    kind: "observation",
    statement: "Refunds take 3 days.",
    reference: "a",
    excerpt: "three\n   days",
  };
  const B: BootstrapIntentClaim = {
    ...CLAIM,
    kind: "observation",
    statement: "Refunds take 5 days.",
    reference: "b",
    excerpt: undefined,
    sourceId: "wiki",
  };
  const WIKI = {
    ...SOURCE,
    id: "wiki",
    kind: "wiki",
    title: "",
    locator: "https://wiki",
  } as BootstrapKnowledgeSource;
  const conflict = {
    claimReferences: [
      { sourceId: "wiki", reference: "b" },
      { sourceId: "jira", reference: "a" },
    ],
    note: "They disagree.",
  };

  test("a conflict between declared claims becomes a review fact", () => {
    const result = buildIntentClaimCandidates(
      context([A, B], [SOURCE, WIKI], [conflict]),
      NONE,
      0.5,
    );
    const id = `FACT-BOOTSTRAP-CONFLICT-${digest("jira:a", "wiki:b", "They disagree.")}`;
    const title = "Conflict between wiki:b and jira:a: They disagree.";
    expect(result.candidates.at(-1)).toStrictEqual({
      candidateId: `conflict:${id.toLowerCase()}`,
      entityType: "fact",
      title,
      sourceKind: "intent_claim",
      sourcePath: "wiki:b, jira:a",
      confidence: 0.9,
      confidenceBand: "high",
      evidence: [
        "intent_claim:wiki:b",
        "knowledge_source:wiki:https://wiki",
        "intent_claim:jira:a",
        "knowledge_source:issue_tracker:https://jira/BILL-1",
      ],
      relationships: [],
      applyPlan: [
        {
          type: "fact",
          id,
          properties: {
            title,
            status: "active",
            fact_kind: "observation",
            source: "bootstrap:declared-conflict",
            text_ref: "wiki:b; jira:a",
            tags: [
              "bootstrap",
              "review:conflict",
              "knowledge-source:wiki",
              "knowledge-source:jira",
            ],
          },
          relationships: [],
          document: {
            body: "They disagree.\n\n## Evidence\n\n- b: Refunds take 5 days.\n- Billing epic - a: Refunds take 3 days.\n  > three days\n",
          },
        },
      ],
    });
  });

  test("a conflict citing an undeclared source keeps the reference only", () => {
    const orphan = { ...A, sourceId: "gone", reference: "z" };
    const result = buildIntentClaimCandidates(
      context(
        [A, orphan],
        [SOURCE],
        [
          {
            claimReferences: [
              { sourceId: "jira", reference: "a" },
              { sourceId: "gone", reference: "z" },
              { sourceId: "jira", reference: "a" },
            ],
            note: "n",
          },
        ],
      ),
      NONE,
      0.5,
    );
    const fact = result.candidates.at(-1);
    expect(fact?.evidence).toStrictEqual([
      "intent_claim:jira:a",
      "knowledge_source:issue_tracker:https://jira/BILL-1",
      "intent_claim:gone:z",
      "intent_claim:jira:a",
      "knowledge_source:issue_tracker:https://jira/BILL-1",
    ]);
    const step = fact?.applyPlan[0] as {
      properties: { tags: string[] };
      document: { body: string };
    };
    expect(step.properties.tags).toStrictEqual([
      "bootstrap",
      "review:conflict",
      "knowledge-source:jira",
      "knowledge-source:gone",
    ]);
    expect(step.document.body).toBe(
      "n\n\n## Evidence\n\n- Billing epic - a: Refunds take 3 days.\n  > three days\n- z: Refunds take 3 days.\n  > three days\n- Billing epic - a: Refunds take 3 days.\n  > three days\n",
    );
  });

  test("a conflict citing an undeclared claim is reported, not planned", () => {
    const result = buildIntentClaimCandidates(
      context(
        [A],
        [SOURCE],
        [
          {
            claimReferences: [
              { sourceId: "jira", reference: "a" },
              { sourceId: "jira", reference: "q" },
              { sourceId: "wiki", reference: "a" },
            ],
            note: "n",
          },
        ],
      ),
      NONE,
      0.5,
    );
    expect(result.candidates).toHaveLength(1);
    expect(result.diagnostics).toStrictEqual([
      'Conflict "n" cites claim(s) not declared in intentClaims: jira:q, wiki:a; declare them or correct the reference.',
    ]);
  });

  test("conflicts with no declared claims", () => {
    expect(
      buildIntentClaimCandidates(
        context(
          undefined,
          [SOURCE],
          [
            {
              claimReferences: [{ sourceId: "jira", reference: "a" }],
              note: "n",
            },
          ],
        ),
        NONE,
        0.5,
      ).diagnostics,
    ).toStrictEqual([
      'Conflict "n" cites claim(s) not declared in intentClaims: jira:a; declare them or correct the reference.',
    ]);
  });

  test("a conflict below the floor or already known is suppressed", () => {
    const id = `FACT-BOOTSTRAP-CONFLICT-${digest("jira:a", "wiki:b", "They disagree.")}`;
    const run = (existing: ReadonlySet<string>, min: number) =>
      buildIntentClaimCandidates(
        context([A, B], [SOURCE, WIKI], [conflict]),
        existing,
        min,
      ).suppressed.filter((s) => String(s.candidateId).startsWith("conflict"));
    expect(run(NONE, 0.91)).toStrictEqual([
      {
        candidateId: `conflict:${id.toLowerCase()}`,
        reason: "below_min_confidence",
        sourcePath: "wiki:b, jira:a",
        entityType: "fact",
      },
    ]);
    expect(run(new Set([id]), 0.5)).toStrictEqual([
      {
        candidateId: `conflict:${id.toLowerCase()}`,
        reason: "entity_exists",
        sourcePath: "wiki:b, jira:a",
        entityType: "fact",
      },
    ]);
    expect(run(NONE, 0.9)).toStrictEqual([]);
  });
});
