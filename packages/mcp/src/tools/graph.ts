import { executeGraph } from "kibi-runtime";
import type { PrologProcess } from "kibi-runtime";

type ReportingProlog = Pick<PrologProcess, "query">;

export interface GraphArgs {
  seedIds: string[];
  relationships?: string[];
  direction?: "outgoing" | "incoming" | "both";
  depth?: number;
  entityTypes?: string[];
  maxNodes?: number;
  maxEdges?: number;
}

export interface GraphResult {
  readonly content: readonly {
    readonly type: string;
    readonly text?: string;
  }[];
  structuredContent?: {
    readonly nodes: readonly Readonly<Record<string, unknown>>[];
    readonly edges: readonly Readonly<Record<string, unknown>>[];
    readonly truncated: boolean;
    readonly meta?: Readonly<Record<string, unknown>>;
  };
}

// implements REQ-002, REQ-013
export async function handleKbGraph(
  prolog: ReportingProlog,
  args: GraphArgs,
): Promise<GraphResult> {
  return executeGraph(
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
