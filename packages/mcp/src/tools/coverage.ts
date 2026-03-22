import type { PrologProcess } from "kibi-cli/prolog";
import { runJsonModuleQuery, toPrologList } from "./core-module.js";

export interface CoverageArgs {
  by?: "req" | "symbol" | "type";
  tags?: string[];
  includePassing?: boolean;
  includeTransitive?: boolean;
  limit?: number;
  offset?: number;
}

export interface CoverageResult {
  content: Array<{ type: string; text: string }>;
  structuredContent?: {
    summary: Record<string, number>;
    rows: Array<Record<string, unknown>>;
    meta?: Record<string, unknown>;
  };
}

// implements REQ-002, REQ-013
export async function handleKbCoverage(
  prolog: PrologProcess,
  args: CoverageArgs,
): Promise<CoverageResult> {
  const by = args.by ?? "req";
  const limit = args.limit ?? 100;
  const offset = args.offset ?? 0;
  const includePassing = args.includePassing ?? false;
  const includeTransitive = args.includeTransitive ?? true;

  try {
    const payload = await runJsonModuleQuery<CoverageResult["structuredContent"]>(
      prolog,
      "discovery.pl",
      `discovery:coverage_report_json('${by}', ${toPrologList(args.tags)}, ${includePassing}, ${includeTransitive}, ${limit}, ${offset}, JsonString)`,
      "Coverage execution",
    );

    const summary = payload?.summary ?? {};
    const fullyCovered = Number(summary.fullyCovered ?? 0);
    const total = Number(summary.total ?? 0);

    return {
      content: [
        {
          type: "text",
          text: `Coverage summary: ${fullyCovered} fully covered out of ${total}.`,
        },
      ],
      structuredContent: payload,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Coverage execution failed: ${message}`);
  }
}
