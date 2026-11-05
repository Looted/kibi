import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import path from "node:path";
import * as activationModule from "../../../src/operations/bootstrap/activation.js";
import * as candidatesModule from "../../../src/operations/bootstrap/candidates.js";
import * as conflictReview from "../../../src/operations/bootstrap/conflict-review.js";
import * as discovery from "../../../src/operations/bootstrap/discovery.js";
import {
  executePlanBootstrap,
  filterSourceOnlySignals,
  selectBootstrapCandidates,
} from "../../../src/operations/bootstrap/generate.js";
import * as intentClaims from "../../../src/operations/bootstrap/intent-claims.js";
import * as presentation from "../../../src/operations/bootstrap/presentation.js";
import * as requirementClaims from "../../../src/operations/bootstrap/requirement-claims.js";
import {
  type ActivationPolicy,
  type BootstrapEvidence,
  type Candidate,
  type DiscoveryResult,
  type SourceOnlySignal,
  bootstrapEmptyKbSnapshotId,
} from "../../../src/operations/bootstrap/types.js";
import * as validation from "../../../src/operations/bootstrap/validation.js";
import * as planningReview from "../../../src/operations/planning/conflict-review.js";
import * as boundary from "../../../src/operations/semantic-advisor/ingestion-boundary.js";
import * as entities from "../../../src/public/operations/discovery-entities.js";
import * as executors from "../../../src/public/operations/discovery-executors.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";

const spies: { mockRestore: () => void }[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
});
function track<T extends { mockRestore: () => void }>(spy: T): T {
  spies.push(spy);
  return spy;
}

const signal = (
  kind: SourceOnlySignal["kind"],
  sourcePath = "a.md",
): SourceOnlySignal => ({
  kind,
  title: `${kind} ${sourcePath}`,
  sourcePath,
  confidence: 0.5,
  evidence: [],
});

describe("filterSourceOnlySignals", () => {
  test("keeps the requested kinds, or every signal when none are requested", () => {
    const signals = [signal("req"), signal("test"), signal("scenario")];
    expect(filterSourceOnlySignals(signals, undefined)).toBe(signals);
    expect(filterSourceOnlySignals(signals, [])).toBe(signals);
    expect(filterSourceOnlySignals(signals, ["test", "req"])).toStrictEqual([
      signals[0],
      signals[1],
    ]);
  });
});

/** A requirement write the real bootstrap validator accepts. */
const req = (id: string, title = id, extra: Record<string, unknown> = {}) => ({
  type: "req",
  id,
  properties: { id, title, status: "open", ...extra },
});

function candidate(
  candidateId: string,
  overrides: Partial<Candidate> = {},
): Candidate {
  return {
    candidateId,
    entityType: "req",
    title: candidateId,
    sourceKind: "source_symbols",
    sourcePath: `${candidateId}.md`,
    confidence: 0.9,
    confidenceBand: "high",
    evidence: [`e:${candidateId}`],
    relationships: [],
    applyPlan: [req(`REQ-${candidateId}`, candidateId)],
    ...overrides,
  };
}

const ids = (result: { readonly candidates: readonly Candidate[] }) =>
  result.candidates.map((row) => row.candidateId);
const NONE = new Set<string>();

