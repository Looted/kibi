import { createHash } from "node:crypto";
import { open, readFile } from "node:fs/promises";

const SECRET_KEY = /(token|secret|password|authorization|api[_-]?key|bearer)/i;
const ZERO_HASH = "0".repeat(64);

export type TraceInput = Readonly<{
  correlationId: string;
  direction: "target_to_server" | "server_to_target" | "broker";
  kind: "request" | "response" | "error";
  method?: string;
  toolName?: string;
  requestId?: string | number | null;
  elapsedMs?: number;
  payload: unknown;
}>;
export type TraceReceipt = TraceInput &
  Readonly<{
    schemaVersion: "1.0.0";
    sequence: number;
    previousHash: string;
    hash: string;
  }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseDirection(value: unknown): TraceInput["direction"] {
  if (
    value === "target_to_server" ||
    value === "server_to_target" ||
    value === "broker"
  ) {
    return value;
  }
  throw new TypeError("invalid_trace_direction");
}

function parseKind(value: unknown): TraceInput["kind"] {
  if (value === "request" || value === "response" || value === "error")
    return value;
  throw new TypeError("invalid_trace_kind");
}

function parseTraceReceipt(value: unknown): TraceReceipt {
  if (!isRecord(value)) throw new TypeError("trace_receipt_must_be_object");
  const { correlationId, schemaVersion, sequence, previousHash, hash } = value;
  if (
    typeof correlationId !== "string" ||
    schemaVersion !== "1.0.0" ||
    typeof sequence !== "number" ||
    !Number.isSafeInteger(sequence) ||
    typeof previousHash !== "string" ||
    !/^[a-f0-9]{64}$/.test(previousHash) ||
    typeof hash !== "string" ||
    !/^[a-f0-9]{64}$/.test(hash)
  ) {
    throw new TypeError("invalid_trace_receipt");
  }
  const method = value.method;
  const toolName = value.toolName;
  const requestId = value.requestId;
  const elapsedMs = value.elapsedMs;
  if (method !== undefined && typeof method !== "string")
    throw new TypeError("invalid_trace_method");
  if (toolName !== undefined && typeof toolName !== "string")
    throw new TypeError("invalid_trace_tool");
  if (
    requestId !== undefined &&
    requestId !== null &&
    typeof requestId !== "string" &&
    typeof requestId !== "number"
  ) {
    throw new TypeError("invalid_trace_request_id");
  }
  if (
    elapsedMs !== undefined &&
    (typeof elapsedMs !== "number" || elapsedMs < 0)
  ) {
    throw new TypeError("invalid_trace_elapsed_ms");
  }
  return {
    schemaVersion,
    sequence,
    correlationId,
    direction: parseDirection(value.direction),
    kind: parseKind(value.kind),
    ...(method === undefined ? {} : { method }),
    ...(toolName === undefined ? {} : { toolName }),
    ...(requestId === undefined ? {} : { requestId }),
    ...(elapsedMs === undefined ? {} : { elapsedMs }),
    payload: value.payload,
    previousHash,
    hash,
  };
}

// implements REQ-skillopt-codex-optimization
export function redactJsonRpcValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactJsonRpcValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [
      key,
      SECRET_KEY.test(key) ? "[REDACTED]" : redactJsonRpcValue(nested),
    ]),
  );
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

function hashReceipt(receipt: Omit<TraceReceipt, "hash">): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(receipt)))
    .digest("hex");
}

function parsedLines(text: string): readonly TraceReceipt[] {
  return text
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => parseTraceReceipt(JSON.parse(line)));
}

export function parseTraceReceipts(text: string): readonly TraceReceipt[] {
  return parsedLines(text);
}

// implements REQ-skillopt-codex-optimization
export async function appendTraceReceipt(
  tracePath: string,
  input: TraceInput,
): Promise<TraceReceipt> {
  const existing = await readFile(tracePath, "utf8").catch((error: unknown) => {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return "";
    }
    throw error;
  });
  const prior = parsedLines(existing);
  const previousHash = prior.at(-1)?.hash ?? ZERO_HASH;
  const withoutHash = {
    schemaVersion: "1.0.0" as const,
    sequence: prior.length + 1,
    ...input,
    payload: redactJsonRpcValue(input.payload),
    previousHash,
  };
  const receipt = parseTraceReceipt({
    ...withoutHash,
    hash: hashReceipt(withoutHash),
  });
  const handle = await open(tracePath, "a", 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(receipt)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  return receipt;
}

export type TraceVerification = Readonly<{
  valid: boolean;
  entries: number;
  failureSequence?: number;
}>;

// implements REQ-skillopt-codex-optimization
export function verifyTraceChain(text: string): TraceVerification {
  try {
    const receipts = parsedLines(text);
    let previousHash = ZERO_HASH;
    for (const receipt of receipts) {
      const { hash, ...withoutHash } = receipt;
      if (
        receipt.previousHash !== previousHash ||
        receipt.hash !== hashReceipt(withoutHash)
      ) {
        return {
          valid: false,
          entries: receipts.length,
          failureSequence: receipt.sequence,
        };
      }
      previousHash = hash;
    }
    return { valid: true, entries: receipts.length };
  } catch {
    return { valid: false, entries: 0 };
  }
}

export function parseJsonRpcObject(line: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(line);
  if (!isRecord(parsed)) throw new TypeError("jsonrpc_message_must_be_object");
  return parsed;
}

export function jsonRpcId(
  message: Readonly<Record<string, unknown>>,
): string | number | null | undefined {
  const id = message.id;
  return typeof id === "string" || typeof id === "number" || id === null
    ? id
    : undefined;
}

export function jsonRpcMethod(
  message: Readonly<Record<string, unknown>>,
): string | undefined {
  return typeof message.method === "string" ? message.method : undefined;
}

export function toolNameFromCall(
  message: Readonly<Record<string, unknown>>,
): string | undefined {
  const params = message.params;
  if (!isRecord(params)) return undefined;
  return typeof params.name === "string" ? params.name : undefined;
}
