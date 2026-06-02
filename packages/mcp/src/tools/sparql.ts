import type { PrologProcess } from "kibi-cli/prolog";
import { runJsonModuleQuery, toPrologAtom } from "./core-module.js";

export interface SparqlArgs {
  endpoint: string;
  query: string;
  timeoutMs?: number;
}

export interface SparqlResult {
  content: Array<{ type: string; text: string }>;
  structuredContent?: {
    rows: Array<Record<string, unknown>>;
  };
}

// implements REQ-002, REQ-013
export async function handleSparql(
  prolog: PrologProcess,
  args: SparqlArgs,
): Promise<SparqlResult> {
  validateSparqlArgs(args);

  try {
    const payload = await runJsonModuleQuery<SparqlResult["structuredContent"]>(
      prolog,
      "sparql_client.pl",
      `kibi_sparql_client:remote_sparql_select_json(${toPrologAtom(args.endpoint)}, ${toPrologAtom(args.query)}, ${toSparqlOptions(args)}, JsonString)`,
      "SPARQL remote query",
    );
    const rows = payload?.rows ?? [];

    return {
      content: [
        {
          type: "text",
          text: `Remote SPARQL query returned ${rows.length} row${rows.length === 1 ? "" : "s"}.`,
        },
      ],
      ...(payload !== undefined ? { structuredContent: payload } : {}),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`SPARQL remote query failed: ${message}`);
  }
}

function validateSparqlArgs(args: SparqlArgs): void {
  if (!args.endpoint || args.endpoint.trim().length === 0) {
    throw new Error("SPARQL endpoint is required");
  }
  if (!args.query || args.query.trim().length === 0) {
    throw new Error("SPARQL query is required");
  }
  if (!isRemoteHttpEndpoint(args.endpoint)) {
    throw new Error("SPARQL endpoint must be an http:// or https:// URL");
  }
  if (!isSelectQuery(args.query)) {
    throw new Error("SPARQL query must be a SELECT query");
  }
  if (!isPublicRemoteEndpoint(args.endpoint)) {
    throw new Error("SPARQL endpoint must target a public remote host");
  }
  if (
    args.timeoutMs !== undefined &&
    (!Number.isFinite(args.timeoutMs) || args.timeoutMs <= 0)
  ) {
    throw new Error("SPARQL timeoutMs must be a positive number when provided");
  }
}

function isRemoteHttpEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isSelectQuery(query: string): boolean {
  return /^\s*select\b/i.test(query);
}

function isPublicRemoteEndpoint(endpoint: string): boolean {
  const url = new URL(endpoint);
  const host = normalizeHostname(url.hostname);

  return !isLocalOrPrivateHost(host);
}

function normalizeHostname(hostname: string): string {
  return hostname
    .toLowerCase()
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .replace(/\.$/, "");
}

function isLocalOrPrivateHost(host: string): boolean {
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "0.0.0.0" ||
    host === "::1" ||
    (host.includes(":") &&
      (host.startsWith("fe80:") ||
        host.startsWith("fc") ||
        host.startsWith("fd")))
  ) {
    return true;
  }

  const octets = host.split(".").map((part) => Number(part));
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) {
    return false;
  }

  const [first = -1, second = -1] = octets;
  return (
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function toSparqlOptions(args: SparqlArgs): string {
  if (args.timeoutMs === undefined) {
    return "[]";
  }

  const timeoutSeconds = Math.max(1, Math.ceil(args.timeoutMs / 1000));
  return `[timeout(${timeoutSeconds})]`;
}