describe("selectBootstrapCandidates", () => {
  test("a filtered claim is recorded, a filtered discovery is not", () => {
    const result = selectBootstrapCandidates(
      [
        candidate("claim", { entityType: "fact", sourceKind: "intent_claim" }),
        candidate("found", { entityType: "fact" }),
        candidate("kept"),
      ],
      NONE,
      ["req"],
      10,
    );
    expect(ids(result)).toStrictEqual(["kept"]);
    expect(result.suppressed).toStrictEqual([
      {
        candidateId: "claim",
        reason: "filtered_by_entity_type",
        sourcePath: "claim.md",
        entityType: "fact",
      },
    ]);
    expect(
      ids(
        selectBootstrapCandidates(
          [candidate("a", { entityType: "fact" })],
          NONE,
          [],
          10,
        ),
      ),
    ).toStrictEqual(["a"]);
  });

  test("a candidate whose entity exists is suppressed, found by its first write of its type", () => {
    const typed = candidate("typed", {
      entityType: "test",
      applyPlan: [req("REQ-T"), { ...req("TEST-T"), type: "test" }],
    });
    const nested = candidate("nested", {
      applyPlan: [{ type: "req", id: 5, properties: { id: "REQ-N" } }],
    });
    const result = selectBootstrapCandidates(
      [typed, nested, candidate("first")],
      new Set(["TEST-T", "REQ-N", "REQ-first"]),
      undefined,
      10,
    );
    expect(ids(result)).toStrictEqual([]);
    expect(result.suppressed).toStrictEqual(
      ["typed", "nested", "first"].map((candidateId) => ({
        candidateId,
        reason: "entity_exists",
        sourcePath: `${candidateId}.md`,
        entityType: candidateId === "typed" ? "test" : "req",
      })),
    );
    expect(
      selectBootstrapCandidates([typed], new Set(["REQ-T"]), undefined, 10)
        .suppressed,
    ).not.toContainEqual(expect.objectContaining({ reason: "entity_exists" }));
  });

  test("a write's own id names the entity before its properties' id", () => {
    const top = candidate("top", {
      applyPlan: [
        {
          type: "req",
          id: "REQ-top",
          properties: { id: "REQ-prop", title: "t", status: "open" },
        },
      ],
    });
    expect(
      selectBootstrapCandidates([top], new Set(["REQ-top"]), undefined, 10)
        .suppressed,
    ).toStrictEqual([
      {
        candidateId: "top",
        reason: "entity_exists",
        sourcePath: "top.md",
        entityType: "req",
      },
    ]);
    const other = candidate("other", {
      confidence: 0.5,
      applyPlan: [req("REQ-prop", "other")],
    });
    expect(
      ids(selectBootstrapCandidates([top, other], NONE, undefined, 10)),
    ).toStrictEqual(["top", "other"]);
    expect(
      selectBootstrapCandidates(
        [
          candidate("number", {
            applyPlan: [{ type: "req", id: 5, properties: { id: 6 } }],
          }),
        ],
        new Set([""]),
        undefined,
        10,
      ).suppressed.map((row) => row.reason),
    ).toStrictEqual(["entity_exists"]);
  });

  test("a write without a usable id is never taken for an existing entity", () => {
    const result = selectBootstrapCandidates(
      [
        candidate("number", {
          applyPlan: [{ type: "req", id: 5, properties: { id: 6 } }],
        }),
        candidate("bare", { applyPlan: [{ type: "req", id: 5 }] }),
        candidate("empty", { applyPlan: [] }),
      ],
      new Set(["5", "6", "undefined"]),
      undefined,
      10,
    );
    expect(result.suppressed.map((row) => row.reason)).toStrictEqual([
      "invalid_write",
      "invalid_write",
      "invalid_write",
    ]);
  });

  test("an invalid write becomes an authoring follow-up", () => {
    const invalid = candidate("bad", {
      title: "Bad one",
      applyPlan: [req("REQ-ok"), { type: "req" }],
    });
    const result = selectBootstrapCandidates(
      [invalid, candidate("empty", { applyPlan: [] })],
      NONE,
      undefined,
      10,
    );
    const message = "'type' and 'id' are required for upsert";
    expect(result).toStrictEqual({
      candidates: [],
      suppressed: [
        {
          candidateId: "bad",
          reason: "invalid_write",
          sourcePath: "bad.md",
          entityType: "req",
          message,
        },
        {
          candidateId: "empty",
          reason: "invalid_write",
          sourcePath: "empty.md",
          entityType: "req",
          message: "Candidate has no write actions",
        },
      ],
      sourceOnlySignals: [
        {
          kind: "req",
          title: "Author requirement: Bad one",
          sourcePath: "bad.md",
          confidence: 0.9,
          evidence: ["e:bad"],
        },
        {
          kind: "req",
          title: "Author requirement: empty",
          sourcePath: "empty.md",
          confidence: 0.9,
          evidence: ["e:empty"],
        },
      ],
      diagnostics: [
        `Invalid bootstrap candidate at bad.md: ${message}`,
        "Invalid bootstrap candidate at empty.md: Candidate has no write actions",
      ],
    });
  });

  test("a value thrown by the validator is reported as text, and each write is validated now", () => {
    const real = validation.validateBootstrapPayload;
    const seen: unknown[] = [];
    track(
      spyOn(validation, "validateBootstrapPayload").mockImplementation(
        (payload, now) => {
          seen.push(now);
          if (payload.id === "REQ-boom") throw "boom";
          return real(payload, now);
        },
      ),
    );
    const before = Date.now();
    const result = selectBootstrapCandidates(
      [candidate("boom", { applyPlan: [req("REQ-boom")] })],
      NONE,
      undefined,
      10,
    );
    expect(result.diagnostics).toStrictEqual([
      "Invalid bootstrap candidate at boom.md: boom",
    ]);
    expect(seen).toHaveLength(1);
    expect((seen[0] as Date).getTime()).toBeGreaterThanOrEqual(before);
    expect((seen[0] as Date).getTime()).toBeLessThanOrEqual(Date.now());
  });

  test("claims first, then Markdown requirements, then other evidence, then provenance stubs", () => {
    const stub = (id: string) =>
      candidate(id, {
        applyPlan: [
          req(`REQ-${id}`, id, { tags: ["bootstrap:provenance-stub"] }),
        ],
      });
    const result = selectBootstrapCandidates(
      [
        stub("stub"),
        candidate("other-low", { confidence: 0.7 }),
        candidate("generic", { sourceKind: "generic_markdown" }),
        candidate("other-high", { confidence: 0.95 }),
        candidate("typed-fact", {
          sourceKind: "typed_markdown",
          entityType: "fact",
        }),
        candidate("typed", { sourceKind: "typed_markdown", confidence: 0.6 }),
        candidate("claim", { sourceKind: "intent_claim", confidence: 0.5 }),
        candidate("b", { sourcePath: "same.md" }),
        candidate("a", { sourcePath: "same.md" }),
      ],
      NONE,
      undefined,
      10,
    );
    expect(ids(result)).toStrictEqual([
      "claim",
      "generic",
      "typed",
      "other-high",
      "a",
      "b",
      "typed-fact",
      "other-low",
      "stub",
    ]);
  });

  test("a typed document shadows a generic one with the same title, and titles are unique per type", () => {
    const result = selectBootstrapCandidates(
      [
        candidate("generic", {
          sourceKind: "generic_markdown",
          title: "  Data   Retention ",
        }),
        candidate("typed", {
          sourceKind: "typed_markdown",
          title: "data retention",
          confidence: 0.6,
        }),
        candidate("again", {
          sourceKind: "typed_markdown",
          title: "Data retention",
          confidence: 0.5,
        }),
        candidate("other-generic", {
          sourceKind: "generic_markdown",
          title: "Other",
        }),
        candidate("other-dup", { title: "other" }),
        candidate("spaced", { title: "data retention x" }),
        candidate("joined", { title: "dataretention x" }),
        candidate("sharp", { title: "stra\u00dfe" }),
        candidate("double-s", { title: "STRASSE" }),
        candidate("fact", {
          entityType: "fact",
          title: "Data retention",
          applyPlan: [req("REQ-fact")],
        }),
      ],
      NONE,
      undefined,
      10,
    );
    expect(ids(result)).toStrictEqual([
      "other-generic",
      "typed",
      "double-s",
      "fact",
      "joined",
      "sharp",
      "spaced",
    ]);
    expect(
      result.suppressed.map((row) => [row.candidateId, row.reason]),
    ).toStrictEqual([
      ["generic", "shadowed_by_typed_source"],
      ["again", "duplicate_title"],
      ["other-dup", "duplicate_title"],
    ]);
  });

  test("the limit applies to discovered candidates only", () => {
    const stub = candidate("stub", {
      applyPlan: [
        req("REQ-stub", "stub", { tags: ["bootstrap:provenance-stub"] }),
      ],
    });
    const result = selectBootstrapCandidates(
      [
        candidate("c1", { sourceKind: "intent_claim" }),
        candidate("c2", { sourceKind: "intent_claim" }),
        candidate("d1"),
        candidate("d2"),
        stub,
      ],
      NONE,
      undefined,
      1,
    );
    expect(ids(result)).toStrictEqual(["c1", "c2", "d1"]);
    expect(result.suppressed).toStrictEqual([
      {
        candidateId: "d2",
        reason: "over_limit",
        sourcePath: "d2.md",
        entityType: "req",
        provenanceStub: false,
      },
      {
        candidateId: "stub",
        reason: "over_limit",
        sourcePath: "stub.md",
        entityType: "req",
        provenanceStub: true,
      },
    ]);
    expect(result.diagnostics).toStrictEqual([
      "2 discovered candidate(s) exceeded maxCandidates 1 and are suppressed as over_limit, 1 of them provenance stubs that state no claim (raise the limit only for the 1 with a claim); declared intent claims do not count against it.",
    ]);
    expect(
      selectBootstrapCandidates([candidate("d1")], NONE, undefined, 1),
    ).toStrictEqual({
      candidates: [candidate("d1")],
      suppressed: [],
      sourceOnlySignals: [],
      diagnostics: [],
    });
    expect(
      ids(
        selectBootstrapCandidates(
          [candidate("d1"), candidate("d2")],
          NONE,
          undefined,
          2,
        ),
      ),
    ).toStrictEqual(["d1", "d2"]);
  });

  test("two candidates writing one id with different content keep the first", () => {
    const result = selectBootstrapCandidates(
      [
        candidate("a", { applyPlan: [req("REQ-X", "x"), req("REQ-a")] }),
        candidate("b", { applyPlan: [req("REQ-b"), req("REQ-X", "x")] }),
        candidate("c", { applyPlan: [req("REQ-c"), req("REQ-X", "changed")] }),
        candidate("d", {
          applyPlan: [
            {
              type: "req",
              id: 5,
              properties: { id: "REQ-a", title: "other", status: "open" },
            },
          ],
        }),
      ],
      NONE,
      undefined,
      10,
    );
    expect(ids(result)).toStrictEqual(["a", "b"]);
    expect(result.suppressed).toStrictEqual([
      {
        candidateId: "c",
        reason: "duplicate_entity",
        sourcePath: "c.md",
        entityType: "req",
        message:
          "Entity REQ-X is already written by another candidate with different content.",
      },
      {
        candidateId: "d",
        reason: "duplicate_entity",
        sourcePath: "d.md",
        entityType: "req",
        message:
          "Entity REQ-a is already written by another candidate with different content.",
      },
    ]);
  });

  test("grounding is checked against the plan's own earlier writes", () => {
    const calls: [unknown, unknown, Map<string, unknown>][] = [];
    track(
      spyOn(boundary, "stagedLogicalGroundingError").mockImplementation(
        (payload, relationships, local) => {
          calls.push([payload.id, relationships, new Map(local)]);
          return payload.id === "REQ-bad" ? "claim_key mismatch" : null;
        },
      ),
    );
    const links = [{ type: "relates_to", from: "REQ-b", to: "REQ-a" }];
    const result = selectBootstrapCandidates(
      [
        candidate("a", {
          confidence: 0.99,
          applyPlan: [req("REQ-a")],
        }),
        candidate("b", {
          confidence: 0.98,
          applyPlan: [
            { ...req("REQ-b"), relationships: links },
            {
              type: "req",
              id: 7,
              properties: { id: "REQ-n", title: "n", status: "open" },
            },
          ],
        }),
        candidate("bad", { confidence: 0.97, applyPlan: [req("REQ-bad")] }),
        candidate("after", { applyPlan: [req("REQ-after")] }),
      ],
      NONE,
      undefined,
      10,
    );
    expect(ids(result)).toStrictEqual(["a", "b", "after"]);
    expect(result.suppressed).toStrictEqual([
      {
        candidateId: "bad",
        reason: "invalid_write",
        sourcePath: "bad.md",
        entityType: "req",
        message: "claim_key mismatch",
      },
    ]);
    expect(result.diagnostics).toStrictEqual([
      "Invalid bootstrap candidate at bad.md: claim_key mismatch",
    ]);
    const entityA = {
      id: "REQ-a",
      title: "REQ-a",
      status: "open",
      type: "req",
    };
    const entityB = {
      id: "REQ-b",
      title: "REQ-b",
      status: "open",
      type: "req",
    };
    const entityN = { id: "REQ-n", title: "n", status: "open", type: "req" };
    const entityBad = {
      id: "REQ-bad",
      title: "REQ-bad",
      status: "open",
      type: "req",
    };
    expect(calls).toStrictEqual([
      ["REQ-a", [], new Map([["REQ-a", entityA]])],
      [
        "REQ-b",
        links,
        new Map([
          ["REQ-a", entityA],
          ["REQ-b", entityB],
          ["REQ-n", entityN],
        ]),
      ],
      [
        7,
        [],
        new Map([
          ["REQ-a", entityA],
          ["REQ-b", entityB],
          ["REQ-n", entityN],
        ]),
      ],
      [
        "REQ-bad",
        [],
        new Map([
          ["REQ-a", entityA],
          ["REQ-b", entityB],
          ["REQ-n", entityN],
          ["REQ-bad", entityBad],
        ]),
      ],
      [
        "REQ-after",
        [],
        new Map([
          ["REQ-a", entityA],
          ["REQ-b", entityB],
          ["REQ-n", entityN],
          [
            "REQ-after",
            {
              id: "REQ-after",
              title: "REQ-after",
              status: "open",
              type: "req",
            },
          ],
        ]),
      ],
    ]);
  });
});

