import path from "node:path";
import { PrologProcess, resolveKbPlPath } from "kibi-cli/prolog";
import { escapeAtomContent } from "kibi-cli/prolog/codec";

type PrologQueryLike = {
  query: (goal: string) => Promise<{
    success: boolean;
    bindings: Record<string, string>;
    error?: string;
  }>;
};

// implements REQ-002, REQ-013
export function resolveCorePlPath(fileName: string): string {
  const envKey = `KIBI_${fileName.replace(/\W/g, "_").toUpperCase()}_PATH`;
  const override = process.env[envKey];
  if (override) {
    return override;
  }

  // Fall back to the generic KB_PL override so test fixtures
  // (which set only KIBI_KB_PL_PATH) can still resolve sibling modules.
  const genericOverride = process.env.KIBI_KB_PL_PATH;
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
  if (!(prolog instanceof PrologProcess)) {
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

  let parsed: unknown = JSON.parse(rawJson);
  if (typeof parsed === "string") {
    parsed = JSON.parse(parsed);
  }

  return parsed as T;
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
