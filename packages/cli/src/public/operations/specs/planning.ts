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
export type { MigrationPlan } from "../migration-plan.js";
export { executeApplyPlan } from "../../../operations/planning/apply-plan.js";
export { executeCompileIntent } from "../../../operations/planning/compile-intent.js";

// implements REQ-kibi-change-to-proof-plan-compiler-v2
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
      context: {
        type: "string",
        maxLength: 10000,
        description:
          "Why the requirement exists, who asked and anything that does not fit its checked meaning. Required when mode is create (validation error naming this field otherwise); rendered as a '## Context' section of the requirement document, never as part of the checked meaning. Never invent a reason: write 'Reason not stated' when the requester gave none. An update keeps the existing document body unless context is supplied.",
      },
      sourceExcerpt: {
        type: "string",
        maxLength: 10000,
        description:
          "Optional verbatim text the intent came from (a ticket, a message, a document passage). Rendered as a blockquote in the requirement's '## Source' section; requires context.",
      },
      sourceReference: {
        type: "string",
        maxLength: 2000,
        description:
          "Optional locator of the source text (ticket id, URL, path). Rendered in the requirement's '## Source' section; requires context.",
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
            scenarioIds: {
              type: "array",
              items: { type: "string", minLength: 1 },
              maxItems: 20,
              description:
                "Stable scenario draft IDs verified by this test. Required when multiple scenario drafts are supplied.",
            },
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

// implements REQ-kibi-change-to-proof-plan-compiler-v2
export const applyPlanSpec = {
  name: "kb_apply_plan",
  cliName: "apply-plan",
  description:
    "Apply an explicitly approved kibi.bootstrap-plan.v1, kibi.compile-plan.v1, kibi.migration-plan.v2, or entity-deletion plan after revalidating its canonical hash and live snapshots. Compile plans apply all-or-nothing: a durable journal records every source write and store mutation before the first write, all steps commit in one store transaction, and an interrupted application is completed or rolled back by the next mutating call. Bootstrap actions are dependency-ordered, sequential, source-first, and recoverable from a typed journal.",
  businessInputSchema: {
    type: "object",
    oneOf: [
      {
        required: ["plan", "approvedPlanHash"],
        not: { required: ["recoveryJournalId"] },
      },
      {
        required: ["recoveryJournalId"],
        not: {
          anyOf: [{ required: ["plan"] }, { required: ["approvedPlanHash"] }],
        },
      },
    ],
    properties: {
      approvedPlanHash: {
        type: "string",
        pattern: "^[a-fA-F0-9]{64}$",
        description:
          "Exact SHA-256 planHash returned by kb_plan_bootstrap, kb_compile_intent, or another approved plan after human review.",
      },
      plan: {
        type: "object",
        required: ["version", "planHash"],
        description:
          "The complete kibi.bootstrap-plan.v1, kibi.compile-plan.v1, kibi.migration-plan.v2, or hash-bound kibi.entity-deletion-plan.v1 object. Migration plans require approvedActionIds and reject blocked/non-automatic actions.",
      },
      approvedActionIds: {
        type: "array",
        items: { type: "string", minLength: 1 },
        description:
          "Required for migration-plan.v2. Exact automatic action IDs explicitly approved for this application.",
      },
      recoveryJournalId: {
        type: "string",
        pattern: "^[A-Za-z0-9._-]+$",
        description:
          "Typed recovery journal identifier returned by a committed_with_repairs result or a PLAN_APPLY_RECOVERY_REQUIRED error. Recovery replays only the immutable journal and never the original plan request; a compile-plan journal (plan-apply-*) is completed or rolled back deterministically and reports which. A bootstrap journal left `applying` by a process that died mid-action is resumed without edits: the interrupted action is re-applied and a source lock held by the dead process is reclaimed and recorded in the journal.",
      },
      async: {
        type: "boolean",
        default: false,
        description:
          "MCP only. When true, start the apply as a background job and return a kibi.job.v1 receipt immediately instead of holding the request open; poll kb_job_status with the returned jobId for the final result. Use for large bootstrap plans (hundreds of actions) that can outlast a client's request timeout. The MCP server registers kb_job_status only when KIBI_MCP_OPTIONAL_TOOLS includes it; otherwise async applies synchronously. A synchronous apply sends notifications/progress after each bootstrap action when the request carries a progressToken. The CLI ignores this field.",
      },
    },
  },
  // Applying an entity-deletion plan must also retract the compiled entity;
  // acquire the branch engine up front so the source commit and compiled
  // retraction run under one capability-scoped operation context. Recovery
  // journals remain usable even when the engine is unavailable.
  requiresProlog: true,
  effects: ["kb-read", "kb-write", "workspace-read", "workspace-write"],
  execute: executeApplyPlan,
} as const satisfies OperationSpec<ApplyPlanArgs, ApplyPlanResult>;
