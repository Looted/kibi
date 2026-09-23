/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program. If not, see <https://www.gnu.org/licenses/>.
*/

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const WORKSPACE_ENV_KEYS = [
  "KIBI_WORKSPACE",
  "KIBI_PROJECT_ROOT",
  "KIBI_ROOT",
] as const;

/** Preferred project-local Kibi env file (harness-independent). */
// implements REQ-kibi-env-bootstrap
export const KIBI_PROJECT_ENV_FILE = ".env.kibi";

/** Legacy generic dotenv still loaded for compatibility only. */
// implements REQ-kibi-env-bootstrap
export const KIBI_LEGACY_ENV_FILE = ".env";

// implements REQ-kibi-env-bootstrap
export type EnvValueSource =
  | "process"
  | "project_env"
  | "user_env"
  | "legacy_env"
  | "missing";

// implements REQ-kibi-env-bootstrap
export type BootstrapKibiEnvironmentResult = Readonly<{
  workspaceRoot: string;
  userEnvPath: string;
  projectEnvPath: string;
  legacyEnvPath: string;
  /** Attribution for keys present after bootstrap (never includes secret values). */
  sources: Readonly<Record<string, EnvValueSource>>;
  keysLoadedFromUser: readonly string[];
  keysLoadedFromProject: readonly string[];
  keysLoadedFromLegacy: readonly string[];
}>;

// implements REQ-kibi-env-bootstrap
export type BootstrapKibiEnvironmentOptions = Readonly<{
  env?: NodeJS.ProcessEnv;
  startDir?: string;
  homedir?: string;
  /** Override XDG config home (defaults to env.XDG_CONFIG_HOME). */
  xdgConfigHome?: string;
  /**
   * Keys that were non-empty on the real process before any Kibi file load.
   * Callers normally omit this; the first default-env bootstrap remembers it.
   */
  initialNonEmptyProcessKeys?: ReadonlySet<string>;
}>;

type EnvEntry = Readonly<{ key: string; value: string }>;

/** Remembered pre-bootstrap non-empty process keys for default `process.env`. */
let rememberedInitialNonEmptyKeys: Set<string> | null = null;
/** Last bootstrap result for default `process.env` (doctor attribution). */
let lastDefaultBootstrap: BootstrapKibiEnvironmentResult | null = null;

/**
 * Test-only: clear remembered process-key snapshot and last bootstrap result.
 */
// implements REQ-kibi-env-bootstrap
export function resetKibiEnvironmentBootstrapStateForTests(): void {
  rememberedInitialNonEmptyKeys = null;
  lastDefaultBootstrap = null;
}

/**
 * Last bootstrap against the real `process.env`, if any.
 */
// implements REQ-kibi-env-bootstrap
export function getLastBootstrapResult(): BootstrapKibiEnvironmentResult | null {
  return lastDefaultBootstrap;
}

function readFirstEnv(
  env: NodeJS.ProcessEnv,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const value = env[key]?.trim();
    if (value) return value;
  }
  return null;
}

function nextAncestorDirectory(current: string): string | undefined {
  const parent = path.dirname(current);
  return parent === current ? undefined : parent;
}

function findUpwards(startDir: string, marker: string): string | null {
  let current: string | undefined = path.resolve(startDir);
  while (current !== undefined) {
    if (fs.existsSync(path.join(current, marker))) {
      return current;
    }
    current = nextAncestorDirectory(current);
  }
  return null;
}

/**
 * Canonical workspace root for Kibi env files and KB attachment.
 * Uses KIBI_WORKSPACE / KIBI_PROJECT_ROOT / KIBI_ROOT, then .kb / .git discovery.
 */
// implements REQ-kibi-env-bootstrap
export function resolveKibiWorkspaceRoot(
  startDir: string = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
): string {
  const envRoot = readFirstEnv(env, WORKSPACE_ENV_KEYS);
  if (envRoot) return path.resolve(envRoot);

  const kbRoot = findUpwards(startDir, ".kb");
  if (kbRoot) return kbRoot;

  const gitRoot = findUpwards(startDir, ".git");
  if (gitRoot) return gitRoot;

  return path.resolve(startDir);
}

// implements REQ-kibi-env-bootstrap
export function resolveEnvFilePath(
  envFileName: string,
  workspaceRoot: string,
): string {
  if (path.isAbsolute(envFileName)) return envFileName;
  return path.resolve(workspaceRoot, envFileName);
}

