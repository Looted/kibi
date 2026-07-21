import { executePlaceholder } from "../types.js";
import type { OperationSpec } from "../types.js";

export const autopilotGenerateSpec = {
  name: "kb_autopilot_generate",
  cliName: "autopilot-generate",
  description:
    "Generate agent-centric bootstrap output for KB population. Read-only analysis that returns activation state, bootstrap guidance, candidate entities with evidence, payoff summary, and exact applyPlan payloads for later kb_upsert calls. No mutation side effects.",
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
            description: "Optional short summary of the project or bootstrap goal.",
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
        },
      },
    },
  },
  requiresProlog: true,
  effects: ["kb-read", "workspace-read"],
  execute: executePlaceholder,
} as const satisfies OperationSpec;
