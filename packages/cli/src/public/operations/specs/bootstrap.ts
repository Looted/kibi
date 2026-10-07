import { executePlanBootstrap } from "../../../operations/bootstrap/generate.js";
import {
  INTENT_CLAIM_KINDS,
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
        description:
          "Whether to include generic markdown file content as candidate facts. Default: true, or false when bootstrapContext declares intentClaims (the declared sources already carry the intent); set it explicitly to override.",
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
          "Budget for candidates Kibi discovers itself (symbols, tests, repository documents). Declared intentClaims sit outside it: they are never capped and never use its slots. Clamped to [1, 200]. Default: 50.",
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
                component: {
                  type: "string",
                  minLength: 1,
                  description:
                    "Optional component this source's claims are about (for example recorder). It becomes the first segment of each generated subject_key (component.aspect); a claim's own component overrides it.",
                },
              },
            },
          },
          intentClaims: {
            type: "array",
            maxItems: 200,
            description:
              "Statements the agent harvested from knowledgeSources, each citing its source. Intent claims (the default kind) that the strict modeler can ground become cited req candidates; the rest become explicit authoring follow-ups. Observation and open_question claims never become requirements: they become cited fact candidates with fact_kind observation, open questions tagged review:open-question. Every intent and observation claim needs an excerpt: the created entity's body keeps the statement, then a '## Source' section with the blockquoted excerpt, the source title and the reference. Bound into the plan hash.",
            items: {
              type: "object",
              required: ["statement", "sourceId", "reference"],
              additionalProperties: false,
              if: {
                properties: { kind: { const: "open_question" } },
                required: ["kind"],
              },
              else: { required: ["excerpt"] },
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
                  minLength: 1,
                  description:
                    "Verbatim passage from the source the claim came from. Required for intent and observation claims (optional for open_question): Kibi persists it with the knowledge source title and reference in the created entity's '## Source' section, because the ticket or page may be gone by the next migration.",
                },
                component: {
                  type: "string",
                  minLength: 1,
                  description:
                    "Optional component the claim is about (for example recorder). Generated subject keys take the shape component.aspect with the aspect from the claim's subject. Without a component on the claim or its knowledge source, a claim whose subject is not a single word or already dotted becomes an authoring follow-up with a diagnostic instead of a malformed subject key.",
                },
                rationale: {
                  type: "string",
                  minLength: 1,
                  description:
                    "Optional reason the requirement exists, as the source states it or the human answered when asked. It becomes the requirement's rationale and its body's '## Context' section. Never invent one.",
                },
                kind: {
                  type: "string",
                  enum: [...INTENT_CLAIM_KINDS],
                  default: "intent",
                  description:
                    "intent: intended behavior (may become a req). observation: how things are today, without stating intent. open_question: something the sources leave undecided. Default: intent.",
                },
              },
            },
          },
          conflicts: {
            type: "array",
            maxItems: 50,
            description:
              "Contradictions the agent found between declared intentClaims and leaves for the human to resolve. Each becomes a cited fact candidate with fact_kind observation tagged review:conflict. Every claimReference must match a declared claim's sourceId and reference. Bound into the plan hash.",
            items: {
              type: "object",
              required: ["claimReferences", "note"],
              additionalProperties: false,
              properties: {
                claimReferences: {
                  type: "array",
                  minItems: 2,
                  maxItems: 10,
                  items: {
                    type: "object",
                    required: ["sourceId", "reference"],
                    additionalProperties: false,
                    properties: {
                      sourceId: { type: "string", minLength: 1 },
                      reference: { type: "string", minLength: 1 },
                    },
                  },
                },
                note: {
                  type: "string",
                  minLength: 1,
                  description:
                    "What disagrees, in one sentence, without resolving it.",
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