const HASH = "a".repeat(64);

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

function discovered(
  overrides: Partial<DiscoveryResult> = {},
  policy: Partial<ActivationPolicy> = {},
): DiscoveryResult {
  const evidence: BootstrapEvidence[] = [
    {
      provider: "generic_repo_docs",
      kind: "generic_markdown",
      label: "a",
      relativePath: "docs/a.md",
      data: {},
    },
    {
      provider: "repo_layout",
      kind: "repo_layout",
      label: "src",
      relativePath: "src",
      data: {},
    },
    {
      provider: "repo_metadata",
      kind: "repo_metadata",
      label: "none",
      data: {},
    },
    {
      provider: "generic_repo_docs",
      kind: "generic_markdown",
      label: "a again",
      relativePath: "docs/a.md",
      data: {},
    },
    {
      provider: "generic_repo_docs",
      kind: "generic_markdown",
      label: "gone",
      relativePath: "docs/gone.md",
      data: {},
    },
    {
      provider: "generic_repo_docs",
      kind: "generic_markdown",
      label: "blank",
      relativePath: "",
      data: {},
    },
  ];
  return {
    activation: activation(policy),
    pluginOffers: [],
    evidence,
    ignoredSources: ["vendor/x.md"],
    summary: {
      activationState: "root_uninitialized",
      activationMode: "cold_start_bootstrap",
      applyBlocked: false,
      reason: "discovered",
      handoffMessage: "from discovery",
      providersRun: [],
      providerCounts: {},
      detectedLanguages: [],
      detectedTestFrameworks: [],
      excludedRoots: [],
      truncated: false,
      scanWarnings: [],
    },
    migrationWarning: "migrate",
    ...overrides,
  };
}

