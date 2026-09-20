/**
 * Injectable TypeSafe/Jev client surface used by the semantic classifier.
 * Network access must never happen during module import.
 */

import type { SEMANTIC_LANES } from "kibi-plugin-sdk";

// implements REQ-capability-plugin-jev-fallback-v1
export type JevLane = (typeof SEMANTIC_LANES)[number];

// implements REQ-capability-plugin-jev-fallback-v1
export type JevChoiceAnswer = Readonly<{
  choice: string;
  probabilities?: Readonly<Record<string, number>>;
  confidence?: number;
}>;

// implements REQ-capability-plugin-jev-fallback-v1
export type JevNoulAnswer = Readonly<{
  noul: number;
}>;

// implements REQ-capability-plugin-jev-fallback-v1
export type JevSystemOneResult = Readonly<{
  answers: Readonly<Record<string, JevChoiceAnswer | JevNoulAnswer>>;
}>;

// implements REQ-capability-plugin-jev-fallback-v1
export type JevSystemOneRequest = Readonly<{
  model?: string;
  state: unknown;
  questions: Readonly<Record<string, unknown>>;
}>;

// implements REQ-capability-plugin-jev-fallback-v1
export interface JevClient {
  systemOne(request: JevSystemOneRequest): Promise<JevSystemOneResult>;
}

// implements REQ-capability-plugin-jev-fallback-v1
export type JevClientFactory = (options?: {
  readonly apiKey?: string;
  readonly timeoutMs?: number;
}) => JevClient;

// implements REQ-capability-plugin-jev-fallback-v1
export class JevProviderError extends Error {
  readonly code:
    | "missing_api_key"
    | "timeout"
    | "network"
    | "quota"
    | "auth"
    | "malformed"
    | "unsupported"
    | "unknown";

  constructor(
    code: JevProviderError["code"],
    message: string,
    options?: { readonly cause?: unknown },
  ) {
    super(message, options);
    this.name = "JevProviderError";
    this.code = code;
  }
}

// implements REQ-capability-plugin-jev-fallback-v1
export function mapJevError(error: unknown): JevProviderError {
  if (error instanceof JevProviderError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : "";
  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
      ? (error as { status: number }).status
      : undefined;

  // Missing key is only when the message clearly indicates absence — not an
  // HTTP 401 from a present but invalid credential.
  if (
    /TYPESAFE_API_KEY.*(missing|not set|required|undefined)|missing.*api key|api key is (missing|required)/i.test(
      message,
    )
  ) {
    return new JevProviderError("missing_api_key", message, { cause: error });
  }
  if (
    status === 401 ||
    /unauthorized|invalid (api )?key|authentication failed|invalid credentials/i.test(
      message,
    )
  ) {
    return new JevProviderError("auth", message, { cause: error });
  }
  if (/timeout/i.test(message) || name.includes("Timeout")) {
    return new JevProviderError("timeout", message, { cause: error });
  }
  if (
    /quota|billing|payment|rate limit/i.test(message) ||
    status === 429 ||
    status === 402
  ) {
    return new JevProviderError("quota", message, { cause: error });
  }
  if (/permission|forbidden/i.test(message) || status === 403) {
    return new JevProviderError("auth", message, { cause: error });
  }
  if (
    /connect|network|ECONN|ENOTFOUND|fetch failed/i.test(message) ||
    name.includes("Connection")
  ) {
    return new JevProviderError("network", message, { cause: error });
  }
  if (/model|unsupported|invalid_request/i.test(message) || status === 400) {
    return new JevProviderError("unsupported", message, { cause: error });
  }
  return new JevProviderError("unknown", message, { cause: error });
}
