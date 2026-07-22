import path from "node:path";

import { getKbPlPathOverride } from "../../env.js";
import { resolveKbPlPath } from "../../prolog.js";
import { escapeAtom } from "../../prolog/codec.js";
import type { PrologPort } from "./runtime-types.js";

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
  const loadResult = await prolog.query(`use_module('${modulePath}')`);
  if (!loadResult.success) {
    throw new Error(
      `${errorLabel} module load failed: ${loadResult.error ?? "Unknown error"}`,
    );
  }
  const result = await prolog.query(goal);
  if (!result.success) {
    throw new Error(
      `${errorLabel} query failed: ${result.error ?? "Unknown error"}`,
    );
  }
  const rawJson = result.bindings.JsonString;
  if (rawJson === undefined) {
    throw new Error(`${errorLabel} query returned no JsonString binding`);
  }
  let parsed: unknown = JSON.parse(rawJson);
  if (typeof parsed === "string") {
    parsed = JSON.parse(parsed);
  }
  return parsed as T;
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
