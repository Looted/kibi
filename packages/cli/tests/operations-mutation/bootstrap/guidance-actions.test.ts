import { describe, expect, test } from "bun:test";
import { buildActions } from "../../../src/operations/bootstrap/guidance-actions.js";
import type { PluginOffer } from "../../../src/operations/bootstrap/plugin-offers.js";
import type {
  ActivationMode,
  ActivationPolicy,
  BootstrapDeclaredContext,
  Candidate,
  SourceOnlySignal,
} from "../../../src/operations/bootstrap/types.js";

const ROOT = "/ws";

const activation = (
  mode: ActivationMode,
  overrides: Partial<ActivationPolicy> = {},
): ActivationPolicy => ({
  activationState: "root_uninitialized",
  activationMode: mode,
  applyBlocked: false,
  allowCandidateGeneration: true,
  reason: "Because.",
  ...overrides,
});

const declared = (
  overrides: Partial<BootstrapDeclaredContext> = {},
): BootstrapDeclaredContext => ({
  sourceOfTruthPaths: [],
  sourceOfTruthNotes: [],
  priorityRoots: [],
  verificationAnchors: [],
  ...overrides,
});

const candidate = (id: string): Candidate => ({
  candidateId: id,
  entityType: "req",
  title: id,
  sourceKind: "markdown",
  sourcePath: "docs/a.md",
  confidence: 1,
  confidenceBand: "high",
  evidence: [],
  relationships: [],
  applyPlan: [],
});

const signal = (
  kind: SourceOnlySignal["kind"],
  sourcePath: string,
  evidence: string[] = [],
): SourceOnlySignal => ({
  kind,
  title: "s",
  sourcePath,
  confidence: 0.4,
  evidence,
});

const REVIEW_DEFAULT = {
  order: 1,
  kind: "query",
  description:
    "Review workspace evidence and existing KB records before applying bootstrap output.",
};
const CHECK_DEFAULT = (order: number) => ({
  order,
  kind: "check",
  description:
    "After kb_apply_plan, run kb_check to validate the resulting graph.",
});

