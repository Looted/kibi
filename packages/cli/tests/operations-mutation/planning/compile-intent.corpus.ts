import { spyOn } from "bun:test";
import { createHash } from "node:crypto";
import * as intentSearch from "../../../src/intent-search.js";
import * as validation from "../../../src/operations/mutation/validation.js";
import * as planning from "../../../src/operations/planning/compile-intent.js";
import type { CompileIntentArgs } from "../../../src/operations/planning/compile-intent.js";
import * as conflictReview from "../../../src/operations/planning/conflict-review.js";
import { semanticClaimKey } from "../../../src/operations/semantic-advisor/clauses.js";
import * as orchestration from "../../../src/operations/semantic-advisor/plugin-orchestration.js";
import { canonicalize } from "../../../src/operations/semantic-advisor/shared.js";
import * as discoveryEntities from "../../../src/public/operations/discovery-entities.js";
import * as discoveryExecutors from "../../../src/public/operations/discovery-executors.js";
import { nodeFilesystem } from "../../../src/public/operations/node-ports.js";
import type {
  OperationContext,
  PrologPort,
  PrologQueryResult,
} from "../../../src/public/operations/runtime-types.js";
import { tempWorkspace } from "../workspace.js";

/**
 * Compile inputs whose plans are pinned in compile-intent.golden.json, with
 * the knowledge base, discovery, advisor and what-if answers each one sees.
 */

type Row = Record<string, unknown>;
type Orchestrated = Awaited<
  ReturnType<typeof orchestration.analyzeSemanticAdvisorInputWithPlugins>
>;

export type Scenario = Readonly<{
  args: CompileIntentArgs;
  /** The status payload; null for none. */
  status?: Row | null;
  matches?: readonly Row[];
  margin?: number | null;
  abstained?: boolean;
  /** loadEntities rows by entity id. */
  entities?: Readonly<Record<string, readonly Row[]>>;
  /** Current requirements conflict review reads, by id. */
  review?: Readonly<Record<string, Row>>;
  /** The what-if answer: a JsonString binding, or false for a failed query. */
  whatIf?: string | false;
  /** Workspace files; the workspace has no filesystem port when null. */
  files?: Readonly<Record<string, string>> | null;
  /** Changes to the advisor's answer. */
  advisor?: (result: Orchestrated) => Orchestrated;
  ensurePlugins?: boolean;
  /** A value every entity validation throws. */
  failValidation?: unknown;
}>;

const CONTEXT = "Asked by the operations team in the security review.";
const SESSIONS = "Users must keep at most 3 active sessions.";
const CHECKOUT = "Checkout may happen only when the cart total is positive.";
const POSTS = "Users cannot delete posts unless they own them.";
const LOGS = "The system must retain audit logs.";
const AMBIGUOUS = "Users must keep 12 active sessions.";
const RATIONALE = "Because operators need auditability, exports are logged.";

const proposalId = (candidateId: string, relationship: Row) =>
  `PROP-${createHash("sha256")
    .update(canonicalize({ candidateId, relationship }))
    .digest("hex")
    .slice(0, 8)}`.toUpperCase();

const STATUS = {
  branch: "develop",
  snapshotId: "stamp:test",
  proofSnapshot: "f".repeat(64),
  proofSnapshotDirty: true,
  proofSnapshotFileCount: 7,
};

const match = (id: string, type: string, score: number, extra: Row = {}) => ({
  entity: { id, type, title: `${id} title`, ...extra },
  score,
  reasons: [`matched ${id}`],
  evidence: { lanes: ["text"] },
});

const witness = (extra: Row) => ({
  requirements: ["REQ-OTHER"],
  reason: "overlap",
  status: "contradiction",
  ...extra,
});
const analysis = (parts: Row) => JSON.stringify(parts);

const reviewRequirement = (id: string, modeled: boolean, text = "") => ({
  id,
  title: `${id} title`,
  semanticText: text || `Users must keep sessions short for ${id}.`,
  modeled,
});

const stamp = (pluginId: string, capability: string, extra: Row = {}) => ({
  pluginId,
  pluginVersion: "1.0.0",
  capability,
  mode: "active",
  external: true,
  network: false,
  metered: false,
  ...extra,
});

const create = (intent: string, extra: Partial<CompileIntentArgs> = {}) =>
  ({ intent, mode: "create", context: CONTEXT, ...extra }) as CompileIntentArgs;
const update = (intent: string, extra: Partial<CompileIntentArgs> = {}) =>
  ({ intent, mode: "update", ...extra }) as CompileIntentArgs;

