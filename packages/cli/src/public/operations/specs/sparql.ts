import { executePlaceholder } from "../types.js";
import type { OperationSpec } from "../types.js";

export const sparqlRemoteSpec = {
  name: "kb_sparql_remote",
  cliName: "sparql-remote",
  description:
    "Opt-in remote SPARQL query tool for external HTTP(S) RDF endpoints. This does not query Kibi's local RDF store directly, stores no credentials, and depends on network availability.",
  businessInputSchema: {
    type: "object",
    required: ["endpoint", "query"],
    properties: {
      endpoint: {
        type: "string",
        description: "Remote SPARQL endpoint URL. Must start with http:// or https://.",
      },
      query: {
        type: "string",
        description: "SPARQL SELECT query to send to the remote endpoint.",
      },
      timeoutMs: {
        type: "number",
        description: "Optional positive timeout in milliseconds for the remote query.",
      },
    },
  },
  requiresProlog: true,
  effects: ["network-read"],
  execute: executePlaceholder,
} as const satisfies OperationSpec;