/** User-wide Kibi env file: $XDG_CONFIG_HOME/kibi/env or ~/.config/kibi/env. */
// implements REQ-kibi-env-bootstrap
export function resolveKibiUserEnvPath(
  options: Readonly<{
    homedir?: string;
    xdgConfigHome?: string;
    env?: NodeJS.ProcessEnv;
  }> = {},
): string {
  const env = options.env ?? process.env;
  const xdg =
    options.xdgConfigHome?.trim() ||
    env.XDG_CONFIG_HOME?.trim() ||
    path.join(options.homedir ?? os.homedir(), ".config");
  return path.join(xdg, "kibi", "env");
}

// implements REQ-kibi-env-bootstrap
export function resolveKibiProjectEnvPath(
  workspaceRoot: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const override = env.KIBI_ENV_FILE?.trim();
  if (override) return resolveEnvFilePath(override, workspaceRoot);
  return resolveEnvFilePath(KIBI_PROJECT_ENV_FILE, workspaceRoot);
}

// implements REQ-kibi-env-bootstrap
export function parseEnvContent(content: string): EnvEntry[] {
  const entries: EnvEntry[] = [];
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!key) continue;
    entries.push({ key, value });
  }
  return entries;
}

function readEnvFileEntries(filePath: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!fs.existsSync(filePath)) return map;
  try {
    for (const { key, value } of parseEnvContent(
      fs.readFileSync(filePath, "utf8"),
    )) {
      map.set(key, value);
    }
  } catch {
    // Unreadable files are treated as absent for bootstrap/inspect.
  }
  return map;
}

function nonEmpty(value: string | undefined): boolean {
  return typeof value === "string" && value.trim() !== "";
}

function snapshotNonEmptyKeys(env: NodeJS.ProcessEnv): Set<string> {
  return new Set(Object.keys(env).filter((key) => nonEmpty(env[key])));
}

function resolveInitialNonEmptyKeys(
  env: NodeJS.ProcessEnv,
  options: BootstrapKibiEnvironmentOptions,
  isDefaultEnv: boolean,
): Set<string> {
  if (options.initialNonEmptyProcessKeys) {
    return new Set(
      [...options.initialNonEmptyProcessKeys].filter((key) =>
        nonEmpty(env[key]),
      ),
    );
  }
  if (isDefaultEnv && rememberedInitialNonEmptyKeys) {
    // Only keys that remain non-empty stay process-owned across re-entry.
    return new Set(
      [...rememberedInitialNonEmptyKeys].filter((key) => nonEmpty(env[key])),
    );
  }
  const snapshot = snapshotNonEmptyKeys(env);
  if (isDefaultEnv) {
    rememberedInitialNonEmptyKeys = new Set(snapshot);
  }
  return snapshot;
}

/**
 * Load Kibi-owned env files into `process.env` (or an injectable env object).
 * Blank values are treated as unset (never applied, never overwrite).
 * Existing non-empty process keys are never overwritten. Project overrides user.
 * Legacy `.env` only gap-fills and is attributed as `legacy_env`.
 * Call only from CLI/MCP entrypoints — not on library import.
 */
