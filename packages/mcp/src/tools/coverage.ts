import { executeCoverage } from "kibi-cli/operations";
import type { PrologProcess } from "kibi-cli/prolog";

type ReportingProlog = Pick<PrologProcess, "query">;

export interface CoverageArgs {
  by?: "req" | "symbol" | "type";
  tags?: string[];
  includePassing?: boolean;
  includeTransitive?: boolean;
  limit?: number;
  offset?: number;
}

export interface CoverageResult {
  readonly content: readonly {
    readonly type: string;
    readonly text?: string;
  }[];
  structuredContent?: {
    readonly summary: Readonly<Record<string, number>>;
    readonly rows: readonly Readonly<Record<string, unknown>>[];
    readonly meta?: Readonly<Record<string, unknown>>;
  };
}

// implements REQ-002, REQ-013
export async function handleKbCoverage(
  prolog: ReportingProlog,
  args: CoverageArgs,
): Promise<CoverageResult> {
  return executeCoverage(
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
