import {
  type ApplyPlanArgs,
  type ApplyPlanResult,
  executeApplyPlan,
} from "../../../operations/planning/apply-plan.js";
import {
  type CompileIntentArgs,
  type CompilePlanV1,
  executeCompileIntent,
} from "../../../operations/planning/compile-intent.js";
import type { OperationSpec } from "../types.js";

export type {
  CompileIntentArgs,
  CompilePlanV1,
  ContradictionWitness,
  ProposalDecision,
  ScenarioDraft,
  TestDraft,
  TraceabilityProposal,
} from "../../../operations/planning/compile-intent.js";
export type {
  ApplyPlanArgs,
  ApplyPlanResult,
} from "../../../operations/planning/apply-plan.js";
export { executeApplyPlan } from "../../../operations/planning/apply-plan.js";
export { executeCompileIntent } from "../../../operations/planning/compile-intent.js";

// implements REQ-kibi-change-to-proof-plan-compiler
export const compileIntentSpec = {
  name: "kb_compile_intent",
  cliName: "compile-intent",
  description:
    "Compile complete change intent into a deterministic, snapshot-bound read-only plan. Reuses intent-aware discovery and semantic modeling, accounts for every proposition, reports contradiction witnesses, proposes traceability links, and emits dependency-ordered kb_upsert-style steps only for resolved typed claims. No mutation side effects.",
  businessInputSchema: {
    type: "object",
    required: ["intent", "mode"],
    properties: {
      intent: {
        type: "string",
        minLength: 1,
        maxLength: 10000,
        description:
          "Complete post-change normative intent. Send the desired behavior, not a patch fragment.",
      },
      mode: {
        type: "string",
        enum: ["create", "update"],
        description:
          "Create a new requirement or update an existing one. Update auto-selection is allowed only with a high-confidence, well-separated candidate.",
      },
      requirementId: {
        type: "string",
        description:
          "Optional exact requirement ID. Required for an update when automatic selection is below the confidence and margin gates.",
      },
      title: {
        type: "string",
        description:
          "Optional requirement title; existing title is preserved for updates when omitted.",
      },
      clauses: {
        type: "array",
        items: { type: "string", minLength: 1 },
        maxItems: 64,
        description:
          "Optional complete atomic clause decomposition. Each assertive clause receives independent proposition accounting.",
      },
      semanticFacets: {
        type: "object",
        additionalProperties: false,
        properties: {
          actors: { type: "array", items: { type: "string" }, maxItems: 20 },
          actions: { type: "array", items: { type: "string" }, maxItems: 20 },
          objects: { type: "array", items: { type: "string" }, maxItems: 20 },
          constraints: {
            type: "array",
            items: { type: "string" },
            maxItems: 20,
          },
          aliases: { type: "array", items: { type: "string" }, maxItems: 20 },
        },
        description:
          "Host-agent facets forwarded to deterministic intent-v1 discovery.",
      },
      sourceLocations: {
        type: "array",
        maxItems: 20,
        items: {
          type: "object",
          required: ["path"],
          additionalProperties: false,
          properties: {
            path: { type: "string", minLength: 1 },
            line: { type: "integer", minimum: 1 },
            column: { type: "integer", minimum: 1 },
            symbol: { type: "string", minLength: 1 },
          },
        },
        description:
          "Workspace-relative source coordinates used for discovery and before-hash binding.",
      },
      interpretations: {
        type: "array",
        maxItems: 3,
        items: {
          type: "object",
          required: ["claim_key", "claim_text", "ir"],
          properties: {
            claim_key: { type: "string" },
            claim_text: { type: "string" },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            span: { type: "object" },
            ir: { type: "object" },
          },
        },
        description:
          "Optional host-supplied typed kibi.logic.v1 interpretations; Kibi validates them before including rule steps.",
      },
      scenarioDrafts: {
        type: "array",
        maxItems: 20,
        items: {
          type: "object",
          required: ["title", "body"],
          properties: {
            id: { type: "string" },
            title: { type: "string", minLength: 1 },
            body: { type: "string", minLength: 1 },
          },
        },
        description:
          "Optional scenario drafts. Each is linked requirement -> scenario with specified_by.",
      },
      testDrafts: {
        type: "array",
        maxItems: 20,
        items: {
          type: "object",
          required: ["title", "body"],
          properties: {
            id: { type: "string" },
            title: { type: "string", minLength: 1 },
            body: { type: "string", minLength: 1 },
            verificationScope: {
              type: "string",
              enum: ["unit", "integration", "end_to_end"],
            },
            verificationPerspective: {
              type: "string",
              enum: ["internal", "consumer"],
            },
          },
        },
        description:
          "Optional test drafts. Tests are attached to scenarios with verified_by; direct req -> test proof links are not emitted.",
      },
      proposalDecisions: {
        type: "array",
        maxItems: 20,
        items: {
          type: "object",
          required: ["proposalId", "decision"],
          properties: {
            proposalId: { type: "string", minLength: 1 },
            decision: { type: "string", enum: ["accept", "reject"] },
          },
        },
        description:
          "Explicit decisions for deterministic traceability proposals. Pending proposals never enter steps.",
      },
    },
  },
  requiresProlog: true,
  effects: ["kb-read", "workspace-read"],
  execute: executeCompileIntent,
} as const satisfies OperationSpec<CompileIntentArgs, CompilePlanV1>;

// implements REQ-kibi-change-to-proof-plan-compiler
export const applyPlanSpec = {
  name: "kb_apply_plan",
  cliName: "apply-plan",
  description:
    "Apply an approved kibi.compile-plan.v1 after revalidating its canonical hash, branch/KB/workspace snapshots, source before-hashes, entity shapes, and relationship endpoints. Applies entity steps sequentially through the shared upsert boundary and reports final snapshots. Source publishing and crash recovery are not silently implied by this v1 boundary.",
  businessInputSchema: {
    type: "object",
    required: ["plan", "approvedPlanHash"],
    properties: {
      approvedPlanHash: {
        type: "string",
        pattern: "^[a-fA-F0-9]{64}$",
        description:
          "Exact SHA-256 planHash returned by kb_compile_intent after human/agent review.",
      },
      plan: {
        type: "object",
        required: [
          "version",
          "planHash",
          "status",
          "expected",
          "target",
          "steps",
          "sourceWrites",
        ],
        description:
          "The complete kibi.compile-plan.v1 object. Partial plans are rejected.",
      },
    },
  },
  requiresProlog: true,
  effects: ["kb-read", "kb-write", "workspace-read"],
  execute: executeApplyPlan,
} as const satisfies OperationSpec<ApplyPlanArgs, ApplyPlanResult>;