describe("buildActions", () => {
  test("a cold start with nothing declared reviews and checks", () => {
    expect(
      buildActions(
        ROOT,
        activation("cold_start_bootstrap"),
        declared(),
        [],
        [],
      ),
    ).toStrictEqual([REVIEW_DEFAULT, CHECK_DEFAULT(2)]);
  });

  test("summarizes review targets: declared paths, roots and signal sources", () => {
    const [first] = buildActions(
      ROOT,
      activation("cold_start_bootstrap"),
      declared({
        sourceOfTruthPaths: ["docs/spec.md"],
        priorityRoots: ["src", "docs/spec.md"],
      }),
      [],
      [
        signal("req", "/ws/notes/a.md"),
        signal("req", "TICKET-12"),
        signal("test", "/elsewhere/b.md"),
      ],
    );
    expect(first).toStrictEqual({
      order: 1,
      kind: "query",
      description:
        "Review docs/spec.md, src, notes/a.md +2 more before authoring or applying bootstrap output.",
    });
    const [exact] = buildActions(
      ROOT,
      activation("cold_start_bootstrap"),
      declared({ priorityRoots: ["a", "b", "c"] }),
      [],
      [],
    );
    expect(exact?.description).toBe(
      "Review a, b, c before authoring or applying bootstrap output.",
    );
    const [outside] = buildActions(
      ROOT,
      activation("cold_start_bootstrap"),
      declared(),
      [],
      [signal("req", "/elsewhere/x.md"), signal("req", "/ws/..dot/y.md")],
    );
    expect(outside?.description).toBe(
      "Review /elsewhere/x.md, /ws/..dot/y.md before authoring or applying bootstrap output.",
    );
  });

  test("relative signal sources are kept as written", () => {
    const [first] = buildActions(
      "/",
      activation("cold_start_bootstrap"),
      declared(),
      [],
      [signal("req", "notes/x.md")],
    );
    expect(first?.description).toBe(
      "Review notes/x.md before authoring or applying bootstrap output.",
    );
  });

  test("a thin handoff points at search, query and gaps", () => {
    expect(
      buildActions(
        ROOT,
        activation("attached_thin_handoff"),
        declared(),
        [],
        [],
      ),
    ).toStrictEqual([
      REVIEW_DEFAULT,
      {
        order: 2,
        kind: "handoff",
        description:
          "Use kb_search to explore existing KB entities and understand current coverage.",
      },
      {
        order: 3,
        kind: "handoff",
        description:
          "Use kb_query or kb_graph with task-relevant IDs to inspect cited KB context.",
      },
      {
        order: 4,
        kind: "handoff",
        description:
          "Use kb_find_gaps to identify coverage holes and guide incremental KB growth.",
      },
      CHECK_DEFAULT(5),
    ]);
  });

  test("a seeded handoff points at coverage and compiles unplanned declared claims", () => {
    const actions = buildActions(
      ROOT,
      activation("attached_seeded_handoff"),
      declared({ intentClaims: [{} as never] }),
      [],
      [],
    );
    expect(actions.map((action) => action.description)).toStrictEqual([
      REVIEW_DEFAULT.description,
      "Use kb_search to explore existing KB entities and understand current coverage.",
      "Use kb_query or kb_graph with task-relevant IDs to inspect cited KB context.",
      "Use kb_coverage to review traceability and identify areas needing attention.",
      "No declared intent claim could be planned. Claims already in the KB need nothing; compile each remaining claim with kb_compile_intent, citing its source and reference (see the Knowledge source diagnostics).",
      CHECK_DEFAULT(6).description,
    ]);
    expect(actions.map((action) => action.order)).toStrictEqual([
      1, 2, 3, 4, 5, 6,
    ]);
    expect(actions.map((action) => action.kind)).toStrictEqual([
      "query",
      "handoff",
      "handoff",
      "handoff",
      "handoff",
      "check",
    ]);
    expect(
      buildActions(
        ROOT,
        activation("attached_seeded_handoff"),
        declared(),
        [],
        [],
      ).map((a) => a.kind),
    ).toStrictEqual(["query", "handoff", "handoff", "handoff", "check"]);
    expect(
      buildActions(
        ROOT,
        activation("attached_seeded_handoff"),
        declared({ intentClaims: [] }),
        [],
        [],
      ),
    ).toHaveLength(5);
    expect(
      buildActions(
        ROOT,
        activation("attached_thin_bootstrap"),
        declared({ intentClaims: [{} as never] }),
        [],
        [],
      ),
    ).toHaveLength(2);
  });

  test("plans candidates, worded for seeded and discovered plans", () => {
    expect(
      buildActions(
        ROOT,
        activation("cold_start_bootstrap"),
        declared(),
        [candidate("c1"), candidate("c2")],
        [],
      )[1],
    ).toStrictEqual({
      order: 2,
      kind: "plan",
      description:
        "Review the 2 safe candidate(s) in the hash-bound plan, then call kb_apply_plan after explicit approval.",
      candidateIds: ["c1", "c2"],
    });
    const seeded = buildActions(
      ROOT,
      activation("attached_seeded_handoff"),
      declared({ intentClaims: [{} as never] }),
      [candidate("c1")],
      [],
    );
    expect(seeded[4]).toStrictEqual({
      order: 5,
      kind: "plan",
      description:
        "Review the 1 candidate(s) planned from declared intent claims (discovered candidates are not generated on a seeded KB, and claims already in the KB are not planned again), then call kb_apply_plan after explicit approval.",
      candidateIds: ["c1"],
    });
    expect(seeded).toHaveLength(6);
    expect(seeded.at(-1)).toStrictEqual(CHECK_DEFAULT(6));
  });

  test("a blocked apply hands off instead of planning", () => {
    expect(
      buildActions(
        ROOT,
        activation("vendored_blocked", {
          applyBlocked: true,
          handoffMessage: "Vendored copy.",
        }),
        declared(),
        [candidate("c1")],
        [],
      )[1],
    ).toStrictEqual({
      order: 2,
      kind: "handoff",
      description: "Vendored copy.",
    });
    expect(
      buildActions(
        ROOT,
        activation("vendored_blocked", { applyBlocked: true }),
        declared(),
        [],
        [],
      )[1],
    ).toStrictEqual({ order: 2, kind: "handoff", description: "Because." });
    expect(
      buildActions(
        ROOT,
        activation("vendored_blocked", { applyBlocked: true }),
        declared(),
        [],
        [],
      ).at(-1),
    ).toStrictEqual(CHECK_DEFAULT(3));
  });

  test("asks for manual authoring of source-only signals", () => {
    const actions = buildActions(
      ROOT,
      activation("cold_start_bootstrap"),
      declared(),
      [],
      [signal("req", "a.md"), signal("test", "b.md"), signal("req", "c.md")],
    );
    expect(actions[1]).toStrictEqual({
      order: 2,
      kind: "handoff",
      description:
        "Author REQ/TEST entities manually from source-only evidence.",
    });
    expect(actions.at(-1)).toStrictEqual(CHECK_DEFAULT(3));
    const seeded = buildActions(
      ROOT,
      activation("attached_seeded_handoff"),
      declared(),
      [],
      [
        signal("scenario", "a.md", ["review_against:REQ-a"]),
        signal("req", "b.md", ["review_against:REQ-b"]),
        signal("req", "c.md"),
      ],
    );
    expect(seeded[4]).toStrictEqual({
      order: 5,
      kind: "handoff",
      description:
        "Author SCENARIO/REQ entities manually from source-only evidence; compile declared claims left there with kb_compile_intent. 2 intent claim(s) left for authoring need a conflict review: when you compile each with kb_compile_intent, compare it with the current requirements its conflict-review diagnostic names and report the verdicts through conflictReviews.",
    });
  });

  test("offers plugins with their activation and install instructions", () => {
    const offer: PluginOffer = {
      package: "kibi-plugin-ui",
      capability: "kibi.check-policy.v1",
      mode: "augment",
      reason: "UI sources found",
      fileCount: 4,
      evidence: ["a.tsx", "b.tsx", "c.tsx", "d.tsx"],
    };
    const rich: PluginOffer = {
      ...offer,
      package: "kibi-plugin-treesitter",
      capability: "kibi.symbols.v1",
      mode: "replace",
      reason: "Code found",
      evidence: [],
      alsoActivate: { "kibi.extra.v1": "augment", "kibi.more.v1": "replace" },
      alsoInstall: ["kibi-lang-python", "kibi-lang-rust"],
    };
    const actions = buildActions(
      ROOT,
      activation("cold_start_bootstrap"),
      declared(),
      [],
      [],
      [offer, rich],
    );
    expect(actions[1]).toStrictEqual({
      order: 2,
      kind: "plugin_offer",
      package: "kibi-plugin-ui",
      capability: "kibi.check-policy.v1",
      mode: "augment",
      evidence: ["a.tsx", "b.tsx", "c.tsx", "d.tsx"],
      description:
        'UI sources found (a.tsx, b.tsx, c.tsx +1 more). Ask the operator whether to enable the experimental kibi-plugin-ui; on yes, install it as a dev dependency and add it to package.json kibi.plugins with "kibi.check-policy.v1": { "mode": "augment" }; on no, add "kibi-plugin-ui" to kibi.declinedPlugins so bootstrap stops offering it.',
    });
    expect(actions[2]).toStrictEqual({
      order: 3,
      kind: "plugin_offer",
      package: "kibi-plugin-treesitter",
      capability: "kibi.symbols.v1",
      mode: "replace",
      evidence: [],
      alsoActivate: { "kibi.extra.v1": "augment", "kibi.more.v1": "replace" },
      alsoInstall: ["kibi-lang-python", "kibi-lang-rust"],
      description:
        'Code found (workspace evidence). Ask the operator whether to enable the experimental kibi-plugin-treesitter; on yes, install it and kibi-lang-python, kibi-lang-rust as dev dependencies and add it to package.json kibi.plugins with "kibi.symbols.v1": { "mode": "replace" }, "kibi.extra.v1": { "mode": "augment" }, "kibi.more.v1": { "mode": "replace" }; on no, add "kibi-plugin-treesitter" to kibi.declinedPlugins so bootstrap stops offering it. The operator may also decline single grammar packs: list each unwanted kibi-lang-* pack in package.json kibi.declinedLanguagePacks instead of installing it.',
    });
    expect(actions[3]).toStrictEqual(CHECK_DEFAULT(4));
  });

  test("names verification anchors in the final check", () => {
    const last = (anchors: string[]) =>
      buildActions(
        ROOT,
        activation("cold_start_bootstrap"),
        declared({ verificationAnchors: anchors }),
        [],
        [],
      ).at(-1);
    expect(last(["bun test", "kibi check"])).toStrictEqual({
      order: 2,
      kind: "check",
      description:
        "After kb_apply_plan, run kb_check and verify bun test, kibi check.",
    });
    expect(last(["a", "b", "c"])?.description).toBe(
      "After kb_apply_plan, run kb_check and verify a, b +1 more.",
    );
  });
});
