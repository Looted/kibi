import path from "node:path";
import { PrologProcess, resolveKbPlPath } from "kibi-runtime";
import { escapeAtomContent } from "kibi-runtime";
import { getCoreModulePathOverride, getKbPlPathOverride } from "../env.js";

type PrologQueryResult = Awaited<ReturnType<PrologProcess["query"]>>;

type PrologQueryLike = {
  query: (goal: string) => Promise<PrologQueryResult>;
};

export function parseMaybeDoubleEncodedJson(rawJson: string): unknown {
  let parsed: unknown = JSON.parse(rawJson);
  if (typeof parsed === "string") {
    parsed = JSON.parse(parsed);
  }
  return parsed;
}

function isPrologProcess(value: unknown): value is PrologProcess {
  return (
    value instanceof PrologProcess ||
    (value !== null &&
      typeof value === "object" &&
      typeof (value as { query?: unknown }).query === "function" &&
      typeof (value as { invalidateCache?: unknown }).invalidateCache ===
        "function")
  );
}

// implements REQ-002, REQ-013
export function resolveCorePlPath(fileName: string): string {
  const override = getCoreModulePathOverride(fileName);
  if (override) {
    return override;
  }

  // Fall back to the generic KB_PL override so test fixtures
  // (which set only KIBI_KB_PL_PATH) can still resolve sibling modules.
  const genericOverride = getKbPlPathOverride();
  if (genericOverride) {
    return path.join(path.dirname(genericOverride), fileName);
  }

  const kbPlPath = resolveKbPlPath();
  return path.join(path.dirname(kbPlPath), fileName);
}

// implements REQ-002, REQ-013
export async function runJsonModuleQuery<T>(
  prolog: PrologProcess | PrologQueryLike,
  fileName: string,
  goal: string,
  errorLabel: string,
): Promise<T> {
  const modulePath = escapeAtomContent(
    resolveCorePlPath(fileName).replace(/\\/g, "/"),
  );
  if (!isPrologProcess(prolog)) {
    const mockedResult = await prolog.query(
      `(use_module('${modulePath}'), ${goal})`,
    );
    if (!mockedResult.success) {
      throw new Error(
        `${errorLabel} query failed: ${mockedResult.error || "Unknown error"}`,
      );
    }

    const mockedJson = mockedResult.bindings.JsonString;
    if (!mockedJson) {
      throw new Error(`${errorLabel} query returned no JsonString binding`);
    }

    let mockedParsed: unknown = JSON.parse(mockedJson);
    if (typeof mockedParsed === "string") {
      mockedParsed = JSON.parse(mockedParsed);
    }

    return mockedParsed as T;
  }
  // NOTE: useOneShotMode is an internal optimization flag on PrologProcess that
  // forces single-query mode (start → query → terminate per call) instead of the
  // default interactive session. It is not exposed in the public PrologProcess type
  // because callers should not set it directly — only internal discovery helpers
  // use it for lightweight one-shot queries that don't need session state.
  const oneShotCapable = prolog as unknown as { useOneShotMode?: boolean };
  prolog.invalidateCache();
  const result = oneShotCapable.useOneShotMode
    ? await prolog.query(`(use_module('${modulePath}'), ${goal})`)
    : await runInteractiveModuleQuery(prolog, modulePath, goal, errorLabel);

  if (!result.success) {
    throw new Error(
      `${errorLabel} query failed: ${result.error || "Unknown error"}`,
    );
  }

  const rawJson = result.bindings.JsonString;
  if (!rawJson) {
    throw new Error(`${errorLabel} query returned no JsonString binding`);
  }

  return parseMaybeDoubleEncodedJson(rawJson) as T;
}

async function runInteractiveModuleQuery(
  prolog: PrologProcess,
  modulePath: string,
  goal: string,
  errorLabel: string,
) {
  const loadResult = await prolog.query(`use_module('${modulePath}')`);
  if (!loadResult.success) {
    throw new Error(
      `${errorLabel} module load failed: ${loadResult.error || "Unknown error"}`,
    );
  }

  return prolog.query(goal);
}

// implements REQ-002, REQ-013
export function toPrologAtom(value?: string): string {
  if (!value) {
    return "none";
  }
  return `'${escapeAtomContent(value)}'`;
}

// implements REQ-002, REQ-013
export function toPrologList(values?: string[]): string {
  if (!values || values.length === 0) {
    return "[]";
  }
  return `[${values.map((value) => `'${escapeAtomContent(value)}'`).join(",")}]`;
}
