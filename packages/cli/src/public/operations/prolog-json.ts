import path from "node:path";

import { getKbPlPathOverride } from "../../env.js";
import { resolveKbPlPath } from "../../prolog.js";
import { escapeAtom } from "../../prolog/codec.js";
import type { PrologPort } from "./runtime-types.js";

export type JsonBindingDecodeStage = "outer" | "inner";

/**
 * A JSON operation result is transported through Prolog's answer printer and
 * then through the engine frame. Keep decode failures typed and bounded: the
 * raw binding may contain project-authored data and must never be copied into
 * diagnostics wholesale.
 */
export class OperationJsonDecodeError extends Error {
  readonly code = "engine_result_invalid_json";
  readonly stage: JsonBindingDecodeStage;
  readonly rawLength: number;
  readonly prefixCodePoints: readonly number[];

  constructor(
    errorLabel: string,
    stage: JsonBindingDecodeStage,
    rawJson: unknown,
    cause: unknown,
  ) {
    const rawText = typeof rawJson === "string" ? rawJson : "";
    const bindingType = typeof rawJson;
    const message = cause instanceof Error ? cause.message : String(cause);
    super(
      `${errorLabel} returned invalid JSON binding (stage=${stage}, bindingType=${bindingType}, length=${rawText.length}, prefixCodePoints=${JSON.stringify([...rawText].slice(0, 8).map((character) => character.codePointAt(0) ?? 0))}): ${message}`,
    );
    this.name = "OperationJsonDecodeError";
    this.stage = stage;
    this.rawLength = rawText.length;
    this.prefixCodePoints = Object.freeze(
      [...rawText]
        .slice(0, 8)
        .map((character) => character.codePointAt(0) ?? 0),
    );
  }
}

function resolveCoreModulePath(fileName: string): string {
  const genericOverride = getKbPlPathOverride();
  return path.join(
    path.dirname(genericOverride ?? resolveKbPlPath()),
    fileName,
  );
}

export async function runOperationJsonQuery<T>(
  prolog: PrologPort,
  fileName: string,
  goal: string,
  errorLabel: string,
): Promise<T> {
  const modulePath = escapeAtom(
    resolveCoreModulePath(fileName).replaceAll("\\", "/"),
  );
  // Loading a module and invoking its predicate in one interactive goal makes
  // SWI reject `use_module/1` under the engine's guarded `once/1` wrapper, so
  // use two serialized requests for production and retain the combined goal
  // only for the repository's Bun-based one-shot tests.
  const longLivedEngine =
    typeof (prolog as { storageStatus?: unknown }).storageStatus === "function";
  const oneShotMode =
    prolog.oneShotMode === true ||
    (!longLivedEngine &&
      process.env.NODE_ENV === "test" &&
      typeof (globalThis as { Bun?: unknown }).Bun !== "undefined");
  const typedStatusQuery = prolog.queryStatusJson;
  const result =
    fileName === "status.pl" && typeof typedStatusQuery === "function"
      ? await typedStatusQuery.call(prolog)
      : oneShotMode
        ? await prolog.query(`(use_module('${modulePath}'), ${goal})`)
        : await runInteractiveModuleQuery(prolog, modulePath, goal, errorLabel);
  if (!result.success) {
    throw new Error(
      `${errorLabel} query failed: ${result.error ?? "Unknown error"}`,
    );
  }
  const rawJson = result.bindings.JsonString;
  if (rawJson === undefined) {
    throw new Error(`${errorLabel} query returned no JsonString binding`);
  }
  if (typeof rawJson !== "string") {
    throw new OperationJsonDecodeError(
      errorLabel,
      "outer",
      rawJson,
      new TypeError("JsonString binding is not a string"),
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    throw new OperationJsonDecodeError(errorLabel, "outer", rawJson, error);
  }
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch (error) {
      throw new OperationJsonDecodeError(errorLabel, "inner", parsed, error);
    }
  }
  return parsed as T;
}

async function runInteractiveModuleQuery(
  prolog: PrologPort,
  modulePath: string,
  goal: string,
  errorLabel: string,
) {
  const loadResult = await prolog.query(`use_module('${modulePath}')`);
  if (!loadResult.success) {
    throw new Error(
      `${errorLabel} module load failed: ${loadResult.error ?? "Unknown error"}`,
    );
  }
  return prolog.query(goal);
}

export function toPrologAtom(value?: string): string {
  return value === undefined || value === ""
    ? "none"
    : `'${escapeAtom(value)}'`;
}

export function toPrologList(values?: readonly string[]): string {
  return values === undefined || values.length === 0
    ? "[]"
    : `[${values.map((value) => `'${escapeAtom(value)}'`).join(",")}]`;
}
