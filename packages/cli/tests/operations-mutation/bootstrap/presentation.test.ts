import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as guidance from "../../../src/operations/bootstrap/guidance.js";
import {
  normalizeBootstrapContext,
  presentBootstrap,
  suppressionCounts,
} from "../../../src/operations/bootstrap/presentation.js";
import type {
  ActivationPolicy,
  BootstrapContext,
  Candidate,
  DiscoverySummary,
  SourceOnlySignal,
} from "../../../src/operations/bootstrap/types.js";
import { bootstrapPlanHash } from "../../../src/operations/bootstrap/types.js";

const spies: { mockRestore: () => void }[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
});

const EMPTY = {
  sourceOfTruthPaths: [],
  sourceOfTruthNotes: [],
  priorityRoots: [],
  verificationAnchors: [],
};

describe("normalizeBootstrapContext", () => {
  test("nothing declared", () => {
    expect(normalizeBootstrapContext()).toStrictEqual(EMPTY);
    expect(normalizeBootstrapContext({})).toStrictEqual(EMPTY);
    expect(
      normalizeBootstrapContext({
        projectSummary: "   ",
        knowledgeSources: [],
        intentClaims: [],
        conflicts: [],
      }),
    ).toStrictEqual(EMPTY);
  });

  test("lists are trimmed, deduplicated and keep their order", () => {
    expect(
      normalizeBootstrapContext({
        projectSummary: "  A compiler  ",
        sourceOfTruthPaths: [" docs ", "docs", "", "  ", "src"],
        sourceOfTruthNotes: ["n"],
        priorityRoots: ["b", "a", "b"],
        verificationAnchors: ["bun test "],
      }),
    ).toStrictEqual({
      projectSummary: "A compiler",
      sourceOfTruthPaths: ["docs", "src"],
      sourceOfTruthNotes: ["n"],
      priorityRoots: ["b", "a"],
      verificationAnchors: ["bun test"],
    });
  });

  test("knowledge sources need an id, title, locator, kind and authority", () => {
    const valid = {
      id: " jira ",
      kind: "issue_tracker",
      title: " Billing ",
      locator: " https://jira ",
      authority: "authoritative",
    } as const;
    const sources = [
      {
        ...valid,
        connector: " atlassian ",
        notes: " read it ",
        component: " billing ",
      },
      { ...valid, title: "Again" },
      {
        ...valid,
        id: "blank-connector",
        connector: " ",
        notes: "",
        component: " ",
      },
      { ...valid, id: "  " },
      { ...valid, id: "t", title: " " },
      { ...valid, id: "l", locator: "" },
      { ...valid, id: "k", kind: "forum" },
      { ...valid, id: "a", authority: "rumour" },
      { kind: "wiki", authority: "stale" },
      { id: "no-title", kind: "wiki", authority: "stale" },
      { id: "no-locator", title: "x", kind: "wiki", authority: "stale" },
      { ...valid, id: "supporting", authority: "supporting", kind: "other" },
    ] as unknown as BootstrapContext["knowledgeSources"];
    expect(
      normalizeBootstrapContext({ knowledgeSources: sources }).knowledgeSources,
    ).toStrictEqual([
      {
        id: "jira",
        kind: "issue_tracker",
        title: "Billing",
        locator: "https://jira",
        authority: "authoritative",
        connector: "atlassian",
        notes: "read it",
        component: "billing",
      },
      {
        id: "blank-connector",
        kind: "issue_tracker",
        title: "Billing",
        locator: "https://jira",
        authority: "authoritative",
      },
      {
        id: "supporting",
        kind: "other",
        title: "Billing",
        locator: "https://jira",
        authority: "supporting",
      },
    ]);
  });

  test("intent claims need a statement, source and reference, and a known kind", () => {
    const claim = {
      statement: "  Invoices   must\n be sent. ",
      sourceId: " jira ",
      reference: " BILL-1 ",
    };
    const claims = [
      {
        ...claim,
        excerpt: "  quoted\n text  ",
        component: " billing ",
        rationale: "  Because\n\n  money. ",
      },
      { ...claim, statement: "Invoices must be sent." },
      { ...claim, kind: "intent", statement: "Invoices must be sent." },
      { ...claim, kind: "observation" },
      {
        ...claim,
        kind: "open_question",
        excerpt: " ",
        component: "",
        rationale: " ",
      },
      { ...claim, kind: "rumour" },
      { ...claim, statement: "  " },
      { ...claim, sourceId: "" },
      { ...claim, reference: " " },
      { sourceId: "s", reference: "r" },
      { statement: "s", reference: "r" },
      { statement: "s", sourceId: "s" },
      { statement: "s", sourceId: "a", reference: "bc" },
      { statement: "s", sourceId: "ab", reference: "c" },
    ] as unknown as BootstrapContext["intentClaims"];
    expect(
      normalizeBootstrapContext({ intentClaims: claims }).intentClaims,
    ).toStrictEqual([
      {
        statement: "Invoices must be sent.",
        sourceId: "jira",
        reference: "BILL-1",
        excerpt: "quoted\n text",
        component: "billing",
        rationale: "Because money.",
      },
      {
        statement: "Invoices must be sent.",
        sourceId: "jira",
        reference: "BILL-1",
        kind: "observation",
      },
      {
        statement: "Invoices must be sent.",
        sourceId: "jira",
        reference: "BILL-1",
        kind: "open_question",
      },
      { statement: "s", sourceId: "a", reference: "bc" },
      { statement: "s", sourceId: "ab", reference: "c" },
    ]);
  });

  test("conflicts need a note and two distinct claim references", () => {
    const a = { sourceId: " jira ", reference: " a " };
    const b = { sourceId: "wiki", reference: "b" };
    const conflicts = [
      { claimReferences: [a, b, a], note: "  They\n disagree. " },
      { claimReferences: [b, a], note: "They disagree." },
      { claimReferences: [a, b], note: "Another note." },
      { claimReferences: [a, a], note: "One claim." },
      {
        claimReferences: [
          a,
          { sourceId: " ", reference: "x" },
          { sourceId: "w" },
        ],
        note: "Blank refs.",
      },
      { claimReferences: [{ reference: "x" }, b, a], note: "Missing source." },
      { claimReferences: [a, b], note: " " },
      { claimReferences: [a, b] },
      { note: "No refs." },
    ] as unknown as BootstrapContext["conflicts"];
    expect(normalizeBootstrapContext({ conflicts }).conflicts).toStrictEqual([
      {
        claimReferences: [
          { sourceId: "jira", reference: "a" },
          { sourceId: "wiki", reference: "b" },
        ],
        note: "They disagree.",
      },
      {
        claimReferences: [
          { sourceId: "jira", reference: "a" },
          { sourceId: "wiki", reference: "b" },
        ],
        note: "Another note.",
      },
      {
        claimReferences: [
          { sourceId: "wiki", reference: "b" },
          { sourceId: "jira", reference: "a" },
        ],
        note: "Missing source.",
      },
    ]);
  });

  test("conflicts whose references only join to the same text are distinct", () => {
    expect(
      normalizeBootstrapContext({
        conflicts: [
          {
            claimReferences: [
              { sourceId: "a", reference: "b" },
              { sourceId: "c", reference: "d" },
            ],
            note: "n",
          },
          {
            claimReferences: [
              { sourceId: "a", reference: "bc" },
              { sourceId: "x", reference: "d" },
            ],
            note: "n",
          },
        ],
      }).conflicts,
    ).toHaveLength(2);
    const refs = (...pairs: [string, string][]) =>
      pairs.map(([sourceId, reference]) => ({ sourceId, reference }));
    expect(
      normalizeBootstrapContext({
        conflicts: [
          {
            claimReferences: refs(["a", "b"], ["c", "d"], ["e", "f"]),
            note: "n",
          },
          { claimReferences: refs(["a", "bc\u0000d"], ["e", "f"]), note: "n" },
        ],
      }).conflicts,
    ).toHaveLength(2);
  });
});

