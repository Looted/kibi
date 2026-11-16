import { executeReviewFirmEdit } from "../firm-edit-review.js";
import type { OperationSpec } from "../types.js";

export const REVIEW_FIRM_EDIT_DESCRIPTION =
  "Record your verdict on a change to code that implements a current firm requirement: keeps (the code still does what it says) or changes. kibi check --staged blocks such a change until each edited symbol has a current keeps receipt. A receipt is your judgment, not the person's approval. Side effects: writes .kb/firm-edit-reviews/ files; dryRun:true writes nothing.";

export const reviewFirmEditSpec = {
  name: "kb_review_firm_edit",
  cliName: "review-firm-edit",
  description: REVIEW_FIRM_EDIT_DESCRIPTION,
  businessInputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["reviews"],
    properties: {
      reviews: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "requirementId",
            "sourceFile",
            "symbol",
            "verdict",
            "note",
          ],
          properties: {
            requirementId: { type: "string", pattern: "^REQ-[A-Za-z0-9._-]+$" },
            sourceFile: {
              type: "string",
              minLength: 1,
            },
            symbol: {
              type: "string",
              minLength: 1,
            },
            verdict: { enum: ["keeps", "changes"] },
            note: {
              type: "string",
              minLength: 1,
            },
            requestQuote: {
              type: "string",
            },
          },
        },
      },
      dryRun: {
        type: "boolean",
      },
    },
  },
  requiresProlog: false,
  effects: ["workspace-read", "workspace-write"],
  execute: executeReviewFirmEdit,
} as const satisfies OperationSpec;
