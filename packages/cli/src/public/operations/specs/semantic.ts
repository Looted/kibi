import { InputError } from "../../../cli-errors.js";
import { analyzeSemanticAdvisorInput } from "../../../operations/semantic-advisor/analyze-prose.js";
import type {
  SemanticAdvisorArgs,
  SemanticAdvisorOperationResult,
} from "../../../operations/semantic-advisor/types.js";
import type { OperationContext } from "../runtime-types.js";
import type { OperationSpec } from "../types.js";

function requiredText(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    throw new InputError(
      "VALIDATION_FAILED",
      "Semantic advisor failed: text must be a non-empty string",
    );
  }
  return text;
}

function optionalString(value: unknown): string | undefined {
  const text = typeof value === "string" ? value.trim() : "";
  return text || undefined;
}

export async function executeSemanticAdvisor(
  args: SemanticAdvisorArgs,
  _context?: OperationContext,
): Promise<SemanticAdvisorOperationResult> {
  const text = requiredText(args.text);
  const id = optionalString(args.id) ?? "REQ-SEMANTIC-ADVISOR-PREVIEW";
  const title = optionalString(args.title) ?? text.split(/[.!?]/, 1)[0] ?? text;
  const source = optionalString(args.source) ?? "mcp://kibi/semantic-advisor";
  const result = analyzeSemanticAdvisorInput({
    payload: {
      type: optionalString(args.type) ?? "req",
      id,
      properties: {
        title,
        status: optionalString(args.status) ?? "open",
        source,
        text_ref: text,
      },
    },
  });
  return {
    content: [
      {
        type: "text",
        text: `kb_semantic_advisor: ${result.receipt.summary} Suggestions: ${result.receipt.suggestions.map(({ kind }) => kind).join(", ") || "none"}.`,
      },
    ],
    structuredContent: { receipt: result.receipt, warnings: result.warnings },
  };
}

async function executeSemanticAdvisorInput(
  input: Readonly<Record<string, unknown>>,
  context: OperationContext,
): Promise<SemanticAdvisorOperationResult> {
  const type = optionalString(input.type);
  const id = optionalString(input.id);
  const title = optionalString(input.title);
  const source = optionalString(input.source);
  const status = optionalString(input.status);
  return executeSemanticAdvisor(
    {
      text: requiredText(input.text),
      ...(type ? { type } : {}),
      ...(id ? { id } : {}),
      ...(title ? { title } : {}),
      ...(source ? { source } : {}),
      ...(status ? { status } : {}),
    },
    context,
  );
}

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
      title: {
        type: "string",
        description: "Optional requirement title for draft apply plans.",
      },
      source: {
        type: "string",
        description: "Optional provenance for draft suggestions.",
      },
      status: {
        type: "string",
        description: "Optional requirement status for draft suggestions.",
      },
    },
  },
  requiresProlog: false,
  effects: ["local-read"],
  execute: executeSemanticAdvisorInput,
} as const satisfies OperationSpec;