describe("suppressionCounts", () => {
  test("counts each reason, most frequent first, then by name", () => {
    expect(
      suppressionCounts([
        { reason: "over_limit" },
        { reason: "entity_exists" },
        {},
        { reason: "over_limit" },
        { reason: "below_min_confidence" },
        { reason: "entity_exists" },
        { reason: "over_limit" },
      ]),
    ).toStrictEqual([
      { reason: "over_limit", count: 3 },
      { reason: "entity_exists", count: 2 },
      { reason: "below_min_confidence", count: 1 },
      { reason: "unspecified", count: 1 },
    ]);
    expect(suppressionCounts([])).toStrictEqual([]);
  });
});

function activation(
  overrides: Partial<ActivationPolicy> = {},
): ActivationPolicy {
  return {
    activationState: "root_uninitialized",
    activationMode: "cold_start_bootstrap",
    applyBlocked: false,
    allowCandidateGeneration: true,
    reason: "cold start",
    ...overrides,
  };
}

function summary(overrides: Partial<DiscoverySummary> = {}): DiscoverySummary {
  return {
    activationState: "root_uninitialized",
    activationMode: "cold_start_bootstrap",
    applyBlocked: false,
    reason: "cold start",
    providersRun: [],
    providerCounts: {},
    detectedLanguages: [],
    detectedTestFrameworks: [],
    excludedRoots: [],
    truncated: false,
    scanWarnings: [],
    ...overrides,
  };
}