const FILES: Record<string, string> = { "docs/a.md": "A\n" };

function context(overrides: Partial<OperationContext> = {}): OperationContext {
  const root = "/repo";
  return {
    workspaceRoot: root,
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-05T00:00:00Z"),
    fs: {
      stat: async (file: string) => {
        const relative = path.relative(root, file);
        if (relative === "src") return { isFile: () => false };
        if (!(relative in FILES)) throw new Error("ENOENT");
        return { isFile: () => true };
      },
      readFile: async (file: string) => FILES[path.relative(root, file)],
    } as unknown as OperationContext["fs"],
    git: {
      workspaceSnapshot: async () => ({
        version: "kibi.workspace-snapshot.v2",
        hash: HASH,
        dirty: false,
        fileCount: 1,
      }),
    },
    branchAttachment: {
      gitBranch: "develop",
      kbBranch: "develop",
      storePath: "/repo/.kb/branches/develop",
      kind: "exact",
      migrationRequired: false,
    },
    ...overrides,
  } as OperationContext;
}

type PresentInput = Parameters<typeof presentation.presentBootstrap>[0];

function stubs(
  result: DiscoveryResult = discovered(),
  status: Record<string, unknown> | null = {
    branch: "main",
    snapshotId: "snap-1",
  },
) {
  track(
    spyOn(discovery, "discoverBootstrap").mockImplementation(
      async () => result,
    ),
  );
  track(
    spyOn(executors, "executeStatus").mockImplementation(
      async () => ({ structuredContent: status ?? undefined }) as never,
    ),
  );
  const present = track(
    spyOn(presentation, "presentBootstrap").mockImplementation(
      () => "PRESENTED" as never,
    ),
  );
  const built = track(
    spyOn(candidatesModule, "buildBootstrapCandidates").mockImplementation(
      () => ({
        candidates: [],
        sourceOnlySignals: [],
        suppressed: [],
        diagnostics: [],
      }),
    ),
  );
  return {
    built,
    input: (): PresentInput => present.mock.calls[0]?.[0] as PresentInput,
  };
}

const SHA = (text: string) => createHash("sha256").update(text).digest("hex");
const EXPECTED = {
  branch: "main",
  kbSnapshotId: "snap-1",
  workspaceSnapshot: HASH,
  sourceHashes: { "docs/a.md": SHA("A\n"), "docs/gone.md": null },
};
const GONE = "Bootstrap evidence source is unavailable: docs/gone.md";

