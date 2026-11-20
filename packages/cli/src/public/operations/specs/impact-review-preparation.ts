import { ADVERTISED_DESCRIPTION } from "../advertised-schema.js";
import { executePrepareImpactReview } from "../impact-review-preparation.js";
import type { OperationSpec } from "../types.js";

export const PREPARE_IMPACT_REVIEW_DESCRIPTION =
  "Prepare an impact review of the current staged snapshot or explicitly selected immutable Git commits. Use it when kb_check reports that changed files need an impact review; it does not plan KB changes. Returns the record headers, a row per changed file with its requirement ids and pending obligations, each scoped requirement once with its fingerprints, and full evidence only for the paths you name; rows page with offset. It does not decide, approve, sign, stage, or prove the review; write the record with kb_author_impact_review.";

export const prepareImpactReviewSpec = {
  name: "kb_prepare_impact_review",
  cliName: "prepare-impact-review",
  description: PREPARE_IMPACT_REVIEW_DESCRIPTION,
  businessInputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["scope"],
    properties: {
      scope: {
        description:
          'What to review: {"kind":"staged"} for the staged snapshot, or {"kind":"diff","baseCommit":"<sha>","headCommit":"<sha>"} with full commit hashes.',
        [ADVERTISED_DESCRIPTION]:
          '{"kind":"staged"} for the staged snapshot, or {"kind":"diff","baseCommit","headCommit"} with full hashes.',
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
      paths: {
        type: "array",
        description:
          "Changed paths to return full evidence and requirement context for; the rows still list the whole scope.",
        items: { type: "string", minLength: 1 },
      },
      offset: {
        type: "integer",
        minimum: 0,
        description: "First file row to return, from truncation.nextOffset.",
      },
    },
  },
  requiresProlog: false,
  effects: ["workspace-read", "kb-read"],
  agentVisibleStructuredData: true,
  execute: executePrepareImpactReview,
} as const satisfies OperationSpec;