const expected = {
  branch: "main",
  kbSnapshotId: "snap",
  workspaceSnapshot: "ws",
  sourceHashes: {},
};

function candidate(
  candidateId: string,
  applyPlan: Record<string, unknown>[],
  overrides: Partial<Candidate> = {},
): Candidate {
  return {
    candidateId,
    entityType: "req",
    title: candidateId,
    sourceKind: "typed_markdown",
    sourcePath: "docs/a.md",
    confidence: 0.8,
    confidenceBand: "high",
    evidence: [],
    relationships: [],
    applyPlan,
    ...overrides,
  };
}

function signal(sourcePath: string, evidence: string[] = []): SourceOnlySignal {
  return { kind: "req", title: "t", sourcePath, confidence: 0.5, evidence };
}

const CONFIDENCE = { level: "high", score: 0.9 };

function fakeGuidance(confidence: Record<string, unknown> = CONFIDENCE) {
  const spy = spyOn(guidance, "buildGuidance").mockImplementation(() => ({
    promptBlock: "PROMPT",
    confidence,
    actions: [{ order: 1 }],
  }));
  spies.push(spy);
  return spy;
}

type Input = Parameters<typeof presentBootstrap>[0];

function present(overrides: Partial<Input> = {}) {
  return presentBootstrap({
    root: "/repo",
    activation: activation(),
    discoverySummary: summary(),
    migrationWarning: null,
    candidates: [],
    sourceOnlySignals: [],
    suppressedCandidates: [],
    expected,
    ...overrides,
  }).structuredContent;
}

const COMPLETE: BootstrapContext = {
  projectSummary: "A compiler",
  sourceOfTruthPaths: ["docs"],
  verificationAnchors: ["bun test"],
  knowledgeSources: [
    {
      id: "wiki",
      kind: "wiki",
      title: "Team wiki",
      locator: "https://wiki",
      authority: "supporting",
    },
  ],
};