describe("executePlanBootstrap", () => {
  test("hands the selected candidates and bound state to the presentation", async () => {
    const plan = stubs();
    const result = await executePlanBootstrap({}, context());
    expect(result).toBe("PRESENTED" as never);
    expect(plan.input()).toStrictEqual({
      root: "/repo",
      activation: activation(),
      discoverySummary: {
        ...discovered().summary,
        applyBlocked: false,
        reason: "cold start",
      },
      migrationWarning: "migrate",
      pluginOffers: [],
      candidates: [],
      sourceOnlySignals: [],
      suppressedCandidates: [
        {
          candidateId: "",
          reason: "ignored_source",
          sourcePath: "vendor/x.md",
          entityType: "",
        },
      ],
      expected: EXPECTED,
      bindingDiagnostics: [GONE],
      contextDiagnostics: [],
    });
  });

  test("candidate generation gets the evidence, the confidence floor and generic Markdown", async () => {
    const plan = stubs();
    const built = plan.built.mockImplementation(() => ({
      candidates: [
        candidate("low", { confidence: 0.79 }),
        candidate("floor", { confidence: 0.8 }),
      ],
      sourceOnlySignals: [signal("req", "s1"), signal("test", "s2")],
      suppressed: [{ reason: "built" }],
      diagnostics: ["built diagnostic"],
    }));
    await executePlanBootstrap({ entityTypes: ["req"] }, context());
    const [evidence, existing, floor, generic, registry] =
      built.mock.calls[0] ?? [];
    expect(evidence).toStrictEqual(discovered().evidence as never);
    expect(existing).toStrictEqual(new Set());
    expect([floor, generic]).toStrictEqual([0.8, true]);
    expect(registry).toBeInstanceOf(requirementClaims.SubjectKeyRegistry);
    const input = plan.input();
    expect(input.candidates.map((row) => row.candidateId)).toStrictEqual([
      "floor",
    ]);
    expect(input.sourceOnlySignals).toStrictEqual([signal("req", "s1")]);
    expect(input.suppressedCandidates.slice(0, 1)).toStrictEqual([
      { reason: "built" },
    ]);
    expect(input.contextDiagnostics).toStrictEqual(["built diagnostic"]);
  });

  test.each([
    [{}, 0.8, 50],
    [{ minConfidence: 0.1, maxCandidates: 0 }, 0.6, 1],
    [{ minConfidence: 0.99, maxCandidates: 999 }, 0.95, 200],
    [{ minConfidence: 0.7, maxCandidates: 7.9 }, 0.7, 7],
  ] as const)(
    "%j plans with floor %d and limit %d",
    async (args, floor, limit) => {
      const plan = stubs();
      const built = plan.built.mockImplementation(() => ({
        candidates: Array.from({ length: limit + 1 }, (_, index) =>
          candidate(`d${index}`, { confidence: 0.96 }),
        ),
        sourceOnlySignals: [],
        suppressed: [],
        diagnostics: [],
      }));
      await executePlanBootstrap(args, context());
      expect(built.mock.calls[0]?.[2]).toBe(floor);
      expect(plan.input().candidates).toHaveLength(limit);
    },
  );

  test("declared claims turn generic Markdown off by default and are planned with the existing KB", async () => {
    const plan = stubs(discovered({}, { activationState: "root_active_thin" }));
    const built = plan.built;
    const prolog = { name: "engine" };
    track(
      spyOn(entities, "loadEntityIds").mockImplementation(async () => [
        "REQ-1",
        "",
        "REQ-2",
      ]),
    );
    const texts = [
      { id: "REQ-1", title: "One", semanticText: "One." },
      { id: "REQ-2", title: "Two", semanticText: "Two." },
      { id: "REQ-3", title: "Three", semanticText: "Three." },
    ];
    track(
      spyOn(entities, "loadCurrentRequirementTexts").mockImplementation(
        async () => texts,
      ),
    );
    const review = track(
      spyOn(planningReview, "loadReviewRequirements").mockImplementation(
        async () =>
          new Map([
            ["REQ-1", { modeled: true }],
            ["REQ-2", { modeled: "yes" }],
          ]) as never,
      ),
    );
    const claim = candidate("claim", { sourceKind: "intent_claim" });
    const claims = track(
      spyOn(intentClaims, "buildIntentClaimCandidates").mockImplementation(
        () => ({
          candidates: [claim],
          sourceOnlySignals: [signal("req", "claim-signal")],
          suppressed: [{ reason: "claimed" }],
          diagnostics: ["claim diagnostic"],
        }),
      ),
    );
    const reviewSignals = track(
      spyOn(conflictReview, "withConflictReviewSignals").mockImplementation(
        async (candidates, _requirements, _root, signals) => ({
          candidates: [...candidates],
          signals: [...(signals ?? []), signal("test", "review-signal")],
          diagnostics: ["review diagnostic"],
        }),
      ),
    );
    const bootstrapContext = {
      knowledgeSources: [
        {
          id: "jira",
          kind: "issue_tracker",
          title: "Jira",
          locator: "https://jira",
          authority: "authoritative",
        },
      ],
      intentClaims: [
        {
          statement: "Invoices must be sent.",
          sourceId: "jira",
          reference: "B-1",
        },
      ],
    } as const;
    await executePlanBootstrap(
      { bootstrapContext, entityTypes: ["req"] },
      context({ prolog: prolog as never }),
    );
    expect(built.mock.calls[0]?.[3]).toBe(false);
    expect(review.mock.calls[0]).toStrictEqual([
      prolog,
      ["REQ-1", "REQ-2", "REQ-3"],
    ] as never);
    const requirements = [
      { ...texts[0], modeled: true },
      { ...texts[1], modeled: false },
      texts[2],
    ];
    const [declared, existingIds, floor, registry, existing] =
      claims.mock.calls[0] ?? [];
    expect(declared).toStrictEqual(
      presentation.normalizeBootstrapContext(bootstrapContext),
    );
    expect(existingIds).toStrictEqual(new Set(["REQ-1", "REQ-2"]));
    expect(floor).toBe(0.8);
    expect(registry).toBe(built.mock.calls[0]?.[4] as never);
    expect(existing).toStrictEqual(requirements as never);
    expect(reviewSignals.mock.calls[0]).toStrictEqual([
      [claim],
      requirements,
      "/repo",
      [signal("req", "claim-signal")],
    ] as never);
    const input = plan.input();
    expect(input.bootstrapContext).toBe(bootstrapContext as never);
    expect(input.candidates.map((row) => row.candidateId)).toStrictEqual([
      "claim",
    ]);
    expect(input.sourceOnlySignals).toStrictEqual([
      signal("req", "claim-signal"),
    ]);
    expect(input.suppressedCandidates).toContainEqual({ reason: "claimed" });
    expect(input.contextDiagnostics).toStrictEqual([
      "Generic Markdown candidates are off by default because intent claims were declared; pass includeGenericMarkdown: true to include them.",
      "claim diagnostic",
      "review diagnostic",
    ]);
  });

  test("an explicit generic Markdown choice wins, with or without claims", async () => {
    const choices: unknown[] = [];
    for (const [include, claims] of [
      [true, true],
      [false, false],
      [undefined, false],
    ] as const) {
      for (const spy of spies.splice(0)) spy.mockRestore();
      const plan = stubs();
      const built = plan.built;
      await executePlanBootstrap(
        {
          ...(include === undefined ? {} : { includeGenericMarkdown: include }),
          ...(claims
            ? {
                bootstrapContext: {
                  intentClaims: [
                    { statement: "s", sourceId: "x", reference: "r" },
                  ],
                },
              }
            : {}),
        },
        context(),
      );
      choices.push([built.mock.calls[0]?.[3], plan.input().contextDiagnostics]);
    }
    expect(choices).toStrictEqual([
      [
        true,
        [
          'Intent claim cites an undeclared knowledge source "x" (r); declare it in knowledgeSources or drop the claim.',
        ],
      ],
      [false, []],
      [true, []],
    ]);
  });

  test("without generation, nothing is built and declared claims follow allowDeclaredClaims", async () => {
    const bootstrapContext = {
      knowledgeSources: [
        {
          id: "jira",
          kind: "issue_tracker",
          title: "Jira",
          locator: "https://jira",
          authority: "authoritative",
        },
      ],
      intentClaims: [
        {
          statement: "Invoices must be sent.",
          sourceId: "jira",
          reference: "B-1",
        },
        {
          statement: "Seen.",
          sourceId: "jira",
          reference: "B-2",
          kind: "observation",
        },
        { statement: "Orphan.", sourceId: "wiki", reference: "W-1" },
      ],
    } as const;
    const plan = stubs(
      discovered(
        {},
        {
          allowCandidateGeneration: false,
          activationMode: "attached_seeded_handoff",
        },
      ),
    );
    const built = plan.built;
    const claims = track(spyOn(intentClaims, "buildIntentClaimCandidates"));
    const review = track(spyOn(conflictReview, "withConflictReviewSignals"));
    await executePlanBootstrap({ bootstrapContext }, context());
    expect(built).not.toHaveBeenCalled();
    expect(claims).not.toHaveBeenCalled();
    expect(review.mock.calls[0]?.[0]).toStrictEqual([]);
    expect(review.mock.calls[0]?.[3]).toStrictEqual([]);
    expect(plan.input().suppressedCandidates).toStrictEqual([
      {
        candidateId: "",
        reason: "suppressed_by_activation",
        sourcePath: "B-1",
        entityType: "req",
        statement: "Invoices must be sent.",
        sourceId: "jira",
        activationMode: "attached_seeded_handoff",
      },
      {
        candidateId: "",
        reason: "suppressed_by_activation",
        sourcePath: "B-2",
        entityType: "fact",
        statement: "Seen.",
        sourceId: "jira",
        activationMode: "attached_seeded_handoff",
      },
      {
        candidateId: "",
        reason: "ignored_source",
        sourcePath: "vendor/x.md",
        entityType: "",
      },
    ]);
    expect(plan.input().candidates).toStrictEqual([]);
    expect(plan.input().sourceOnlySignals).toStrictEqual([]);
    expect(plan.input().contextDiagnostics).toStrictEqual([
      "Generic Markdown candidates are off by default because intent claims were declared; pass includeGenericMarkdown: true to include them.",
    ]);

    for (const spy of spies.splice(0)) spy.mockRestore();
    const allowed = stubs(
      discovered(
        {},
        { allowCandidateGeneration: false, allowDeclaredClaims: true },
      ),
    );
    const claimsAllowed = track(
      spyOn(intentClaims, "buildIntentClaimCandidates"),
    );
    await executePlanBootstrap({ bootstrapContext }, context());
    expect(claimsAllowed).toHaveBeenCalledTimes(1);
    expect(allowed.input().suppressedCandidates).not.toContainEqual(
      expect.objectContaining({ reason: "suppressed_by_activation" }),
    );

    for (const spy of spies.splice(0)) spy.mockRestore();
    const none = stubs(discovered({}, { allowCandidateGeneration: false }));
    await executePlanBootstrap({}, context());
    expect(none.input().suppressedCandidates).toStrictEqual([
      {
        candidateId: "",
        reason: "ignored_source",
        sourcePath: "vendor/x.md",
        entityType: "",
      },
    ]);
    for (const spy of spies.splice(0)) spy.mockRestore();
    const noSources = stubs(
      discovered({}, { allowCandidateGeneration: false }),
    );
    await executePlanBootstrap(
      {
        bootstrapContext: { intentClaims: [bootstrapContext.intentClaims[0]] },
      },
      context(),
    );
    expect(noSources.input().suppressedCandidates).toHaveLength(1);
  });

  test("the plan activation and a handoff message come from the selected candidates", async () => {
    const plan = stubs();
    const planned = activation({
      applyBlocked: true,
      reason: "planned reason",
      handoffMessage: "planned handoff",
    });
    const claimActivation = track(
      spyOn(activationModule, "claimPlanActivation").mockImplementation(
        () => planned,
      ),
    );
    await executePlanBootstrap({}, context());
    expect(claimActivation.mock.calls[0]).toStrictEqual([
      activation(),
      [],
    ] as never);
    expect(plan.input().activation).toBe(planned);
    expect(plan.input().discoverySummary).toStrictEqual({
      ...discovered().summary,
      applyBlocked: true,
      reason: "planned reason",
      handoffMessage: "planned handoff",
    });
  });

  test("shared subject facts are presented", async () => {
    const plan = stubs();
    plan.built.mockImplementation(() => ({
      candidates: [candidate("one")],
      sourceOnlySignals: [],
      suppressed: [],
      diagnostics: [],
    }));
    track(
      spyOn(requirementClaims, "shareSubjectFacts").mockImplementation(() => ({
        candidates: [candidate("shared")],
        diagnostics: ["shared diagnostic"],
      })),
    );
    await executePlanBootstrap({}, context());
    expect(plan.input().candidates).toStrictEqual([candidate("shared")]);
    expect(plan.input().contextDiagnostics).toStrictEqual([
      "shared diagnostic",
    ]);
  });

  test("selection follow-ups and diagnostics are presented after the others", async () => {
    const plan = stubs();
    plan.built.mockImplementation(() => ({
      candidates: [
        candidate("bad", {
          applyPlan: [{ type: "req" }],
          entityType: "test",
        }),
      ],
      sourceOnlySignals: [signal("test", "built")],
      suppressed: [],
      diagnostics: [],
    }));
    await executePlanBootstrap({}, context());
    expect(
      plan.input().sourceOnlySignals.map((row) => row.sourcePath),
    ).toStrictEqual(["built", "bad.md"]);
    expect(plan.input().contextDiagnostics).toStrictEqual([
      "Invalid bootstrap candidate at bad.md: 'type' and 'id' are required for upsert",
    ]);
    for (const spy of spies.splice(0)) spy.mockRestore();
    const filtered = stubs();
    filtered.built.mockImplementation(() => ({
      candidates: [candidate("bad", { applyPlan: [{ type: "req" }] })],
      sourceOnlySignals: [],
      suppressed: [],
      diagnostics: [],
    }));
    await executePlanBootstrap({ entityTypes: ["req", "test"] }, context());
    expect(filtered.input().sourceOnlySignals).toHaveLength(1);
    for (const spy of spies.splice(0)) spy.mockRestore();
    const dropped = stubs();
    dropped.built.mockImplementation(() => ({
      candidates: [candidate("bad", { applyPlan: [{ type: "req" }] })],
      sourceOnlySignals: [],
      suppressed: [],
      diagnostics: [],
    }));
    await executePlanBootstrap({ entityTypes: ["req", "scenario"] }, context());
    expect(dropped.input().sourceOnlySignals).toHaveLength(1);
    for (const spy of spies.splice(0)) spy.mockRestore();
    const none = stubs();
    none.built.mockImplementation(() => ({
      candidates: [candidate("bad", { applyPlan: [{ type: "req" }] })],
      sourceOnlySignals: [],
      suppressed: [],
      diagnostics: [],
    }));
    await executePlanBootstrap({ entityTypes: ["req"] }, context());
    expect(none.input().sourceOnlySignals).toHaveLength(1);
  });
});