// implements REQ-kibi-env-bootstrap
export function bootstrapKibiEnvironment(
  options: BootstrapKibiEnvironmentOptions = {},
): BootstrapKibiEnvironmentResult {
  const env = options.env ?? process.env;
  const isDefaultEnv = options.env === undefined;
  const workspaceRoot = resolveKibiWorkspaceRoot(options.startDir, env);

  if (
    isDefaultEnv &&
    lastDefaultBootstrap &&
    lastDefaultBootstrap.workspaceRoot !== workspaceRoot
  ) {
    // New workspace (e.g. doctor under KIBI_WORKSPACE): re-snapshot process keys.
    rememberedInitialNonEmptyKeys = null;
  }

  const userEnvPath = resolveKibiUserEnvPath({
    ...(options.homedir !== undefined ? { homedir: options.homedir } : {}),
    ...(options.xdgConfigHome !== undefined
      ? { xdgConfigHome: options.xdgConfigHome }
      : {}),
    env,
  });
  const projectEnvPath = resolveKibiProjectEnvPath(workspaceRoot, env);
  const legacyEnvPath = resolveEnvFilePath(KIBI_LEGACY_ENV_FILE, workspaceRoot);

  const initialNonEmpty = resolveInitialNonEmptyKeys(
    env,
    options,
    isDefaultEnv,
  );
  const sources: Record<string, EnvValueSource> = {};
  for (const key of initialNonEmpty) {
    sources[key] = "process";
  }

  const keysLoadedFromUser: string[] = [];
  const keysLoadedFromProject: string[] = [];
  const keysLoadedFromLegacy: string[] = [];

  const userEntries = readEnvFileEntries(userEnvPath);
  const projectEntries = readEnvFileEntries(projectEnvPath);
  const legacyEntries = readEnvFileEntries(legacyEnvPath);

  // User first, then project (project may overwrite user-sourced keys).
  // Blank file values are unset — never applied, never overwrite.
  for (const [key, value] of userEntries) {
    if (!nonEmpty(value)) continue;
    if (initialNonEmpty.has(key)) continue;
    if (!nonEmpty(env[key])) {
      env[key] = value;
      keysLoadedFromUser.push(key);
    }
    sources[key] = "user_env";
  }

  for (const [key, value] of projectEntries) {
    if (!nonEmpty(value)) continue;
    if (initialNonEmpty.has(key)) continue;
    const previousSource = sources[key];
    env[key] = value;
    if (
      previousSource !== "project_env" &&
      !keysLoadedFromProject.includes(key)
    ) {
      keysLoadedFromProject.push(key);
    }
    sources[key] = "project_env";
  }

  // Legacy .env fills only keys still unset (compatibility; not preferred).
  for (const [key, value] of legacyEntries) {
    if (!nonEmpty(value)) continue;
    if (initialNonEmpty.has(key)) continue;
    if (sources[key] === "user_env" || sources[key] === "project_env") {
      continue;
    }
    if (!nonEmpty(env[key])) {
      env[key] = value;
      keysLoadedFromLegacy.push(key);
    }
    sources[key] = "legacy_env";
  }

  const result: BootstrapKibiEnvironmentResult = {
    workspaceRoot,
    userEnvPath,
    projectEnvPath,
    legacyEnvPath,
    sources,
    keysLoadedFromUser,
    keysLoadedFromProject,
    keysLoadedFromLegacy,
  };

  if (isDefaultEnv) {
    lastDefaultBootstrap = result;
  }

  return result;
}

/**
 * Resolve a secret source label from an actual bootstrap result.
 * Never reconstructs attribution by re-reading files alone.
 */
// implements REQ-kibi-env-bootstrap
export function secretSourceFromBootstrap(
  key: string,
  bootstrap: BootstrapKibiEnvironmentResult,
  env: NodeJS.ProcessEnv = process.env,
): EnvValueSource {
  const attributed = bootstrap.sources[key];
  if (attributed) {
    return nonEmpty(env[key]) ? attributed : "missing";
  }
  return nonEmpty(env[key]) ? "process" : "missing";
}

// implements REQ-kibi-env-bootstrap
export type InspectSecretSourceOptions = BootstrapKibiEnvironmentOptions &
  Readonly<{
    /** @deprecated Prefer bootstrap result sources; kept for targeted tests. */
    initialProcessKeys?: ReadonlySet<string>;
  }>;

/**
 * Read-only secret attribution via a dry bootstrap on an env snapshot.
 * Prefer `secretSourceFromBootstrap` with the real entrypoint bootstrap result.
 * Never returns secret values.
 */
// implements REQ-kibi-env-bootstrap
export function inspectSecretSource(
  key: string,
  options: InspectSecretSourceOptions = {},
): EnvValueSource {
  if (
    options.env === undefined &&
    lastDefaultBootstrap &&
    !options.startDir &&
    !options.xdgConfigHome &&
    !options.homedir &&
    !options.initialNonEmptyProcessKeys &&
    !options.initialProcessKeys
  ) {
    return secretSourceFromBootstrap(key, lastDefaultBootstrap);
  }

  const envCopy: NodeJS.ProcessEnv = { ...(options.env ?? process.env) };
  const initial =
    options.initialNonEmptyProcessKeys ??
    options.initialProcessKeys ??
    (options.env === undefined && rememberedInitialNonEmptyKeys
      ? new Set(
          [...rememberedInitialNonEmptyKeys].filter((key) =>
            nonEmpty(envCopy[key]),
          ),
        )
      : snapshotNonEmptyKeys(envCopy));

  const result = bootstrapKibiEnvironment({
    ...options,
    env: envCopy,
    initialNonEmptyProcessKeys: initial,
  });
  return secretSourceFromBootstrap(key, result, envCopy);
}

/**
 * Whether a secret is available for provider use (non-empty after resolution).
 * Blank values are unset.
 */
// implements REQ-kibi-env-bootstrap
export function isSecretAvailable(
  key: string,
  options: InspectSecretSourceOptions = {},
): boolean {
  return inspectSecretSource(key, options) !== "missing";
}