const withPropositions =
  (
    change: (
      proposition: Orchestrated["analysis"]["receipt"]["propositions"][number],
      index: number,
    ) => Row,
    dropSuggestions = true,
  ) =>
  (result: Orchestrated): Orchestrated => ({
    ...result,
    analysis: {
      ...result.analysis,
      receipt: {
        ...result.analysis.receipt,
        propositions: result.analysis.receipt.propositions.map(
          (proposition, index) =>
            ({ ...proposition, ...change(proposition, index) }) as never,
        ),
        suggestions: dropSuggestions ? [] : result.analysis.receipt.suggestions,
      },
    },
  });

const withApplyPlan =
  (steps: readonly Row[]) =>
  (result: Orchestrated): Orchestrated => ({
    ...result,
    analysis: {
      ...result.analysis,
      receipt: {
        ...result.analysis.receipt,
        suggestions: result.analysis.receipt.suggestions.map(
          (suggestion) =>
            ({
              ...suggestion,
              applyPlan: [...suggestion.applyPlan, ...steps],
            }) as never,
        ),
      },
    },
  });

export const SCENARIOS: Record<string, Scenario> = {
  "create a strict property": { args: create(SESSIONS) },
  "create a rule with an explicit id, title and documents": {
    args: create(CHECKOUT, {
      requirementId: "  REQ-checkout  ",
      title: " Checkout rule ",
      sourceLocations: [
        { path: "docs\\checkout.md" },
        { path: "src/missing.ts" },
        { path: " src/cart.ts " },
        { path: "src/cart.ts" },
      ],
      semanticFacets: { lanes: ["rule"] } as never,
      sourceExcerpt: "Checkout needs money.",
      sourceReference: "TICKET-7",
    }),
    files: { "src/cart.ts": "export const cart = 1;\n" },
  },
  "create a predicate from given clauses": {
    args: create(`${POSTS} ${RATIONALE}`, {
      clauses: [POSTS.slice(0, -1)],
    }),
  },
  "create an unmodeled requirement": { args: create(LOGS) },
  "create an ambiguous requirement": { args: create(AMBIGUOUS) },
  "create rationale only": { args: create(RATIONALE) },
  "create with a markdown document in the knowledge base": {
    args: create(SESSIONS, {
      sourceLocations: [{ path: ".kb/requirements/REQ-x.md" }],
    }),
  },
  "create with the .kb folder as location": {
    args: create(SESSIONS, { sourceLocations: [{ path: ".kb" }] }),
  },
  "create with an mdx document": {
    args: create(SESSIONS, { sourceLocations: [{ path: "docs/Limits.MDX" }] }),
  },
  "create without a filesystem": {
    args: create(SESSIONS, { sourceLocations: [{ path: "src/a.ts" }] }),
    files: null,
  },
  "create over an existing id with other content": {
    args: create(SESSIONS, { requirementId: "REQ-taken" }),
    entities: {
      "REQ-taken": [{ id: "REQ-taken", title: "Other", status: "open" }],
    },
  },
  "create over an existing id with the same semantic text": {
    args: create(SESSIONS, { requirementId: "REQ-same" }),
    entities: {
      "REQ-same": [{ id: "REQ-same", title: "x", semantic_text: SESSIONS }],
    },
  },
  "create over an existing id with the same title": {
    args: create(SESSIONS, { requirementId: "REQ-titled" }),
    entities: { "REQ-titled": [{ id: "REQ-titled", title: SESSIONS }] },
  },
  "update a selected top match": {
    args: update(SESSIONS, { context: "Ops asked again." }),
    matches: [match("REQ-top", "req", 0.85), match("REQ-next", "req", 0.5)],
    margin: 0.15,
    entities: {
      "REQ-top": [
        {
          id: "REQ-top",
          title: "Top",
          status: "in_progress",
          source: ".kb/requirements/REQ-top.md",
          logic_claims: ["CLAIM-OLD"],
        },
      ],
    },
    files: {
      ".kb/requirements/REQ-top.md":
        "---\nid: REQ-top\ntitle: Top\n---\n\nOld statement.\n\n## Context\n\nKept context.\n",
    },
    review: { "REQ-next": reviewRequirement("REQ-next", true) },
  },
  "update with a low top score": {
    args: update(SESSIONS),
    matches: [match("REQ-low", "req", 0.84)],
    margin: 0.5,
  },
  "update with a narrow margin": {
    args: update(SESSIONS),
    matches: [match("REQ-close", "req", 0.95)],
    margin: 0.14,
  },
  "update with no margin": {
    args: update(SESSIONS),
    matches: [match("REQ-only", "req", 0.9)],
    margin: null,
  },
  "update with no match": { args: update(SESSIONS) },
  "update an id that is not found": {
    args: update(SESSIONS, { requirementId: "REQ-gone" }),
  },
  "update an existing id from its own document": {
    args: update(SESSIONS, {
      requirementId: "REQ-doc",
      sourceLocations: [{ path: "docs/req-doc.md" }],
    }),
    entities: { "REQ-doc": [{ id: "REQ-doc", title: "Doc" }] },
    files: { "docs/req-doc.md": "---\nid: REQ-doc\n---\n\nOld.\n" },
  },
  "update an existing id whose source is not markdown": {
    args: update(SESSIONS, { requirementId: "REQ-yaml" }),
    entities: {
      "REQ-yaml": [{ id: "REQ-yaml", title: "Yaml", source: "kb/req.yaml" }],
    },
  },
  "update an existing id whose document is missing": {
    args: update(SESSIONS, { requirementId: "REQ-lost" }),
    entities: {
      "REQ-lost": [{ id: "REQ-lost", title: "Lost", source: "docs/lost.md" }],
    },
  },
  "update an existing id without a body": {
    args: update(SESSIONS, { requirementId: "REQ-bare" }),
    entities: {
      "REQ-bare": [{ id: "REQ-bare", title: "Bare", source: "docs/bare.md" }],
    },
    files: { "docs/bare.md": "---\nid: REQ-bare\n---\n" },
  },
  "drafts with one scenario and tests": {
    args: create(SESSIONS, {
      requirementId: "REQ-drafts",
      scenarioDrafts: [
        { title: " Limit reached ", body: " When a 4th session opens. " },
      ],
      testDrafts: [
        { title: "Limit test", body: " Open four sessions. " },
        {
          id: " TEST-given ",
          title: "Given test",
          body: "b",
          verificationScope: "unit",
          verificationPerspective: "consumer",
        },
      ],
    } as never),
  },
  "drafts with several scenarios": {
    args: create(SESSIONS, {
      requirementId: "REQ-many",
      scenarioDrafts: [
        { id: "SCEN-a", title: "A", body: "a" },
        { id: "SCEN-a", title: "A again", body: "a" },
        { id: "SCEN-b", title: "B", body: "b" },
        { id: "SCEN-c", title: "C", body: "c" },
      ],
      testDrafts: [
        { title: "Unlinked", body: "u" },
        { id: "TEST-dup", title: "Dup", body: "d", scenarioIds: ["SCEN-b"] },
        { id: "TEST-dup", title: "Dup", body: "d", scenarioIds: [] },
        {
          id: "TEST-mixed",
          title: "Mixed",
          body: "m",
          scenarioIds: ["SCEN-b", " SCEN-b ", "", "SCEN-x", "SCEN-a"],
        },
        { id: "TEST-b", title: "B", body: "b", scenarioIds: ["SCEN-b"] },
      ],
    } as never),
  },
  "drafts with tests and no scenario": {
    args: create(SESSIONS, {
      requirementId: "REQ-lonely",
      testDrafts: [{ title: "Alone", body: "a" }],
    } as never),
  },
  "traceability proposals": {
    args: create(SESSIONS, {
      requirementId: "REQ-traced",
      proposalDecisions: [
        {
          proposalId: proposalId("SCEN-near", {
            from: "REQ-traced",
            to: "SCEN-near",
            type: "specified_by",
          }),
          decision: "accept",
        },
        {
          proposalId: proposalId("SYM-near", {
            from: "SYM-near",
            to: "REQ-traced",
            type: "implements",
          }),
          decision: "accept",
        },
        {
          proposalId: proposalId("TEST-near", {
            from: "TEST-near",
            to: "REQ-traced",
            type: "covered_by",
          }),
          decision: "reject",
        },
        { proposalId: "PROP-OTHER", decision: "accept" },
      ],
    } as never),
    matches: [
      match("SCEN-near", "scenario", 0.7),
      match("SCEN-far", "scenario", 0.65),
      match("SYM-near", "symbol", 0.6),
      match("TEST-near", "test", 0.5),
      match("FACT-near", "fact", 0.4),
      match("", "test", 0.3),
      match("REQ-near", "req", 0.2),
    ],
  },
  "create with a blank requirement id": {
    args: create(SESSIONS, { requirementId: "  " }),
  },
  "create over the generated id of other content": {
    args: create(SESSIONS),
    entities: {
      "REQ-users-must-keep-at-most-3-active-sessions-11D76D0B": [
        { id: "x", title: "Other" },
      ],
    },
  },
  "create with no source locations": {
    args: create(SESSIONS, { sourceLocations: [] }),
  },
  "create with a padded markdown location": {
    args: create(SESSIONS, { sourceLocations: [{ path: " docs/padded.md " }] }),
  },
  "create with a location that only contains .md": {
    args: create(SESSIONS, {
      sourceLocations: [{ path: "docs/notes.md.txt" }],
    }),
  },
  "create naming an existing document": {
    args: create(SESSIONS, { sourceLocations: [{ path: "docs/exists.md" }] }),
    files: {
      "docs/exists.md":
        "---\nid: REQ-exists\n---\n\nExisting body.\n\n## Notes\n\nKept notes.\n",
    },
  },
  "update an existing id whose source is text with front matter": {
    args: update(SESSIONS, { requirementId: "REQ-txt" }),
    entities: {
      "REQ-txt": [{ id: "REQ-txt", title: "Txt", source: "docs/req.txt" }],
    },
    files: { "docs/req.txt": "---\nid: REQ-txt\n---\n\nText body.\n" },
  },
  "merged steps with junk": {
    args: create(SESSIONS, { requirementId: "REQ-merge" }),
    advisor: withApplyPlan([
      {
        type: "fact",
        id: "FACT-m",
        properties: { title: "M", status: "active" },
        relationships: [
          { type: "constrained_by", from: "FACT-m", to: "FACT-x" },
          { type: "constrained_by", from: "FACT-m", to: "FACT-x" },
          null,
          "loose",
          {},
        ],
      },
      {
        type: "fact",
        id: "FACT-m",
        properties: { title: "M2" },
        relationships: [
          null,
          { type: "constrained_by", from: "FACT-m", to: "FACT-y" },
        ],
      },
      { type: "fact", id: "FACT-m", properties: null, relationships: "none" },
      { type: "", id: "FACT-no-type" },
      { type: "fact", id: " " },
      { type: "fact", id: "REQ-merge", properties: { title: "Same id" } },
    ]),
  },
  "merged steps of other entities": {
    args: create(SESSIONS, { requirementId: "REQ-merge" }),
    advisor: withApplyPlan([
      {
        type: "fact",
        id: "FACT-norel",
        properties: { title: "N", status: "active" },
      },
      {
        type: "req",
        id: "REQ-other",
        properties: { title: "Other", status: "open" },
        relationships: [],
        document: { body: "Other body.\n\n\n" },
      },
      { type: "symbol", id: "SYM-m", properties: { title: "sym" } },
      { type: "fact", id: "FACT-empty", properties: {} },
      {
        type: "fact",
        id: "REQ-merge",
        properties: { title: "Same id", status: "active" },
      },
      {
        type: "req",
        id: "REQ-dup",
        properties: { title: "Dup", status: "open" },
        relationships: [
          { type: "relates_to", from: "REQ-dup", to: "REQ-merge" },
          { type: "relates_to", from: "REQ-dup", to: "REQ-merge" },
          "loose",
        ],
      },
    ]),
  },
  "no propositions": {
    args: create(SESSIONS),
    advisor: (result) => ({
      ...result,
      analysis: {
        ...result.analysis,
        receipt: {
          ...result.analysis.receipt,
          propositions: [],
          suggestions: [],
        },
      },
    }),
  },
  "propositions without a role": {
    args: create(SESSIONS),
    advisor: withPropositions(() => ({ role: undefined }), false),
  },
  "suggestion kinds over modeled statuses": {
    args: create(`${AMBIGUOUS} ${LOGS}`),
    advisor: withPropositions(() => ({ status: "modeled" }), false),
  },
  "more than ten proposals": {
    args: create(SESSIONS, { requirementId: "REQ-many-tests" }),
    matches: Array.from({ length: 12 }, (_, index) =>
      match(
        `TEST-${String(index).padStart(2, "0")}`,
        "test",
        0.9 - index / 100,
      ),
    ),
  },
  "a conflict among mixed witnesses": {
    args: create(SESSIONS),
    whatIf: analysis({
      introduced: [
        witness({ status: "infeasible", kind: "scenario_feasibility" }),
        witness({}),
      ],
    }),
  },
  "host interpretation of one clause": {
    args: create(`${SESSIONS} ${LOGS}`, {
      interpretations: [
        {
          claim_key: semanticClaimKey(SESSIONS),
          claim_text: "Users must keep at most 3 active sessions",
          ir: { kind: "unknown" },
          confidence: 0.5,
        },
        {
          claim_key: "CLAIM-UNKNOWN",
          claim_text: "Nothing",
          ir: { kind: "unknown" },
          confidence: 0.5,
        },
      ] as never,
    }),
  },
  "drafts with untitled and repeated links": {
    args: create(SESSIONS, {
      requirementId: "REQ-links",
      scenarioDrafts: [
        { id: "SCEN-b", title: "B", body: "b" },
        { title: "***", body: "untitled" },
      ],
      testDrafts: [
        { title: " Padded ", body: "p", scenarioIds: ["", "SCEN-b"] },
        { title: "***", body: "r", scenarioIds: ["SCEN-b", "SCEN-b"] },
      ],
    } as never),
  },
  "a failed what-if query": { args: create(SESSIONS), whatIf: false },
  "an unreadable what-if answer": { args: create(SESSIONS), whatIf: "{" },
  "a what-if answer that is not a record": {
    args: create(SESSIONS),
    whatIf: "7",
  },
  "an introduced contradiction": {
    args: create(SESSIONS, { requirementId: "REQ-conflict" }),
    whatIf: analysis({
      introduced: [witness({})],
      removed: [witness({ requirements: ["REQ-removed"] })],
      unchanged: [
        witness({ requirements: ["REQ-conflict"], status: "overlap" }),
        witness({ requirements: ["REQ-elsewhere"] }),
      ],
    }),
  },
  "an infeasible scenario": {
    args: create(SESSIONS),
    whatIf: JSON.stringify(
      JSON.stringify([
        witness({ status: "infeasible", kind: "scenario_feasibility" }),
      ]),
    ),
  },
  "an overlap the checker cannot decide": {
    args: create(SESSIONS),
    whatIf: analysis({ introduced: [witness({ status: "overlap" })] }),
  },
  "conflict review of related requirements": {
    args: create(SESSIONS, {
      requirementId: "REQ-target",
      conflictReviews: [
        { requirementId: " REQ-r1 ", verdict: "no_conflict", note: "fine" },
        { requirementId: "REQ-r2", verdict: "conflict" },
        { requirementId: "", verdict: "conflict" },
        { requirementId: "REQ-target", verdict: "conflict" },
        { requirementId: "REQ-unknown", verdict: "conflict" },
        { requirementId: "REQ-extra", verdict: "no_conflict" },
        { requirementId: "REQ-r3", verdict: "conflict" },
      ],
    }),
    matches: [
      match("REQ-r1", "req", 0.9),
      match("REQ-r2", "req", 0.8),
      match("REQ-r1", "req", 0.7),
      match("REQ-target", "req", 0.6),
      match("REQ-modeled", "req", 0.5),
      match("REQ-p1", "req", 0.4),
      match("REQ-low", "req", 0.09),
      match("REQ-edge", "req", 0.1),
      match("REQ-r3", "req", 0.35),
      match("REQ-missing", "req", 0.3),
      match("SCEN-x", "scenario", 0.3),
      match("", "req", 0.3),
    ],
    review: {
      "REQ-r1": reviewRequirement("REQ-r1", false),
      "REQ-r2": reviewRequirement("REQ-r2", true),
      "REQ-modeled": reviewRequirement("REQ-modeled", true),
      "REQ-p1": reviewRequirement("REQ-p1", false),
      "REQ-extra": reviewRequirement("REQ-extra", true),
      "REQ-edge": reviewRequirement("REQ-edge", false),
      "REQ-r3": reviewRequirement("REQ-r3", true),
    },
  },
  "pending reviews beyond the limit": {
    args: create(LOGS, { requirementId: "REQ-unmodeled" }),
    matches: ["a", "b", "c", "d", "e", "f", "g"].map((suffix, index) =>
      match(`REQ-${suffix}`, "req", 0.9 - index / 100),
    ),
    review: Object.fromEntries(
      ["a", "b", "c", "d", "e", "f", "g"].map((suffix, index) => [
        `REQ-${suffix}`,
        reviewRequirement(`REQ-${suffix}`, index % 2 === 0),
      ]),
    ),
  },
  "only modeled related requirements": {
    args: create(SESSIONS, { requirementId: "REQ-calm" }),
    matches: [match("REQ-m", "req", 0.9)],
    review: { "REQ-m": reviewRequirement("REQ-m", true) },
  },
  "a pending unmodeled related requirement": {
    args: create(SESSIONS, { requirementId: "REQ-calm" }),
    matches: [match("REQ-u", "req", 0.9)],
    review: { "REQ-u": reviewRequirement("REQ-u", false) },
  },
  "host interpretations": {
    args: create(SESSIONS, {
      interpretations: [
        {
          claim_key: semanticClaimKey(SESSIONS),
          claim_text: "Users must keep at most 3 active sessions",
          ir: { kind: "unknown" },
          confidence: 0.5,
        },
      ] as never,
    }),
  },
  "capability plugins consulted": {
    args: create(SESSIONS),
    ensurePlugins: true,
    advisor: (result) => ({
      ...result,
      stamps: [
        stamp("plugin-a", "semantic_classifier", {
          fallbackUsed: true,
          model: "m1",
        }),
        stamp("plugin-b", "ontology_pack"),
      ] as never,
      classification: {
        fallbackUsed: false,
        decisions: [
          { claimKey: "CLAIM-1", lane: "rule", confidence: 0.7, extra: 1 },
        ],
        shadowComparisons: [
          {
            stamp: stamp("plugin-c", "semantic_classifier"),
            decisions: [
              { claimKey: "CLAIM-2", lane: "none", confidence: 0.1, x: 2 },
            ],
          },
        ],
      } as never,
      ontologyCatalog: { replaced: true } as never,
      ontologyMatches: [{}, {}] as never,
      ontologyShadowMatches: [
        {
          packId: "pack",
          schemaId: "schema",
          predicateName: "owns",
          confidence: 0.4,
          hidden: true,
        },
      ] as never,
    }),
  },
  "only a shadow classification": {
    args: create(SESSIONS),
    advisor: (result) => ({
      ...result,
      classification: {
        fallbackUsed: true,
        decisions: [],
        shadowComparisons: [{ stamp: stamp("p", "c"), decisions: [] }],
      } as never,
    }),
  },
  "only ontology shadow matches": {
    args: create(SESSIONS),
    advisor: (result) => ({
      ...result,
      ontologyShadowMatches: [
        { packId: "p", schemaId: "s", predicateName: "n", confidence: 1 },
      ] as never,
    }),
  },
  "only stamps": {
    args: create(SESSIONS),
    advisor: (result) => ({
      ...result,
      stamps: [stamp("p", "c")] as never,
    }),
  },
  "advisor warnings": {
    args: create(SESSIONS),
    advisor: (result) => ({
      ...result,
      analysis: { ...result.analysis, warnings: ["advisor warning"] },
    }),
  },
  "proposition roles without suggestions": {
    args: create(
      `${SESSIONS} ${LOGS} ${AMBIGUOUS} ${CHECKOUT} ${RATIONALE} Admins must log out.`,
    ),
    advisor: withPropositions((_proposition, index) => ({
      role: ["descriptive", "example", "subjective", "normative"][index % 4],
      status: [
        "modeled",
        "ambiguous",
        "ontology_gap",
        "missing",
        "nonlogical",
        "other",
      ][index],
    })),
  },
  "proposition statuses without suggestions": {
    args: create(
      `${SESSIONS} ${LOGS} ${AMBIGUOUS} ${CHECKOUT} ${RATIONALE} Admins must log out.`,
    ),
    advisor: withPropositions((_proposition, index) => ({
      role: "normative",
      status: [
        "modeled",
        "ambiguous",
        "ontology_gap",
        "missing",
        "nonlogical",
        "other",
      ][index],
    })),
  },
  "suggestions on rationale": {
    args: create(`${SESSIONS} ${CHECKOUT} ${POSTS}`),
    advisor: withPropositions(
      (_proposition, index) => ({
        role: ["rationale", "example", "subjective"][index],
      }),
      false,
    ),
  },
  "a predicate and a rule without relationship plans": {
    args: create(`${POSTS} ${CHECKOUT}`),
    advisor: (result) => ({
      ...result,
      analysis: {
        ...result.analysis,
        receipt: {
          ...result.analysis.receipt,
          suggestions: result.analysis.receipt.suggestions.map(
            (suggestion) =>
              ({ ...suggestion, relationshipPlan: undefined }) as never,
          ),
        },
      },
    }),
  },
  "a requirement document outside the workspace": {
    args: update(SESSIONS, { requirementId: "REQ-outside" }),
    entities: {
      "REQ-outside": [
        { id: "REQ-outside", title: "Out", source: "/elsewhere/req.md" },
      ],
    },
  },
  "a step failure that is not an error": {
    args: create(SESSIONS),
    failValidation: "plain failure",
  },
  "a step that cannot be applied on a create without drafts": {
    args: create(SESSIONS),
    advisor: (result) => ({
      ...result,
      analysis: {
        ...result.analysis,
        receipt: {
          ...result.analysis.receipt,
          suggestions: result.analysis.receipt.suggestions.map(
            (suggestion) =>
              ({
                ...suggestion,
                applyPlan: [
                  ...suggestion.applyPlan,
                  { type: "fact", id: "FACT-bad", properties: { title: 1 } },
                ],
              }) as never,
          ),
        },
      },
    }),
  },
  "a status without proof snapshot": {
    args: create(SESSIONS),
    status: { branch: "main", snapshotId: "stamp:other" },
  },
};