describe("presentBootstrap", () => {
  test("a ready plan, in full", () => {
    const spy = fakeGuidance();
    const step = { id: "REQ-1", type: "req" };
    const one = candidate("c1", [step]);
    const result = presentBootstrap({
      root: "/repo",
      activation: activation(),
      discoverySummary: summary({ scanWarnings: ["slow scan"] }),
      migrationWarning: null,
      bootstrapContext: COMPLETE,
      candidates: [one],
      sourceOnlySignals: [],
      suppressedCandidates: [],
      expected,
    });
    const declaredContext = normalizeBootstrapContext(COMPLETE);
    expect(spy.mock.calls).toStrictEqual([
      [
        {
          root: "/repo",
          activation: activation(),
          declared: declaredContext,
          candidates: [one],
          signals: [],
          warnings: ["slow scan"],
          offers: [],
        },
      ],
    ]);
    const discoverySummary = {
      ...summary({ scanWarnings: ["slow scan"] }),
      candidatesWithClaims: 1,
      provenanceStubs: 0,
      suppressedProvenanceStubs: 0,
    };
    const actions = [
      {
        id: "bootstrap-upsert-0001",
        kind: "upsert",
        dependsOn: [],
        payload: step,
        candidateId: "c1",
      },
    ];
    const payoffSummary = {
      current: {},
      projectedIfAllApplied: { req: 1 },
      delta: { req: 1 },
    };
    const planActivation = {
      activationState: "root_uninitialized",
      activationMode: "cold_start_bootstrap",
      applyBlocked: false,
      reason: "cold start",
    };
    const body = {
      version: "kibi.bootstrap-plan.v1",
      status: "ready",
      expected,
      activation: planActivation,
      declaredContext,
      contextQuestions: [],
      confidence: CONFIDENCE,
      discoverySummary,
      candidates: [one],
      actions,
      sourceWrites: [],
      suppressedCandidates: [],
      payoffSummary,
      diagnostics: ["slow scan"],
    };
    const hash = bootstrapPlanHash(body);
    const tldr =
      "Bootstrap plan is ready for review with 1 safe candidate(s) and 0 source-only authoring follow-up(s).";
    expect(result as unknown).toStrictEqual({
      content: [
        {
          type: "text",
          text: `${tldr} Review plan ${hash.slice(0, 12)} and request explicit approval before calling kb_apply_plan.`,
        },
      ],
      structuredContent: {
        plan: { ...body, planHash: hash },
        version: "kibi.bootstrap-plan.v1",
        planHash: hash,
        status: "ready",
        expected,
        activation: planActivation,
        contextQuestions: [],
        activationState: "root_uninitialized",
        activationMode: "cold_start_bootstrap",
        bootstrapMode: "cold_start_bootstrap",
        activationReason: "cold start",
        applyBlocked: false,
        migrationWarning: null,
        confidence: CONFIDENCE,
        tldr,
        promptBlock: "PROMPT",
        recommendedActions: [{ order: 1 }],
        pluginOffers: [],
        declaredContext,
        discoverySummary,
        candidates: [one],
        actions,
        sourceWrites: [],
        suppressedCandidates: [],
        payoffSummary,
        diagnostics: ["slow scan"],
      },
    });
  });

  test("offers, a handoff message and a migration warning are passed through", () => {
    const spy = fakeGuidance();
    const offers = [{ id: "offer" }] as unknown as Input["pluginOffers"];
    const result = present({
      pluginOffers: offers,
      migrationWarning: "Migrate first.",
      activation: activation({ handoffMessage: "Hand off." }),
    });
    expect(spy.mock.calls[0]?.[0].offers).toBe(offers);
    expect(result.pluginOffers).toBe(offers);
    expect(result.handoffMessage).toBe("Hand off.");
    expect(result.migrationWarning).toBe("Migrate first.");
    expect(result.diagnostics[0]).toBe("Migrate first.");
    expect(result.tldr).toBe("Hand off.");
  });

  describe("tldr", () => {
    test("with nothing to plan", () => {
      fakeGuidance();
      expect(present().tldr).toBe(
        "Bootstrap output found no safe candidates; follow the recommended actions to continue.",
      );
      expect(present({ sourceOnlySignals: [signal("a.ts")] }).tldr).toBe(
        "Bootstrap plan is ready for review with 0 safe candidate(s) and 1 source-only authoring follow-up(s).",
      );
    });

    test.each([
      ["attached_thin_handoff", "Bootstrap handoff: why"],
      ["attached_seeded_handoff", "Bootstrap handoff: why"],
      ["vendored_blocked", "Bootstrap blocked: why"],
      [
        "repair_bootstrap",
        "Bootstrap output found no safe candidates; follow the recommended actions to continue.",
      ],
    ] as const)("in %s", (activationMode, tldr) => {
      fakeGuidance();
      expect(
        present({ activation: activation({ activationMode, reason: "why" }) })
          .tldr,
      ).toBe(tldr);
    });

    test("binding diagnostics block apply and lead the reason", () => {
      fakeGuidance();
      const result = present({
        activation: activation({ reason: "why" }),
        candidates: [candidate("c1", [{ id: "REQ-1" }])],
        bindingDiagnostics: [" first ", "second", "first", ""],
      });
      expect(result.tldr).toBe("Bootstrap blocked: why first");
      expect(result.applyBlocked).toBe(true);
      expect(result.status).toBe("blocked");
      expect(result.diagnostics).toStrictEqual(["first", "second"]);
    });

    test("a blocked activation keeps its candidates out of the tldr", () => {
      fakeGuidance();
      const result = present({
        activation: activation({ applyBlocked: true, reason: "why" }),
        candidates: [candidate("c1", [{ id: "REQ-1" }])],
      });
      expect(result.tldr).toBe(
        "Bootstrap output found no safe candidates; follow the recommended actions to continue.",
      );
      expect(result.status).toBe("blocked");
    });

    test("low confidence is called out unless the activation blocks apply", () => {
      fakeGuidance({ level: "low", score: 0.2 });
      expect(present().tldr).toBe(
        "Low-confidence bootstrap (0.2): review diagnostics before proceeding. Bootstrap output found no safe candidates; follow the recommended actions to continue.",
      );
      expect(
        present({
          bindingDiagnostics: ["bound"],
          activation: activation({ reason: "r" }),
        }).tldr,
      ).toBe(
        "Low-confidence bootstrap (0.2): review diagnostics before proceeding. Bootstrap blocked: r bound",
      );
      expect(
        present({ activation: activation({ applyBlocked: true, reason: "r" }) })
          .tldr,
      ).toBe(
        "Bootstrap output found no safe candidates; follow the recommended actions to continue.",
      );
    });

    test("suppressions and the candidate limit are summarized", () => {
      fakeGuidance();
      const result = present({
        suppressedCandidates: [
          { reason: "over_limit", provenanceStub: true },
          { reason: "over_limit", provenanceStub: "yes" },
          { reason: "over_limit" },
          { reason: "entity_exists" },
        ],
      });
      expect(result.tldr).toBe(
        "Bootstrap output found no safe candidates; follow the recommended actions to continue. Suppressed 4 candidate(s) by reason: over_limit 3, entity_exists 1. Discovered candidates over maxCandidates are over_limit (1 of 3 are provenance stubs that state no claim); raise the limit only for the 2 with a claim, or narrow entityTypes. Declared intent claims do not count against it.",
      );
      expect(result.diagnostics).toStrictEqual([
        "Suppressed candidates by reason: over_limit 3, entity_exists 1 (rows in suppressedCandidates).",
      ]);
      expect(
        (result.discoverySummary as DiscoverySummary).suppressedProvenanceStubs,
      ).toBe(1);
      expect(
        present({ suppressedCandidates: [{ reason: "entity_exists" }] }).tldr,
      ).toBe(
        "Bootstrap output found no safe candidates; follow the recommended actions to continue. Suppressed 1 candidate(s) by reason: entity_exists 1.",
      );
    });
  });

  test("provenance stubs are counted apart from candidates with a claim", () => {
    fakeGuidance();
    const stub = candidate("stub", [
      { id: "FACT-S", properties: { tags: ["bootstrap:provenance-stub"] } },
    ]);
    const result = present({
      candidates: [stub, candidate("c1", [{ id: "REQ-1" }])],
    });
    expect(result.discoverySummary).toStrictEqual({
      ...summary(),
      candidatesWithClaims: 1,
      provenanceStubs: 1,
      suppressedProvenanceStubs: 0,
    });
  });

  test("actions are numbered and depend on the steps they link to", () => {
    fakeGuidance();
    const result = present({
      candidates: [
        candidate("c-a", [
          { properties: { id: "REQ-A" } },
          { properties: { id: 7 } },
          { properties: null },
          { id: 5 },
        ]),
        candidate("c-b", [
          {
            id: "REQ-B",
            relationships: [
              { to: "REQ-A" },
              { to: "REQ-B" },
              { to: "REQ-C" },
              { to: "candidate-3" },
              { to: "REQ-A" },
              { to: "candidate-2" },
              { from: "REQ-B" },
              "REQ-A",
              null,
              { to: "nowhere" },
            ],
          },
          { id: "REQ-C", relationships: "REQ-A" },
        ]),
      ],
    });
    expect(
      result.actions.map(({ id, dependsOn, candidateId }) => ({
        id,
        dependsOn,
        candidateId,
      })),
    ).toStrictEqual([
      { id: "bootstrap-upsert-0001", dependsOn: [], candidateId: "c-a" },
      { id: "bootstrap-upsert-0002", dependsOn: [], candidateId: "c-a" },
      { id: "bootstrap-upsert-0003", dependsOn: [], candidateId: "c-a" },
      { id: "bootstrap-upsert-0004", dependsOn: [], candidateId: "c-a" },
      {
        id: "bootstrap-upsert-0005",
        dependsOn: [
          "bootstrap-upsert-0001",
          "bootstrap-upsert-0002",
          "bootstrap-upsert-0003",
          "bootstrap-upsert-0006",
        ],
        candidateId: "c-b",
      },
      { id: "bootstrap-upsert-0006", dependsOn: [], candidateId: "c-b" },
    ]);
    expect(result.payoffSummary).toStrictEqual({
      current: {},
      projectedIfAllApplied: { req: 2 },
      delta: { req: 2 },
    });
  });

  test("payoff counts candidates per entity type", () => {
    fakeGuidance();
    expect(
      present({
        candidates: [
          candidate("a", [], { entityType: "req" }),
          candidate("b", [], { entityType: "fact" }),
          candidate("c", [], { entityType: "req" }),
        ],
      }).payoffSummary,
    ).toStrictEqual({
      current: {},
      projectedIfAllApplied: { req: 2, fact: 1 },
      delta: { req: 2, fact: 1 },
    });
  });

  describe("status", () => {
    const one = [candidate("c1", [{ id: "REQ-1" }])];

    test("a seeded KB that blocks apply is a handoff", () => {
      fakeGuidance();
      const seeded = activation({
        activationState: "root_active_seeded",
        applyBlocked: true,
      });
      expect(present({ activation: seeded, candidates: one }).status).toBe(
        "handoff",
      );
      expect(
        present({
          activation: activation({ activationState: "root_active_seeded" }),
          candidates: one,
        }).status,
      ).toBe("ready");
      expect(
        present({
          activation: activation({ applyBlocked: true }),
          candidates: one,
        }).status,
      ).toBe("blocked");
    });

    test("needs context without high confidence or actions", () => {
      fakeGuidance({ level: "medium", score: 0.5 });
      expect(present({ candidates: one }).status).toBe("needs_context");
      for (const spy of spies.splice(0)) spy.mockRestore();
      fakeGuidance();
      expect(present({ candidates: [candidate("c", [])] }).status).toBe(
        "needs_context",
      );
    });
  });

  describe("context questions", () => {
    const ALL = [
      "What is the one-sentence purpose of this repository?",
      "Which knowledge sources outside the code (issue trackers, wikis, specs, decision logs) describe product intent, and which of them are authoritative?",
      "Which repository paths are authoritative for product intent?",
      "Which detected product behaviors should be prioritized for bootstrap?",
      "Which command or test should verify the initial bootstrap?",
    ];

    test("each missing piece of context is asked, at most four", () => {
      fakeGuidance();
      expect(
        present({ sourceOnlySignals: [signal("a.ts")] }).contextQuestions,
      ).toStrictEqual(ALL.slice(0, 4));
      expect(present().contextQuestions).toStrictEqual([
        ALL[0],
        ALL[1],
        ALL[2],
        ALL[4],
      ]);
      expect(
        present({
          bootstrapContext: {
            ...COMPLETE,
            projectSummary: undefined,
            verificationAnchors: [],
          },
        }).contextQuestions,
      ).toStrictEqual([ALL[0], ALL[4]]);
      expect(
        present({
          bootstrapContext: { ...COMPLETE, knowledgeSources: [] },
        }).contextQuestions,
      ).toStrictEqual([ALL[1]]);
      expect(
        present({
          bootstrapContext: { ...COMPLETE, sourceOfTruthPaths: [] },
        }).contextQuestions,
      ).toStrictEqual([ALL[2]]);
      expect(
        present({
          bootstrapContext: COMPLETE,
          sourceOnlySignals: [signal("a.ts")],
        }).contextQuestions,
      ).toStrictEqual([ALL[3]]);
    });

    test("with every piece of context declared, the fallback question", () => {
      fakeGuidance();
      expect(
        present({ bootstrapContext: COMPLETE }).contextQuestions,
      ).toStrictEqual([
        "Which specific product behavior should this bootstrap plan prioritize before authoring knowledge?",
      ]);
    });

    test("no questions unless context is needed", () => {
      fakeGuidance();
      expect(
        present({
          activation: activation({ applyBlocked: true }),
        }).contextQuestions,
      ).toStrictEqual([]);
    });
  });

  test("only a ready plan asks for approval", () => {
    fakeGuidance();
    const result = presentBootstrap({
      root: "/repo",
      activation: activation({ applyBlocked: true }),
      discoverySummary: summary(),
      migrationWarning: null,
      candidates: [candidate("c1", [{ id: "REQ-1" }])],
      sourceOnlySignals: [],
      suppressedCandidates: [],
      expected,
    });
    expect(result.content).toStrictEqual([
      { type: "text", text: result.structuredContent.tldr },
    ]);
  });

  test("context diagnostics are trimmed and deduplicated", () => {
    fakeGuidance();
    expect(
      present({
        discoverySummary: summary({ scanWarnings: ["w"] }),
        bindingDiagnostics: ["b"],
        contextDiagnostics: [" c ", "c", ""],
        migrationWarning: "m",
      }).diagnostics,
    ).toStrictEqual(["m", "w", "b", "c"]);
  });
});

