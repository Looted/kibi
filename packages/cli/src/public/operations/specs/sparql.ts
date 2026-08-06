import type { OperationContext } from "../runtime-types.js";
import type { OperationResult, OperationSpec } from "../types.js";

// implements REQ-kibi-operation-interface-parity
export type SparqlRemoteInput = {
  readonly endpoint: string;
  readonly query: string;
  readonly timeoutMs?: number;
};

// implements REQ-kibi-operation-interface-parity
export type SparqlRemoteOutput = {
  readonly rows: readonly Readonly<Record<string, unknown>>[];
};

function validateInput(input: SparqlRemoteInput): URL {
  if (typeof input.endpoint !== "string" || input.endpoint.trim() === "") {
    throw new Error("SPARQL endpoint is required");
  }
  if (typeof input.query !== "string" || input.query.trim() === "") {
    throw new Error("SPARQL query is required");
  }
  let endpoint: URL;
  try {
    endpoint = new URL(input.endpoint);
  } catch {
    throw new Error("SPARQL endpoint must be an http:// or https:// URL");
  }
  if (endpoint.protocol !== "http:" && endpoint.protocol !== "https:") {
    throw new Error("SPARQL endpoint must be an http:// or https:// URL");
  }
  if (!/^\s*select\b/i.test(input.query)) {
    throw new Error("SPARQL query must be a SELECT query");
  }
  if (
    input.timeoutMs !== undefined &&
    (!Number.isFinite(input.timeoutMs) || input.timeoutMs <= 0)
  ) {
    throw new Error("SPARQL timeoutMs must be a positive number when provided");
  }
  return endpoint;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function decodeRows(payload: unknown): SparqlRemoteOutput {
  if (!isRecord(payload) || !isRecord(payload.results)) {
    throw new Error("SPARQL endpoint returned an invalid result document");
  }
  const bindings = payload.results.bindings;
  if (!Array.isArray(bindings)) {
    throw new Error("SPARQL endpoint returned an invalid bindings array");
  }
  const rows = bindings.map((binding) => {
    if (!isRecord(binding)) {
      throw new Error("SPARQL endpoint returned an invalid binding");
    }
    const row: Record<string, unknown> = {};
    for (const [variable, term] of Object.entries(binding)) {
      if (!isRecord(term) || typeof term.value !== "string") {
        throw new Error(`SPARQL endpoint returned an invalid ${variable} term`);
      }
      row[variable] = term.value;
    }
    return row;
  });
  return { rows };
}

// implements REQ-kibi-operation-interface-parity, REQ-002, REQ-013
async function executeSparqlRemote(
  input: SparqlRemoteInput,
  context: OperationContext,
): Promise<OperationResult<SparqlRemoteOutput>> {
  const endpoint = validateInput(input);
  if (context.net === undefined) {
    throw new Error("SPARQL remote query requires a network port");
  }
  const signal =
    input.timeoutMs === undefined
      ? context.signal
      : AbortSignal.any([
          context.signal,
          AbortSignal.timeout(
            Math.max(1, Math.ceil(input.timeoutMs / 1_000)) * 1_000,
          ),
        ]);
  try {
    const response = await context.net.fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/sparql-results+json",
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: new URLSearchParams({ query: input.query }),
      signal,
    });
    if (!response.ok) {
      throw new Error(`SPARQL endpoint returned HTTP ${response.status}`);
    }
    const payload: unknown = await response.json();
    const structuredContent = decodeRows(payload);
    const rowCount = structuredContent.rows.length;
    return {
      content: [
        {
          type: "text",
          text: `Remote SPARQL query returned ${rowCount} row${rowCount === 1 ? "" : "s"}.`,
        },
      ],
      structuredContent,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`SPARQL remote query failed: ${message}`);
  }
}

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
        description:
          "Remote SPARQL endpoint URL. Must start with http:// or https://.",
      },
      query: {
        type: "string",
        description: "SPARQL SELECT query to send to the remote endpoint.",
      },
      timeoutMs: {
        type: "number",
        description:
          "Optional positive timeout in milliseconds for the remote query.",
      },
    },
  },
  requiresProlog: false,
  effects: ["network-read"],
  execute: executeSparqlRemote,
} as const satisfies OperationSpec<SparqlRemoteInput, SparqlRemoteOutput>;