/** Inputs compileIntent rejects, with the error each one raises. */
export const INVALID: Record<string, Scenario> = {
  "an empty intent": { args: create("   ") },
  "an intent that is not text": { args: create(7 as never) },
  "an unknown mode": { args: { intent: SESSIONS, mode: "merge" } as never },
  "a blank requirement id on update": {
    args: update(SESSIONS, { requirementId: "  " }),
  },
  "a create without context": {
    args: { intent: SESSIONS, mode: "create" } as never,
  },
  "an excerpt without context": {
    args: update(SESSIONS, { sourceExcerpt: "x" }),
  },
  "a reference without context": {
    args: update(SESSIONS, { sourceReference: "x" }),
  },
  "an empty location": {
    args: create(SESSIONS, { sourceLocations: [{ path: " " }] }),
  },
  "an absolute location": {
    args: create(SESSIONS, { sourceLocations: [{ path: "/etc/passwd" }] }),
  },
  "a location outside the workspace": {
    args: create(SESSIONS, { sourceLocations: [{ path: "src\\..\\x.md" }] }),
  },
  "a status without payload": { args: create(SESSIONS), status: null },
};

export type Captured = {
  searches: unknown[];
  loads: unknown[];
  reviewLoads: unknown[];
  advisorInputs: unknown[];
  goals: string[];
};

