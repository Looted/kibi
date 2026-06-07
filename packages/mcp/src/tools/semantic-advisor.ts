import { analyzeSemanticAdvisorInput } from "../semantic-advisor/analyze-prose.js";
import type { SemanticAdvisorReceipt } from "../semantic-advisor/types.js";

export interface SemanticAdvisorArgs {
  text: string;
  type?: string;
  id?: string;
  title?: string;
  source?: string;
  status?: string;
}

export interface SemanticAdvisorResult {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: {
    receipt: SemanticAdvisorReceipt;
    warnings: string[];
  };
}

function normalizeText(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    throw new Error("Semantic advisor failed: text must be a non-empty string");
  }
  return text;
}

function optionalString(value: unknown): string | undefined {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : undefined;
}

export async function handleKbSemanticAdvisor(
  args: SemanticAdvisorArgs,
): Promise<SemanticAdvisorResult> {
  const text = normalizeText(args.text);
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
        text: `kb_semantic_advisor: ${result.receipt.summary} Suggestions: ${result.receipt.suggestions.map((suggestion) => suggestion.kind).join(", ") || "none"}.`,
      },
    ],
    structuredContent: {
      receipt: result.receipt,
      warnings: result.warnings,
    },
  };
}
