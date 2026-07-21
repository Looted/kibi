import { executePlaceholder } from "../types.js";
import type { OperationSpec } from "../types.js";

export const semanticAdvisorSpec = {
  name: "kb_semantic_advisor",
  cliName: "semantic-advisor",
  description:
    "Analyze requirement prose without mutating the KB and return semantic advisor receipts with modeling suggestions. Use before constructing kb_upsert payloads when prose may contain machine-checkable logic. Suggestions can include strict-property facts, predicate facts, ambiguity observations, or ontology-gap observations; all suggestions are advisory and reviewable.",
  businessInputSchema: {
    type: "object",
    required: ["text"],
    properties: {
      text: {
        type: "string",
        description:
          "Requirement prose to inspect for machine-checkable modeling suggestions.",
      },
      type: {
        type: "string",
        enum: ["req"],
        default: "req",
        description:
          "Entity type context for analysis. Currently requirement prose is supported.",
      },
      id: {
        type: "string",
        description:
          "Optional requirement ID used for deterministic draft relationship guidance.",
      },
      title: { type: "string", description: "Optional requirement title for draft apply plans." },
      source: { type: "string", description: "Optional provenance for draft suggestions." },
      status: { type: "string", description: "Optional requirement status for draft suggestions." },
    },
  },
  requiresProlog: false,
  effects: ["local-read"],
  execute: executePlaceholder,
} as const satisfies OperationSpec;