/** A workspace and context that answer as `scenario` says. */
export function scenarioContext(
  scenario: Scenario,
  captured: Captured,
): OperationContext {
  const root = tempWorkspace(scenario.files ?? {});
  const prolog: PrologPort = {
    query: async (goal: string): Promise<PrologQueryResult> => {
      // The goal stages every planned step; its digest pins it.
      captured.goals.push(
        createHash("sha256")
          .update(goal.split(root).join("<root>"))
          .digest("hex")
          .slice(0, 16),
      );
      if (scenario.whatIf === false) return { success: false, bindings: {} };
      return {
        success: true,
        bindings: { JsonString: scenario.whatIf ?? "[]" },
      };
    },
    queryStatusJson: async () => ({ success: false, bindings: {} }),
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
  } as PrologPort;
  return {
    workspaceRoot: root,
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-05T00:00:00Z"),
    prolog,
    ...(scenario.files === null ? {} : { fs: nodeFilesystem }),
    ...(scenario.ensurePlugins
      ? { ensurePlugins: async () => ({}) as never }
      : {}),
  } as OperationContext;
}

/** Answer discovery, the knowledge base and the advisor as `scenario` says. */
export function stubCollaborators(
  scenario: Scenario,
  captured: Captured,
): { mockRestore: () => void }[] {
  const analyze = orchestration.analyzeSemanticAdvisorInputWithPlugins;
  const failing =
    scenario.failValidation === undefined
      ? []
      : [
          spyOn(validation, "validateUpsertInput").mockImplementation(() => {
            throw scenario.failValidation;
          }),
        ];
  return [
    ...failing,
    spyOn(discoveryExecutors, "executeStatus").mockImplementation(
      (async () => ({
        structuredContent:
          scenario.status === null ? undefined : (scenario.status ?? STATUS),
      })) as never,
    ),
    spyOn(intentSearch, "executeIntentSearch").mockImplementation((async (
      options: unknown,
    ) => {
      captured.searches.push(options);
      return {
        matches: scenario.matches ?? [],
        analysis: {
          topTwoMargin: scenario.margin === undefined ? null : scenario.margin,
          abstained:
            scenario.abstained ?? (scenario.matches ?? []).length === 0,
        },
      };
    }) as never),
    spyOn(discoveryEntities, "loadEntities").mockImplementation((async (
      _prolog: unknown,
      query: { id: string; type: string },
    ) => {
      captured.loads.push(query);
      return scenario.entities?.[query.id] ?? [];
    }) as never),
    spyOn(conflictReview, "loadReviewRequirements").mockImplementation((async (
      _prolog: unknown,
      ids: readonly string[],
    ) => {
      captured.reviewLoads.push(ids);
      return new Map(
        ids.flatMap((id) => {
          const row = scenario.review?.[id];
          return row === undefined ? [] : [[id, row]];
        }),
      );
    }) as never),
    spyOn(
      orchestration,
      "analyzeSemanticAdvisorInputWithPlugins",
    ).mockImplementation((async (input: never, options: Row) => {
      captured.advisorInputs.push({
        input,
        options: { ...options, ensurePlugins: typeof options.ensurePlugins },
      });
      const result = await analyze(input, {
        operationName: options.operationName as string,
      });
      return scenario.advisor ? scenario.advisor(result) : result;
    }) as never),
  ];
}