describe("existing KB knowledge", () => {
  const ids = async (
    overrides: Partial<OperationContext>,
    state = "root_active_thin",
  ) => {
    const plan = stubs(discovered({}, { activationState: state as never }));
    const claims = track(spyOn(intentClaims, "buildIntentClaimCandidates"));
    await executePlanBootstrap(
      {
        bootstrapContext: {
          intentClaims: [{ statement: "s", sourceId: "x", reference: "r" }],
        },
      },
      context(overrides),
    );
    return {
      plan,
      existing: claims.mock.calls[0]?.[1],
      requirements: claims.mock.calls[0]?.[4],
    };
  };

  test("an attached root starts the engine when none was supplied", async () => {
    const engine = { name: "lazy" };
    let started = 0;
    const loaded = track(
      spyOn(entities, "loadEntityIds").mockImplementation(async () => ["A"]),
    );
    track(
      spyOn(entities, "loadCurrentRequirementTexts").mockImplementation(
        async () => [],
      ),
    );
    track(
      spyOn(planningReview, "loadReviewRequirements").mockImplementation(
        async () => new Map(),
      ),
    );
    const ensureProlog = async () => {
      started += 1;
      return engine as never;
    };
    expect((await ids({ ensureProlog })).existing).toStrictEqual(
      new Set(["A"]),
    );
    expect(loaded.mock.calls[0]?.[0]).toBe(engine as never);
    for (const spy of spies.splice(0)) spy.mockRestore();
    track(
      spyOn(entities, "loadEntityIds").mockImplementation(async () => ["A"]),
    );
    track(
      spyOn(entities, "loadCurrentRequirementTexts").mockImplementation(
        async () => [],
      ),
    );
    track(
      spyOn(planningReview, "loadReviewRequirements").mockImplementation(
        async () => new Map(),
      ),
    );
    expect(
      (await ids({ ensureProlog }, "root_active_seeded")).existing,
    ).toStrictEqual(new Set(["A"]));
    for (const spy of spies.splice(0)) spy.mockRestore();
    expect(
      (await ids({ ensureProlog }, "root_uninitialized")).existing,
    ).toStrictEqual(new Set());
    expect(started).toBe(2);
    for (const spy of spies.splice(0)) spy.mockRestore();
    const bare = await ids({});
    expect(bare.existing).toStrictEqual(new Set());
    expect(bare.requirements).toStrictEqual([]);
    expect(bare.plan.input().bindingDiagnostics).toStrictEqual([GONE]);
  });

  test("without declared claims only the ids are read", async () => {
    track(
      spyOn(entities, "loadEntityIds").mockImplementation(async () => ["A"]),
    );
    const texts = track(spyOn(entities, "loadCurrentRequirementTexts"));
    const review = track(
      spyOn(planningReview, "loadReviewRequirements").mockImplementation(
        async () => new Map(),
      ),
    );
    const plan = stubs();
    const built = plan.built.mockImplementation(() => ({
      candidates: [candidate("A", { applyPlan: [req("A")] })],
      sourceOnlySignals: [],
      suppressed: [],
      diagnostics: [],
    }));
    await executePlanBootstrap({}, context({ prolog: {} as never }));
    expect(texts).not.toHaveBeenCalled();
    expect(review.mock.calls[0]?.[1]).toStrictEqual([]);
    expect(built).toHaveBeenCalled();
    expect(plan.input().suppressedCandidates[0]).toStrictEqual({
      candidateId: "A",
      reason: "entity_exists",
      sourcePath: "A.md",
      entityType: "req",
    });
  });

  test("a failed read blocks the plan with a binding diagnostic", async () => {
    track(
      spyOn(entities, "loadEntityIds").mockImplementation(async () => {
        throw new Error("engine down");
      }),
    );
    const { plan, existing } = await ids({ prolog: {} as never });
    expect(existing).toStrictEqual(new Set());
    expect(plan.input().bindingDiagnostics).toStrictEqual([
      GONE,
      "Bootstrap binding could not read existing entity IDs: engine down",
    ]);
    for (const spy of spies.splice(0)) spy.mockRestore();
    track(
      spyOn(entities, "loadEntityIds").mockImplementation(async () => {
        throw "offline";
      }),
    );
    const again = await ids({ prolog: {} as never });
    expect(again.plan.input().bindingDiagnostics).toContain(
      "Bootstrap binding could not read existing entity IDs: offline",
    );
  });
});

