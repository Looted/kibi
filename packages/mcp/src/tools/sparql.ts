import {
  type OperationContext,
  sparqlRemoteSpec,
} from "kibi-cli/operations";
import type { PrologProcess } from "kibi-cli/prolog";

export type SparqlArgs = Readonly<Record<string, unknown>> & {
  readonly endpoint: string;
  readonly query: string;
  readonly timeoutMs?: number;
};

export type SparqlResult = Awaited<ReturnType<typeof sparqlRemoteSpec.execute>>;

// implements REQ-002, REQ-013, REQ-kibi-operation-interface-parity
export async function handleSparql(
  prologOrArgs: PrologProcess | SparqlArgs,
  legacyArgs?: SparqlArgs,
): Promise<SparqlResult> {
  const args =
    legacyArgs ?? ("endpoint" in prologOrArgs ? prologOrArgs : undefined);
  if (args === undefined) {
    throw new Error("SPARQL endpoint is required");
  }
  const context: OperationContext = {
    workspaceRoot: process.cwd(),
    signal: new AbortController().signal,
    clock: () => new Date(),
    net: { fetch: (input, init) => globalThis.fetch(input, init) },
  };
  return sparqlRemoteSpec.execute(args, context);
}
