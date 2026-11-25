import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";

/**
 * How hard Kibi holds the agent to its requirements.
 *
 * - `remember`: Kibi records requirements, links them to code and checks
 *   them for contradictions, but asks for no scenarios, tests or proofs.
 * - `test`: Kibi also asks for the scenarios and linked tests that show each
 *   requirement holds, and blocks commits that leave them out.
 */
export type KibiLevel = "remember" | "test";

export const KIBI_LEVELS: readonly KibiLevel[] = ["remember", "test"];

/** The level of a project that does not set one. */
export const DEFAULT_KIBI_LEVEL: KibiLevel = "test";

export type KibiLevelSource = "package.json" | "setup.json" | "default";

export type ResolvedKibiLevel = {
  readonly level: KibiLevel;
  readonly source: KibiLevelSource;
  /** The recorded value when it is not a known level; the level is then the default. */
  readonly invalid?: unknown;
};

export function isKibiLevel(value: unknown): value is KibiLevel {
  return value === "remember" || value === "test";
}

function readJson(file: string): unknown {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    // A missing or malformed file records no level.
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resolved(value: unknown, source: KibiLevelSource): ResolvedKibiLevel {
  if (value === undefined)
    return { level: DEFAULT_KIBI_LEVEL, source: "default" };
  if (isKibiLevel(value)) return { level: value, source };
  return { level: DEFAULT_KIBI_LEVEL, source, invalid: value };
}

/**
 * The project's Kibi level: `kibi.level` in the root package.json, or
 * `level` in `.kb/setup.json` when the project has no root package.json.
 * A project that sets neither is at `test`.
 */
export function readKibiLevel(workspaceRoot: string): ResolvedKibiLevel {
  const packagePath = path.join(workspaceRoot, "package.json");
  if (existsSync(packagePath)) {
    const manifest = readJson(packagePath);
    const kibi = isRecord(manifest) ? manifest.kibi : undefined;
    return resolved(isRecord(kibi) ? kibi.level : undefined, "package.json");
  }
  const setup = readJson(path.join(workspaceRoot, ".kb", "setup.json"));
  return resolved(isRecord(setup) ? setup.level : undefined, "setup.json");
}

/** Where a project records its level, for messages that name the setting. */
export function kibiLevelSettingName(workspaceRoot: string): string {
  return existsSync(path.join(workspaceRoot, "package.json"))
    ? "kibi.level in package.json"
    : "level in .kb/setup.json";
}