/** Compile `scenario` and return, as plain JSON, the plan and what it read. */
export async function compileScenario(scenario: Scenario): Promise<unknown> {
  const captured: Captured = {
    searches: [],
    loads: [],
    reviewLoads: [],
    advisorInputs: [],
    goals: [],
  };
  const context = scenarioContext(scenario, captured);
  const spies = stubCollaborators(scenario, captured);
  try {
    let outcome: unknown;
    try {
      outcome = await planning.executeCompileIntent(scenario.args, context);
    } catch (error) {
      outcome = { error: (error as Error).message };
    }
    return JSON.parse(
      JSON.stringify({ outcome, ...captured })
        .split(context.workspaceRoot)
        .join("<root>"),
    );
  } finally {
    for (const spy of spies.reverse()) spy.mockRestore();
  }
}

const FACT_STEP = {
  type: "fact",
  id: "FACT-limit",
  properties: { title: "Limit", status: "active", source: undefined },
  relationships: [],
};
const LINK_STEP = {
  type: "req",
  id: "REQ-ground",
  properties: {},
  relationships: [
    { type: "constrained_by", from: "REQ-ground", to: "FACT-limit" },
  ],
};

export type GroundingScenario = Scenario &
  Readonly<{ input: planning.GroundingPlanInput }>;