describe("declared claim accounting", () => {
  const SOURCE = {
    id: "jira",
    kind: "issue_tracker",
    title: "Billing epic",
    locator: "https://jira",
    authority: "authoritative",
  } as const;
  const claim = (reference: string, sourceId = "jira") => ({
    statement: `Claim ${reference}.`,
    sourceId,
    reference,
  });
  const context = (
    count: number,
    sources: BootstrapContext["knowledgeSources"] = [SOURCE],
  ): BootstrapContext => ({
    ...COMPLETE,
    knowledgeSources: sources,
    intentClaims: [
      ...Array.from({ length: count }, (_, i) => claim(`r${i}`)),
      claim("elsewhere", "wiki"),
    ],
  });
  const planned = (id: string, sourceKind = "intent_claim") =>
    candidate(`claim:jira:${id}`, [{ id }], { sourceKind });
  const accounting = (result: ReturnType<typeof present>) =>
    result.diagnostics.filter((line) => line.startsWith("Knowledge source"));

  test("every outcome is counted once, in order", () => {
    fakeGuidance();
    const result = present({
      activation: activation({ activationMode: "attached_thin_bootstrap" }),
      bootstrapContext: context(12),
      candidates: [
        planned("req-1"),
        planned("req-2"),
        planned("req-x", "markdown"),
        candidate("claim:wiki:req-9", [{ id: "REQ-9" }], {
          sourceKind: "intent_claim",
        }),
      ],
      suppressedCandidates: [
        {
          candidateId: "claim:jira:req-3",
          reason: "entity_exists",
          sourcePath: "r3",
        },
        {
          candidateId: "claim:jira:req-4",
          reason: "below_min_confidence",
          sourcePath: "r4",
        },
        {
          candidateId: "claim:jira:req-5",
          reason: "filtered_by_entity_type",
          sourcePath: "r5",
        },
        {
          candidateId: "",
          sourceId: "jira",
          reason: "suppressed_by_activation",
          sourcePath: "r6",
        },
        {
          candidateId: "",
          sourceId: "jira",
          reason: "missing_excerpt",
          sourcePath: "r7",
        },
        {
          sourceId: "jira",
          reason: "stale_knowledge_source",
          sourcePath: "r8",
        },
        {
          candidateId: "",
          sourceId: "wiki",
          reason: "missing_excerpt",
          sourcePath: "x",
        },
        {
          candidateId: "claim:wiki:a",
          reason: "entity_exists",
          sourcePath: "x",
        },
        {
          candidateId: "claim:jira:req-z",
          sourceId: "wiki",
          reason: "invalid",
          sourcePath: "r9",
        },
      ],
      sourceOnlySignals: [
        signal("r4", ["intent_claim:jira:r4"]),
        signal("r9", ["intent_claim:jira:r9"]),
        signal("r10", ["x", "intent_claim:jira:r10", "review_against:REQ-1"]),
        signal("r11", ["intent_claim:jira:r11"]),
        signal("w", ["intent_claim:wiki:w", "review_against:REQ-1"]),
        signal("j", ["intent_claim:jirax:j"]),
      ],
    });
    expect(accounting(result)).toStrictEqual([
      "Knowledge source jira (authoritative): 12 declared claim(s), 2 planned, 1 already in the KB, 2 filtered out, 7 not planned: 1 because bootstrap synthesis is suppressed in attached_thin_bootstrap; compile them with kb_compile_intent; 3 suppressed (rows in suppressedCandidates); 2 need authoring (sourceOnlySignals; compile them with kb_compile_intent; 1 of them need a conflict review against the current requirements their conflict-review diagnostics name); 1 without a suppressedCandidates row or follow-up (see diagnostics).",
    ]);
  });

  test("counts never exceed what was declared", () => {
    fakeGuidance();
    const result = present({
      bootstrapContext: context(2),
      candidates: [planned("req-1"), planned("req-2"), planned("req-3")],
      suppressedCandidates: [
        {
          candidateId: "",
          sourceId: "jira",
          reason: "suppressed_by_activation",
        },
        { candidateId: "", sourceId: "jira", reason: "missing_excerpt" },
      ],
      sourceOnlySignals: [signal("r1", ["intent_claim:jira:r1"])],
    });
    expect(accounting(result)).toStrictEqual([
      "Knowledge source jira (authoritative): 2 declared claim(s), 3 planned, 0 already in the KB, 0 filtered out, 0 not planned.",
    ]);
  });

  test("each kind of shortfall is named on its own", () => {
    fakeGuidance();
    const line = (overrides: Partial<Input>) =>
      accounting(present({ bootstrapContext: context(1), ...overrides }));
    const head =
      "Knowledge source jira (authoritative): 1 declared claim(s), 0 planned, 0 already in the KB, 0 filtered out, 1 not planned: ";
    expect(line({})).toStrictEqual([
      `${head}1 without a suppressedCandidates row or follow-up (see diagnostics).`,
    ]);
    expect(
      line({
        suppressedCandidates: [
          {
            candidateId: "",
            sourceId: "jira",
            reason: "suppressed_by_activation",
          },
        ],
      }),
    ).toStrictEqual([
      `${head}1 because bootstrap synthesis is suppressed in cold_start_bootstrap; compile them with kb_compile_intent.`,
    ]);
    expect(
      line({
        suppressedCandidates: [
          { candidateId: "", sourceId: "jira", reason: "missing_excerpt" },
        ],
      }),
    ).toStrictEqual([`${head}1 suppressed (rows in suppressedCandidates).`]);
    expect(
      line({ sourceOnlySignals: [signal("r0", ["intent_claim:jira:r0"])] }),
    ).toStrictEqual([
      `${head}1 need authoring (sourceOnlySignals; compile them with kb_compile_intent).`,
    ]);
  });

  test("an authoritative source with nothing planned asks how to restate it", () => {
    fakeGuidance();
    const question =
      'No declared claim from authoritative source(s) "Billing epic", "Specs" could be planned; how should those claims be restated or authored before bootstrap applies? Intent and observation claims also need an excerpt (the verbatim source passage), which Kibi keeps in the entity\'s Source section.';
    const specs = { ...SOURCE, id: "spec", title: "Specs" };
    const both = {
      ...context(1, [
        SOURCE,
        specs,
        { ...SOURCE, id: "wiki", title: "Wiki", authority: "supporting" },
      ]),
    };
    const withSpec: BootstrapContext = {
      ...both,
      intentClaims: [...(both.intentClaims ?? []), claim("s1", "spec")],
    };
    const result = present({
      bootstrapContext: withSpec,
      candidates: [candidate("c1", [{ id: "REQ-1" }])],
    });
    expect(result.status).toBe("needs_context");
    expect(result.contextQuestions).toStrictEqual([question]);
    for (const suppressedCandidates of [
      [{ candidateId: "claim:jira:a", reason: "entity_exists" }],
      [{ candidateId: "claim:jira:a", reason: "below_min_confidence" }],
      [
        { candidateId: "claim:jira:a", reason: "entity_exists" },
        { candidateId: "claim:jira:b", reason: "below_min_confidence" },
      ],
    ])
      expect(
        present({
          bootstrapContext: context(1),
          candidates: [candidate("c1", [{ id: "REQ-1" }])],
          suppressedCandidates,
        }).status,
      ).toBe("ready");
    expect(
      present({
        bootstrapContext: context(1),
        candidates: [planned("req-1")],
      }).status,
    ).toBe("ready");
    expect(
      present({
        bootstrapContext: context(1),
        candidates: [planned("req-1")],
        suppressedCandidates: [
          { candidateId: "claim:jira:a", reason: "entity_exists" },
        ],
      }).status,
    ).toBe("ready");
  });

  test("a source without claims is not accounted", () => {
    fakeGuidance();
    expect(
      accounting(
        present({
          bootstrapContext: {
            ...COMPLETE,
            knowledgeSources: [SOURCE],
            intentClaims: [claim("w", "wiki")],
          },
        }),
      ),
    ).toStrictEqual([]);
    expect(
      accounting(
        present({
          bootstrapContext: { ...COMPLETE, knowledgeSources: [SOURCE] },
        }),
      ),
    ).toStrictEqual([]);
    expect(
      accounting(
        present({
          bootstrapContext: {
            ...COMPLETE,
            knowledgeSources: [],
            intentClaims: [claim("w", "wiki")],
          },
        }),
      ),
    ).toStrictEqual([]);
  });
});
