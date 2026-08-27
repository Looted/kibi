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

function effectStatus(
  effect: OperationEffect,
  data: Record<string, unknown> | undefined,
): KibiResult["effects"][number] {
  const failures = data?.effectFailures;
  if (Array.isArray(failures)) {
    const failure = failures.find(
      (entry) => record(entry) && entry.kind === effect,
    );
    if (record(failure)) {
      return {
        kind: effect,
        status: "failed",
        detail: failure.detail,
        ...(typeof failure.errorCode === "string"
          ? { errorCode: failure.errorCode }
          : {}),
      };
    }
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