describe("plan binding", () => {
  const bind = async (
    overrides: Partial<OperationContext>,
    status: Record<string, unknown> | null = {
      branch: "main",
      snapshotId: "snap-1",
    },
  ) => {
    for (const spy of spies.splice(0)) spy.mockRestore();
    const plan = stubs(discovered(), status);
    await executePlanBootstrap({}, context(overrides));
    const input = plan.input();
    return { expected: input.expected, diagnostics: input.bindingDiagnostics };
  };
  const snapshot = (hash: string) => ({
    git: {
      workspaceSnapshot: async () => ({
        version: "kibi.workspace-snapshot.v2" as const,
        hash,
        dirty: false,
        fileCount: 1,
      }),
    },
  });

  test("a runtime without a filesystem binds no sources", async () => {
    expect(await bind({ fs: undefined })).toStrictEqual({
      expected: { ...EXPECTED, sourceHashes: {} },
      diagnostics: [
        "Bootstrap plan binding requires a filesystem-capable runtime.",
      ],
    });
  });

  test("the branch falls back to the attachment, and an unknown one is reported", async () => {
    expect((await bind({}, { snapshotId: "snap-1" })).expected.branch).toBe(
      "develop",
    );
    const noBranch = await bind(
      { branchAttachment: undefined },
      { snapshotId: "snap-1" },
    );
    expect(noBranch).toStrictEqual({
      expected: { ...EXPECTED, branch: "unavailable" },
      diagnostics: [
        GONE,
        "Bootstrap plan binding could not determine the active Git branch.",
      ],
    });
    expect(
      (await bind({}, { branch: "unknown", snapshotId: "snap-1" })).diagnostics,
    ).toStrictEqual([
      GONE,
      "Bootstrap plan binding could not determine the active Git branch.",
    ]);
    expect((await bind({}, null)).expected).toStrictEqual({
      ...EXPECTED,
      branch: "develop",
      kbSnapshotId: "unavailable",
    });
  });

  test("a workspace snapshot must be a 64-digit hex hash", async () => {
    const message =
      "Bootstrap plan binding could not determine a current workspace snapshot.";
    expect(await bind({ git: undefined })).toStrictEqual({
      expected: { ...EXPECTED, workspaceSnapshot: "unavailable" },
      diagnostics: [GONE, message],
    });
    for (const hash of [
      "abc",
      `x${"a".repeat(64)}`,
      `${"a".repeat(64)}x`,
      "g".repeat(64),
    ])
      expect(await bind(snapshot(hash))).toStrictEqual({
        expected: { ...EXPECTED, workspaceSnapshot: hash },
        diagnostics: [GONE, message],
      });
    expect((await bind(snapshot("A".repeat(64)))).diagnostics).toStrictEqual([
      GONE,
    ]);
  });

  test("a missing KB snapshot binds the empty source state", async () => {
    const sourceHashes = EXPECTED.sourceHashes;
    expect(
      await bind({}, { branch: "main", snapshotId: "missing" }),
    ).toStrictEqual({
      expected: {
        ...EXPECTED,
        kbSnapshotId: bootstrapEmptyKbSnapshotId({
          branch: "main",
          workspaceSnapshot: HASH,
          sourceHashes,
        }),
      },
      diagnostics: [GONE],
    });
    const message =
      "Bootstrap plan binding could not determine a current KB snapshot.";
    expect(
      await bind({ branchAttachment: undefined }, { snapshotId: "missing" }),
    ).toStrictEqual({
      expected: { ...EXPECTED, branch: "unavailable", kbSnapshotId: "missing" },
      diagnostics: [
        GONE,
        "Bootstrap plan binding could not determine the active Git branch.",
        message,
      ],
    });
    expect(
      (await bind(snapshot("abc"), { branch: "main", snapshotId: "missing" }))
        .expected.kbSnapshotId,
    ).toBe("missing");
    for (const snapshotId of [undefined, "", "unknown", "unavailable"])
      expect(
        (await bind({}, { branch: "main", snapshotId })).diagnostics,
      ).toStrictEqual([GONE, message]);
  });

  test("a failed status read binds nothing", async () => {
    const plan = stubs();
    for (const spy of spies.splice(1, 1)) spy.mockRestore();
    track(
      spyOn(executors, "executeStatus").mockImplementation(async () => {
        throw new Error("no status");
      }),
    );
    await executePlanBootstrap({}, context());
    expect(plan.input().expected).toStrictEqual({
      branch: "develop",
      kbSnapshotId: "unavailable",
      workspaceSnapshot: "unavailable",
      sourceHashes: {},
    });
    expect(plan.input().bindingDiagnostics).toStrictEqual([
      "Bootstrap plan binding could not read current repository state.",
    ]);
    for (const spy of spies.splice(0)) spy.mockRestore();
    const detached = stubs();
    for (const spy of spies.splice(1, 1)) spy.mockRestore();
    track(
      spyOn(executors, "executeStatus").mockImplementation(async () => {
        throw new Error("no status");
      }),
    );
    await executePlanBootstrap({}, context({ branchAttachment: undefined }));
    expect(detached.input().expected.branch).toBe("unavailable");
  });
});
