import type { KibiResult, OperationEffect, OperationName } from "./types.js";

export const KIBI_PROTOCOL_VERSION = 1 as const;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function diagnostics(value: unknown): KibiResult["diagnostics"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry === "string")
      return [{ message: entry, severity: "warning" as const }];
    if (!record(entry) || typeof entry.message !== "string") return [];
    return [entry as KibiResult["diagnostics"][number]];
  });
}

function nextActions(value: unknown): KibiResult["nextActions"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (
      !record(entry) ||
      typeof entry.operation !== "string" ||
      typeof entry.reason !== "string"
    )
      return [];
    return [
      {
        operation: entry.operation,
        input: entry.input,
        reason: entry.reason,
        required: entry.required === true,
      },
    ];
  });
}

export function failedEffectStatus(
  effect: OperationEffect,
  failure: Record<string, unknown>,
): KibiResult["effects"][number] {
  return {
    kind: effect,
    status: "failed",
    detail: failure.detail,
    ...(typeof failure.errorCode === "string"
      ? { errorCode: failure.errorCode }
      : {}),
  };
}

function effectStatus(
  effect: OperationEffect,
  data: Record<string, unknown> | undefined,
): KibiResult["effects"][number] {
  const failures = data?.effectFailures;
  if (Array.isArray(failures)) {
    const failure = failures.find(
      (entry) => record(entry) && entry.kind === effect,
    );
    if (record(failure)) return failedEffectStatus(effect, failure);
  }
  return { kind: effect, status: "completed" };
}

function extraFailedEffects(
  declared: readonly OperationEffect[],
  data: Record<string, unknown> | undefined,
): KibiResult["effects"] {
  const failures = data?.effectFailures;
  if (!Array.isArray(failures)) return [];
  const seen = new Set(declared);
  return failures.flatMap((entry) => {
    if (
      !record(entry) ||
      typeof entry.kind !== "string" ||
      seen.has(entry.kind as OperationEffect)
    ) {
      return [];
    }
    seen.add(entry.kind as OperationEffect);
    return [
      {
        kind: entry.kind,
        status: "failed" as const,
        detail: entry.detail,
        ...(typeof entry.errorCode === "string"
          ? { errorCode: entry.errorCode }
          : {}),
      },
    ];
  });
}

export function resultVersion(spec: {
  readonly name: OperationName | string;
  readonly resultVersion?: string;
}): string {
  return spec.resultVersion ?? `kibi.${spec.name}.v1`;
}

export function toKibiResult<T>(
  spec: {
    readonly name: OperationName | string;
    readonly effects: readonly OperationEffect[];
    readonly resultVersion?: string;
  },
  data: T,
  options: Partial<
    Pick<KibiResult<T>, "status" | "diagnostics" | "nextActions" | "error">
  > = {},
): KibiResult<T> {
  const row = record(data) ? data : undefined;
  const status =
    options.status ??
    (row?.status === "committed_with_repairs"
      ? "committed_with_repairs"
      : "success");
  return {
    kibiProtocol: KIBI_PROTOCOL_VERSION,
    operation: spec.name as OperationName,
    resultVersion: resultVersion(spec),
    status,
    data,
    effects: [
      ...spec.effects.map((effect) => effectStatus(effect, row)),
      ...extraFailedEffects(spec.effects, row),
    ],
    diagnostics: options.diagnostics ?? diagnostics(row?.diagnostics),
    nextActions: options.nextActions ?? nextActions(row?.nextActions),
    ...(options.error ? { error: options.error } : {}),
  };
}

export function operationData(value: unknown): unknown {
  if (record(value) && "structuredContent" in value) {
    return value.structuredContent;
  }
  return value;
}

// implements REQ-kibi-telemetry-remediation-evidence
export interface NormalizedResultPayload {
  /** The versioned KibiResult envelope, when the result carries one. */
  readonly envelope?: Record<string, unknown>;
  /** The operation payload that operation-specific telemetry fields read. */
  readonly data?: Record<string, unknown>;
}

/**
 * Resolve a tool result into its envelope and its operation payload.
 *
 * Callers hand results over in two shapes: MCP tool handlers pass the bare
 * `toKibiResult` envelope, while some CLI and SDK routes wrap it as
 * `{ structuredContent }`.  Deriving telemetry from the wrong shape silently
 * yields an absent payload, so both shapes resolve here instead of at each
 * call site.  An unresolvable payload stays `undefined` so callers can record
 * the count as unknown rather than as zero.
 */
export function normalizeResultPayload(
  result: unknown,
): NormalizedResultPayload {
  if (!record(result)) return {};
  const candidate = record(result.structuredContent)
    ? result.structuredContent
    : result;
  if (candidate.kibiProtocol !== KIBI_PROTOCOL_VERSION) {
    return { data: candidate };
  }
  return {
    envelope: candidate,
    ...(record(candidate.data) ? { data: candidate.data } : {}),
  };
}

function readPayloadCount(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  // Some transports serialize counts as strings; an absent or unparseable
  // value stays null so it is never coerced to a plausible zero.
  if (typeof raw === "string" && raw.trim() !== "") {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Record a count that could not be read as unknown rather than as zero.
 *
 * A missing payload and an empty result are different facts, and collapsing
 * them hides retrieval failures behind a plausible "0 results" row. Both the
 * MCP and CLI diagnostic loggers derive counts here so the two surfaces stay
 * at parity.
 */
export function appendPayloadCountField(
  fields: Record<string, unknown>,
  countKey: string,
  noun: string,
  payload: Record<string, unknown> | undefined,
): void {
  const count = readPayloadCount(payload?.count);
  fields[countKey] = count;
  fields.result_summary =
    count === null ? `${noun} count unavailable` : `${count} ${noun}`;
}
