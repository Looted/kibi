import { executeFindGaps } from "kibi-runtime";
import type { PrologProcess } from "kibi-runtime";

type ReportingProlog = Pick<PrologProcess, "query">;

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
  readonly content: readonly {
    readonly type: string;
    readonly text?: string;
  }[];
  structuredContent?: {
    readonly rows: readonly Readonly<Record<string, unknown>>[];
    readonly count: number;
    readonly meta?: Readonly<Record<string, unknown>>;
  };
}

// implements REQ-002, REQ-013
export async function handleKbFindGaps(
  prolog: ReportingProlog,
  args: FindGapsArgs,
): Promise<FindGapsResult> {
  return executeFindGaps(
    { ...args },
    {
      workspaceRoot: process.cwd(),
      signal: new AbortController().signal,
      clock: () => new Date(),
      prolog: {
        query: (goal) => prolog.query(goal),
        nextSolution: async () => null,
        save: () => prolog.query("kb_save"),
      },
    },
  );
}
