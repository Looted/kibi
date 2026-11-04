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
    options?: { readonly cause?: unknown; readonly model?: string },
  ) {
    super(message, options);
    this.name = "JevProviderError";
    this.code = code;
    if (options?.model !== undefined) {
      this.model = options.model;
    }
  }

  // implements REQ-capability-plugin-jev-fallback-v1
  readonly model?: string;
}

// implements REQ-capability-plugin-jev-fallback-v1
export function mapJevError(error: unknown): JevProviderError {
  if (error instanceof JevProviderError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : undefined;
  // Compared only against numeric literals, so a non-number never matches.
  const status = (error as { status?: unknown } | null | undefined)?.status;

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
  if (/timeout/i.test(message) || name?.includes("Timeout")) {
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
    name?.includes("Connection")
  ) {
    return new JevProviderError("network", message, { cause: error });
  }
  if (/model|unsupported|invalid_request/i.test(message) || status === 400) {
    return new JevProviderError("unsupported", message, { cause: error });
  }
  return new JevProviderError("unknown", message, { cause: error });
}

// implements REQ-capability-plugin-jev-fallback-v1
export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** A Choice answer must carry a string choice. */
// implements REQ-capability-plugin-jev-fallback-v1
export function asChoice(answer: unknown): JevChoiceAnswer {
  if (
    typeof (answer as { choice?: unknown } | null | undefined)?.choice !==
    "string"
  ) {
    throw new JevProviderError(
      "malformed",
      "Jev Choice answer is missing a string choice field",
    );
  }
  return answer as JevChoiceAnswer;
}

/** A Noul answer must carry a finite number; NaN is not a probability. */
// implements REQ-capability-plugin-jev-fallback-v1
export function asNoul(answer: unknown): JevNoulAnswer {
  if (
    !Number.isFinite((answer as { noul?: unknown } | null | undefined)?.noul)
  ) {
    throw new JevProviderError(
      "malformed",
      "Jev Noul answer is missing a finite numeric noul field",
    );
  }
  return answer as JevNoulAnswer;
}

/**
 * The choice's own confidence, else the probability of the chosen option,
 * else 0.5. Non-finite numbers are ignored, and the result lies in [0, 1].
 */
// implements REQ-capability-plugin-jev-fallback-v1
export function choiceConfidence(answer: JevChoiceAnswer): number {
  if (Number.isFinite(answer.confidence)) {
    return clamp01(answer.confidence as number);
  }
  const selected = answer.probabilities?.[answer.choice];
  return Number.isFinite(selected) ? clamp01(selected as number) : 0.5;
}
