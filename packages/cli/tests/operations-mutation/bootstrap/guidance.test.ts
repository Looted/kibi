import { describe, expect, test } from "bun:test";
import { buildActions } from "../../../src/operations/bootstrap/guidance-actions.js";
import {
  buildGuidance,
  confidence,
} from "../../../src/operations/bootstrap/guidance.js";
import type { PluginOffer } from "../../../src/operations/bootstrap/plugin-offers.js";
import type {
  ActivationMode,
  ActivationPolicy,
  BootstrapDeclaredContext,
  Candidate,
  SourceOnlySignal,
} from "../../../src/operations/bootstrap/types.js";

const activation = (
  mode: ActivationMode,
  applyBlocked = false,
  reason = "Because.",
): ActivationPolicy => ({
  activationState: "root_active_thin",
  activationMode: mode,
  applyBlocked,
  allowCandidateGeneration: true,
  reason,
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

const candidate = (entityType: string): Candidate => ({
  candidateId: entityType,
  entityType,
  title: entityType,
  sourceKind: "markdown",
  sourcePath: "a.md",
  confidence: 1,
  confidenceBand: "high",
  evidence: [],
  relationships: [],
  applyPlan: [],
});

const signal = (
  kind: SourceOnlySignal["kind"],
  sourcePath: string,
): SourceOnlySignal => ({
  kind,
  title: "s",
  sourcePath,
  confidence: 0.4,
  evidence: [],
});

const guidance = (
  options: {
    activation?: ActivationPolicy;
    declared?: BootstrapDeclaredContext;
    candidates?: Candidate[];
    signals?: SourceOnlySignal[];
    warnings?: string[];
    offers?: PluginOffer[];
  } = {},
) =>
  buildGuidance({
    root: "/ws",
    activation: options.activation ?? activation("attached_thin_bootstrap"),
    declared: options.declared ?? declared(),
    candidates: options.candidates ?? [],
    signals: options.signals ?? [],
    warnings: options.warnings ?? [],
    ...(options.offers ? { offers: options.offers } : {}),
  });

describe("prompt block", () => {
  test("states the mode, or why apply is blocked", () => {
    expect(guidance().promptBlock).toBe(
      "- Mode: attached_thin_bootstrap (root_active_thin).",
    );
    expect(
      guidance({
        activation: activation("vendored_blocked", true, "Vendored."),
      }).promptBlock,
    ).toBe("- Apply blocked: Vendored.");
  });

  test("lists declared context, candidates, signals and warnings", () => {
    expect(
      guidance({
        declared: declared({
          projectSummary: "A CLI",
          sourceOfTruthPaths: [
            "docs/a.md",
            "docs/b.md",
            "docs/c.md",
            "docs/d.md",
          ],
        }),
        candidates: [candidate("req"), candidate("adr"), candidate("req")],
        signals: [signal("test", "/ws/t/a.ts")],
      }).promptBlock,
    ).toBe(
      [
        "- Mode: attached_thin_bootstrap (root_active_thin).",
        "- Summary: A CLI",
        "- Source of truth: docs/a.md, docs/b.md, docs/c.md +1 more.",
        "- Safe candidates: 3 (adr 1, req 2).",
        "- Author TEST manually from t/a.ts; keep them out of speculative candidate output.",
      ].join("\n"),
    );
    expect(
      guidance({
        declared: declared({
          knowledgeSources: [
            {
              id: "k",
              kind: "wiki",
              title: "Wiki",
              locator: "x",
              authority: "authoritative",
            },
            {
              id: "j",
              kind: "chat",
              title: "Chat",
              locator: "y",
              authority: "stale",
            },
          ],
          verificationAnchors: ["bun test", "kibi check", "lint"],
        }),
        warnings: ["w1", "w2"],
      }).promptBlock,
    ).toBe(
      [
        "- Mode: attached_thin_bootstrap (root_active_thin).",
        "- Knowledge sources: Wiki (authoritative), Chat (stale); 0 cited intent claim(s).",
        "- Verify after kb_check with bun test, kibi check +1 more.",
        "- Scan diagnostics: 2 warning(s) during evidence collection.",
      ].join("\n"),
    );
    expect(
      guidance({
        declared: declared({
          knowledgeSources: [
            {
              id: "k",
              kind: "wiki",
              title: "Wiki",
              locator: "x",
              authority: "supporting",
            },
          ],
          intentClaims: [{} as never, {} as never],
          verificationAnchors: ["anchor"],
        }),
        signals: [
          signal("req", "TICKET-1"),
          signal("scenario", "TICKET-1"),
          signal("req", "/ws/b.md"),
        ],
      }).promptBlock,
    ).toBe(
      [
        "- Mode: attached_thin_bootstrap (root_active_thin).",
        "- Knowledge sources: Wiki (supporting); 2 cited intent claim(s).",
        "- Author REQ/SCENARIO manually from TICKET-1, b.md; keep them out of speculative candidate output.",
      ].join("\n"),
    );
  });

  test("names the seeded and handoff postures", () => {
    expect(
      guidance({ activation: activation("attached_seeded_handoff") })
        .promptBlock,
    ).toBe(
      "- Mode: attached_seeded_handoff (root_active_thin).\n- Seeded KB: only declared intent claims are planned; use kb_search or kb_query for existing knowledge.",
    );
    const handoff =
      "- Handoff: use kb_search, kb_query, or gap/coverage tools to work with existing KB.";
    expect(
      guidance({
        activation: activation("attached_seeded_handoff", true, "Seeded."),
      }).promptBlock,
    ).toBe(`- Apply blocked: Seeded.\n${handoff}`);
    expect(
      guidance({ activation: activation("attached_thin_handoff") }).promptBlock,
    ).toBe(`- Mode: attached_thin_handoff (root_active_thin).\n${handoff}`);
  });

  test("keeps five bullets and 120 words", () => {
    const block = guidance({
      declared: declared({ projectSummary: "S", sourceOfTruthPaths: ["p"] }),
      candidates: [candidate("req")],
      signals: [signal("req", "a")],
      warnings: ["w"],
      activation: activation("attached_thin_handoff"),
    }).promptBlock;
    expect(block.split("\n")).toHaveLength(5);
    expect(block).not.toContain("Handoff");

    const long = guidance({
      declared: declared({
        projectSummary: Array.from({ length: 200 }, (_, i) => `w${i}`).join(
          " ",
        ),
      }),
    }).promptBlock;
    const words = long.split(/\s+/);
    expect(words).toHaveLength(120);
    expect(words.at(-1)).toBe("w113…");
    const exact = guidance({
      declared: declared({
        projectSummary: Array.from({ length: 114 }, (_, i) => `w${i}`).join(
          " ",
        ),
      }),
    }).promptBlock;
    expect(exact.split(/\s+/)).toHaveLength(120);
    expect(exact.endsWith("w113")).toBe(true);
    expect(
      guidance({ declared: declared({ projectSummary: "a  -  b\tc" }) })
        .promptBlock,
    ).toBe(
      "- Mode: attached_thin_bootstrap (root_active_thin).\n- Summary: a\n- b c",
    );
    expect(
      guidance({ declared: declared({ projectSummary: "a \n " }) }).promptBlock,
    ).toBe("- Mode: attached_thin_bootstrap (root_active_thin).\n- Summary: a");
  });
});

describe("confidence", () => {
  const score = (
    mode: ActivationMode,
    options: {
      blocked?: boolean;
      declared?: BootstrapDeclaredContext;
      candidates?: number;
      signals?: number;
      prompt?: string;
    } = {},
  ) =>
    confidence(
      activation(mode, options.blocked ?? false),
      options.declared ?? declared(),
      Array.from({ length: options.candidates ?? 1 }, () => candidate("req")),
      Array.from({ length: options.signals ?? 0 }, () => signal("req", "a")),
      options.prompt ?? "prompt",
    );

  test("a ready cold start is high confidence", () => {
    expect(score("cold_start_bootstrap")).toStrictEqual({
      score: 0.9,
      level: "high",
      reasons: [
        "Workspace posture allows read-only bootstrap synthesis.",
        "cold_start_bootstrap determined the bootstrap posture.",
        "No declared bootstrap context was supplied.",
        "1 safe candidate(s) are ready for review.",
      ],
      policy: "full_actions",
    });
  });

  test("weighs each activation mode", () => {
    expect(score("repair_bootstrap").score).toBe(0.75);
    expect(score("attached_thin_bootstrap").score).toBe(0.84);
    expect(score("attached_thin_handoff").score).toBe(0.68);
    expect(score("attached_seeded_handoff").score).toBe(0.84);
    expect(score("attached_seeded_handoff", { blocked: true }).score).toBe(
      0.26,
    );
    expect(score("vendored_blocked").score).toBe(0.55);
  });

  test("a blocked plan without candidates or prompt is low confidence", () => {
    expect(
      score("vendored_blocked", {
        blocked: true,
        candidates: 0,
        signals: 1,
        prompt: "",
        declared: declared({ projectSummary: "S" }),
      }),
    ).toStrictEqual({
      score: 0,
      level: "low",
      reasons: [
        "Current workspace posture blocks direct application.",
        "vendored_blocked determined the bootstrap posture.",
        "Declared bootstrap context grounds the output.",
        "Source-only evidence was routed into authoring guidance.",
        "No safe candidates were synthesized from current evidence.",
        "Prompt block could not be assembled within the handoff budget.",
        "Low confidence: handoff-only output with diagnostic guidance.",
      ],
      policy: "handoff_only",
    });
  });

  test("any declared context counts", () => {
    for (const context of [
      declared({ projectSummary: "S" }),
      declared({ sourceOfTruthPaths: ["a"] }),
      declared({ sourceOfTruthNotes: ["a"] }),
      declared({ priorityRoots: ["a"] }),
      declared({ verificationAnchors: ["a"] }),
      declared({ knowledgeSources: [{} as never] }),
    ]) {
      expect(score("repair_bootstrap", { declared: context }).score).toBe(0.83);
    }
    expect(
      score("repair_bootstrap", {
        declared: declared({ knowledgeSources: [] }),
      }).score,
    ).toBe(0.75);
  });

  test("levels at their boundaries", () => {
    expect(
      score("cold_start_bootstrap", {
        candidates: 0,
        signals: 1,
        declared: declared({ projectSummary: "S" }),
      }),
    ).toStrictEqual({
      score: 0.7,
      level: "medium",
      reasons: [
        "Workspace posture allows read-only bootstrap synthesis.",
        "cold_start_bootstrap determined the bootstrap posture.",
        "Declared bootstrap context grounds the output.",
        "Source-only evidence was routed into authoring guidance.",
        "No safe candidates were synthesized from current evidence.",
        "Medium confidence: review recommended before applying.",
      ],
      policy: "review_required",
    });
    expect(
      score("attached_thin_handoff", { candidates: 0, signals: 1 }),
    ).toMatchObject({
      score: 0.4,
      level: "medium",
    });
    expect(score("attached_thin_handoff", { candidates: 0 })).toMatchObject({
      score: 0.36,
      level: "low",
    });
    expect(
      score("cold_start_bootstrap", {
        candidates: 2,
        signals: 1,
        declared: declared({ projectSummary: "S" }),
      }),
    ).toMatchObject({ score: 1, level: "high" });
    expect(score("cold_start_bootstrap", { candidates: 2 }).reasons).toContain(
      "2 safe candidate(s) are ready for review.",
    );
  });
});

describe("buildGuidance", () => {
  test("returns the prompt, its confidence and the actions", () => {
    const offer: PluginOffer = {
      package: "p",
      capability: "c",
      mode: "augment",
      reason: "r",
      fileCount: 1,
      evidence: [],
    };
    const input = {
      root: "/ws",
      activation: activation("cold_start_bootstrap"),
      declared: declared(),
      candidates: [candidate("req")],
      signals: [signal("req", "/ws/a.md")],
      warnings: [],
      offers: [offer],
    };
    const result = buildGuidance(input);
    expect(result.confidence).toStrictEqual(
      confidence(
        input.activation,
        input.declared,
        input.candidates,
        input.signals,
        result.promptBlock,
      ),
    );
    expect(result.actions).toStrictEqual(
      buildActions(
        "/ws",
        input.activation,
        input.declared,
        input.candidates,
        input.signals,
        [offer],
      ),
    );
    const { offers: _offers, ...withoutOffers } = input;
    expect(buildGuidance(withoutOffers).actions).toStrictEqual(
      buildActions(
        "/ws",
        input.activation,
        input.declared,
        input.candidates,
        input.signals,
        [],
      ),
    );
  });
});
