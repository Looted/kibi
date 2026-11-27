import { executeAuthorImpactReview } from "../impact-review-authoring.js";
import type { OperationSpec } from "../types.js";

export const AUTHOR_IMPACT_REVIEW_DESCRIPTION =
  "Write .kibi/impact-review.json for the staged snapshot from your per-file decisions. Kibi captures the evidence itself, keeps an earlier decision only while its file and requirements are unchanged, validates the whole record and writes it atomically. Pass scopeFingerprint from kb_prepare_impact_review. It does not stage the record, decide for you or prove anything; the record schema is the kibi-commit-review skill's impact-review.schema.json resource.";

const analysisReview = {
  type: "object",
  required: ["kind", "side"],
  properties: {
    kind: { enum: ["unsupported_review", "partial_review"] },
    side: { enum: ["before", "after"] },
  },
} as const;

export const authorImpactReviewSpec = {
  name: "kb_author_impact_review",
  cliName: "author-impact-review",
  description: AUTHOR_IMPACT_REVIEW_DESCRIPTION,
  businessInputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["scope", "scopeFingerprint", "reviewer", "files"],
    properties: {
      scope: {
        type: "object",
        additionalProperties: false,
        required: ["kind"],
        properties: { kind: { const: "staged" } },
      },
      scopeFingerprint: {
        type: "string",
        description:
          "recordHeaders.scope.fingerprint from kb_prepare_impact_review.",
        minLength: 1,
      },
      reviewer: {
        type: "object",
        additionalProperties: false,
        required: ["id"],
        properties: { id: { type: "string", minLength: 1 } },
      },
      reviewedAt: { type: "string", format: "date-time" },
      files: {
        type: "array",
        description:
          "Decisions for files you decide now; files the earlier record already decided may be left out while they are unchanged.",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["path", "decision"],
          properties: {
            path: { type: "string", minLength: 1 },
            decision: {
              type: "object",
              required: ["kind"],
              properties: {
                kind: { enum: ["impact", "no_impact", "not_applicable"] },
              },
            },
            analysisReviews: { type: "array", items: analysisReview },
          },
        },
      },
    },
  },
  requiresProlog: false,
  effects: ["workspace-read", "kb-read", "workspace-write"],
  execute: executeAuthorImpactReview,
} as const satisfies OperationSpec;
