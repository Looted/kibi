import { executePlanBootstrap } from "../../../operations/bootstrap/generate.js";
import {
  KNOWLEDGE_SOURCE_AUTHORITIES,
  KNOWLEDGE_SOURCE_KINDS,
  type PlanBootstrapArgs,
  type PlanBootstrapResult,
} from "../../../operations/bootstrap/types.js";
import type { OperationSpec } from "../types.js";

export type {
  BootstrapContext,
  PlanBootstrapArgs,
  PlanBootstrapResult,
} from "../../../operations/bootstrap/types.js";
export { executePlanBootstrap } from "../../../operations/bootstrap/generate.js";

// implements REQ-KIBI-BOOTSTRAP-PLAN
export const planBootstrapSpec = {
  name: "kb_plan_bootstrap",
  cliName: "plan-bootstrap",
  description:
    "Generate a deterministic, snapshot-bound kibi.bootstrap-plan.v1 for repository onboarding. Read-only analysis of the repository plus any declared knowledge sources and cited intent claims returns evidence, bounded context questions, exact dependency-ordered actions, a canonical plan hash, and no mutation side effects.",
  businessInputSchema: {
    type: "object",
    properties: {
      includeGenericMarkdown: {
        type: "boolean",
        default: true,
        description:
          "Whether to include generic markdown file content as candidate facts. Default: true.",
      },
      minConfidence: {
        type: "number",
        default: 0.8,
        minimum: 0.6,
        maximum: 0.95,
        description:
          "Minimum confidence threshold for candidates. Clamped to [0.60, 0.95]. Default: 0.80.",
      },
      maxCandidates: {
        type: "integer",
        default: 50,
        minimum: 1,
        maximum: 200,
        description:
          "Maximum number of candidates to return. Clamped to [1, 200]. Default: 50.",
      },
      entityTypes: {
        type: "array",
        items: {
          type: "string",
          enum: ["req", "scenario", "test", "adr", "fact", "symbol"],
        },
        description:
          "Optional filter to limit candidate generation to specific entity types.",
      },
      bootstrapContext: {
        type: "object",
        description:
          "Optional declared bootstrap context supplied by the agent to ground the read-only synthesis output.",
        properties: {
          projectSummary: {
            type: "string",
            description:
              "Optional short summary of the project or bootstrap goal.",
          },
          sourceOfTruthPaths: {
            type: "array",
            items: { type: "string" },
            description:
              "Optional repo-relative paths that should be treated as declared sources of truth.",
          },
          sourceOfTruthNotes: {
            type: "array",
            items: { type: "string" },
            description:
              "Optional notes about how to interpret the declared sources of truth.",
          },
          priorityRoots: {
            type: "array",
            items: { type: "string" },
            description:
              "Optional repo roots the bootstrap flow should prioritize when authoring entities.",
          },
          verificationAnchors: {
            type: "array",
            items: { type: "string" },
            description:
              "Optional verification commands, documents, or checkpoints to reference in the output.",
          },
          knowledgeSources: {
            type: "array",
            maxItems: 50,
            description:
              "Knowledge sources outside the code that the human confirmed during the bootstrap interview (issue trackers, wikis, specs, decision logs). Kibi never contacts them; the agent reads them through its own connectors and cites them from intentClaims. Bound into the plan hash.",
            items: {
              type: "object",
              required: ["id", "kind", "title", "locator", "authority"],
              additionalProperties: false,
              properties: {
                id: {
                  type: "string",
                  pattern: "^[a-z0-9][a-z0-9-]*$",
                  description:
                    "Stable kebab-case handle that intentClaims cite, for example jira-payments.",
                },
                kind: { type: "string", enum: [...KNOWLEDGE_SOURCE_KINDS] },
                title: { type: "string", minLength: 1 },
                locator: {
                  type: "string",
                  minLength: 1,
                  description:
                    "Where the source lives: a URL, project key, space name, or repo-relative path.",
                },
                authority: {
                  type: "string",
                  enum: [...KNOWLEDGE_SOURCE_AUTHORITIES],
                  description:
                    "The human's call: authoritative claims become higher-confidence candidates, supporting claims lower ones, and stale sources are cited but never produce candidates.",
                },
                connector: {
                  type: "string",
                  description:
                    "Optional name of the MCP server or tool the agent used to read the source.",
                },
                notes: { type: "string" },
              },
            },
          },
          intentClaims: {
            type: "array",
            maxItems: 200,
            description:
              "Statements of product intent the agent harvested from knowledgeSources, each citing its source. Normative claims the strict modeler can ground become cited req candidates; the rest become explicit authoring follow-ups. Bound into the plan hash.",
            items: {
              type: "object",
              required: ["statement", "sourceId", "reference"],
              additionalProperties: false,
              properties: {
                statement: {
                  type: "string",
                  minLength: 1,
                  description:
                    "One normative statement in the source's meaning, for example 'Refunds must not exceed the original charge.'",
                },
                sourceId: {
                  type: "string",
                  description: "The id of a declared knowledge source.",
                },
                reference: {
                  type: "string",
                  minLength: 1,
                  description:
                    "Exact citation inside the source: a ticket key, page URL, or section anchor.",
                },
                excerpt: {
                  type: "string",
                  description: "Optional short quote supporting the claim.",
                },
              },
            },
          },
        },
      },
    },
  },
  requiresProlog: false,
  effects: ["workspace-read"],
  execute: executePlanBootstrap,
} as const satisfies OperationSpec<
  PlanBootstrapArgs,
  PlanBootstrapResult["structuredContent"]
>;
