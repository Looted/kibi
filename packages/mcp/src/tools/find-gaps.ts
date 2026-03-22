import type { PrologProcess } from "kibi-cli/prolog";
import { runJsonModuleQuery, toPrologAtom, toPrologList } from "./core-module.js";
import { validateEntityType } from "./entity-query.js";

export interface FindGapsArgs {
  type?: string;
  missingRelationships?: string[];
  presentRelationships?: string[];
  tags?: string[];
  sourceFile?: string;
  limit?: number;
  offset?: number;
}

export interface FindGapsResult {
  content: Array<{ type: string; text: string }>;
  structuredContent?: {
    rows: Array<Record<string, unknown>>;
    count: number;
    meta?: Record<string, unknown>;
  };
}

// implements REQ-002, REQ-013
export async function handleKbFindGaps(
  prolog: PrologProcess,
  args: FindGapsArgs,
): Promise<FindGapsResult> {
  validateEntityType(args.type);
  const limit = args.limit ?? 100;
  const offset = args.offset ?? 0;

  try {
    const payload = await runJsonModuleQuery<FindGapsResult["structuredContent"]>(
      prolog,
      "discovery.pl",
      `discovery:find_gaps_json(${toPrologAtom(args.type)}, ${toPrologList(args.missingRelationships)}, ${toPrologList(args.presentRelationships)}, ${toPrologList(args.tags)}, ${toPrologAtom(args.sourceFile)}, ${limit}, ${offset}, JsonString)`,
      "Find-gaps execution",
    );

    const rows = payload?.rows ?? [];
    return {
      content: [
        {
          type: "text",
          text:
            rows.length === 0
              ? "No matching gaps found."
              : `Found ${payload?.count ?? rows.length} gap rows. Showing ${rows.length}: ${rows
                  .map((row) => row.id)
                  .join(", ")}`,
        },
      ],
      structuredContent: payload,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Find-gaps execution failed: ${message}`);
  }
}
