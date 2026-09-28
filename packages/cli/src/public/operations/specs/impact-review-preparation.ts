import { executePrepareImpactReview } from "../impact-review-preparation.js";
import type { OperationSpec } from "../types.js";

export const prepareImpactReviewSpec = {
  name: "kb_prepare_impact_review",
  cliName: "prepare-impact-review",
  description:
    "Prepare complete content-bound impact-review authoring inputs from the current staged snapshot or explicitly selected immutable Git commits. Returns strict reviewer schemas and an unauthored template; it does not decide, approve, sign, stage, or prove the review.",
  businessInputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["scope"],
    properties: {
      scope: {
        oneOf: [
          {
            type: "object",
            additionalProperties: false,
            required: ["kind"],
            properties: { kind: { const: "staged" } },
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["kind", "baseCommit", "headCommit"],
            properties: {
              kind: { const: "diff" },
              baseCommit: {
                type: "string",
                pattern: "^(?:[a-f0-9]{40}|[a-f0-9]{64})$",
              },
              headCommit: {
                type: "string",
                pattern: "^(?:[a-f0-9]{40}|[a-f0-9]{64})$",
              },
            },
          },
        ],
      },
    },
  },
  requiresProlog: false,
  effects: ["workspace-read", "kb-read"],
  agentVisibleStructuredData: true,
  execute: executePrepareImpactReview,
} as const satisfies OperationSpec;