const grounding = (
  extra: Partial<Scenario> = {},
  steps: readonly Row[] = [FACT_STEP, LINK_STEP],
): GroundingScenario => ({
  args: create(SESSIONS),
  input: {
    requirementId: "REQ-ground",
    claimKey: "CLAIM-limit",
    text: "Users keep ≤ 3 sessions",
    steps,
  },
  ...extra,
});

/** Grounding plans kb_model compiles, pinned beside the compile scenarios. */
export const GROUNDINGS: Record<string, GroundingScenario> = {
  "a grounding plan": grounding(),
  "a grounding plan without a filesystem": grounding({ files: null }),
  "a grounding plan without proof snapshot": grounding({
    status: { branch: "main", snapshotId: "stamp:other" },
  }),
  "a conflicting grounding plan": grounding({
    whatIf: analysis({ introduced: [witness({})] }),
  }),
  "a grounding plan with a step that cannot be applied": grounding({}, [
    FACT_STEP,
    { ...LINK_STEP, properties: { title: "No status" } },
  ]),
  "a grounding plan whose step fails without an error": grounding({
    failValidation: 42,
  }),
  "a grounding plan without status payload": grounding({ status: null }),
  "a grounding plan that names the requirement": grounding({}, [
    FACT_STEP,
    {
      ...LINK_STEP,
      properties: { title: "Ground", status: "open" },
      document: { body: "Step body." },
    },
  ]),
};

/** Compile the grounding of `scenario` as compileScenario does. */
export async function groundScenario(
  scenario: GroundingScenario,
): Promise<unknown> {
  const captured: Captured = {
    searches: [],
    loads: [],
    reviewLoads: [],
    advisorInputs: [],
    goals: [],
  };
  const context = scenarioContext(scenario, captured);
  const spies = stubCollaborators(scenario, captured);
  try {
    let outcome: unknown;
    try {
      outcome = await planning.compileGroundingPlan(
        context,
        context.prolog as PrologPort,
        scenario.input,
      );
    } catch (error) {
      outcome = { error: (error as Error).message };
    }
    return JSON.parse(
      JSON.stringify({ outcome, ...captured })
        .split(context.workspaceRoot)
        .join("<root>"),
    );
  } finally {
    for (const spy of spies.reverse()) spy.mockRestore();
  }
}
