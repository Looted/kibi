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
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
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
// implements REQ-cli-doctor
export const KIBI_PROJECT_ENV_FILE = ".env.kibi";

/** Legacy generic dotenv still loaded for compatibility only. */
// implements REQ-cli-doctor
export const KIBI_LEGACY_ENV_FILE = ".env";

// implements REQ-cli-doctor
export type EnvValueSource =
  | "process"
  | "project_env"
  | "user_env"
  | "missing";

// implements REQ-cli-doctor
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

// implements REQ-cli-doctor
export type BootstrapKibiEnvironmentOptions = Readonly<{
  env?: NodeJS.ProcessEnv;
  startDir?: string;
  homedir?: string;
  /** Override XDG config home (defaults to env.XDG_CONFIG_HOME). */
  xdgConfigHome?: string;
}>;

type EnvEntry = Readonly<{ key: string; value: string }>;

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
// implements REQ-cli-doctor
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

// implements REQ-cli-doctor
export function resolveEnvFilePath(
  envFileName: string,
  workspaceRoot: string,
): string {
  if (path.isAbsolute(envFileName)) return envFileName;
  return path.resolve(workspaceRoot, envFileName);
}

/** User-wide Kibi env file: $XDG_CONFIG_HOME/kibi/env or ~/.config/kibi/env. */
// implements REQ-cli-doctor
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

// implements REQ-cli-doctor
export function resolveKibiProjectEnvPath(
  workspaceRoot: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const override = env.KIBI_ENV_FILE?.trim();
  if (override) return resolveEnvFilePath(override, workspaceRoot);
  return resolveEnvFilePath(KIBI_PROJECT_ENV_FILE, workspaceRoot);
}

// implements REQ-cli-doctor
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

function processOwnsKey(env: NodeJS.ProcessEnv, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(env, key);
}

function nonEmpty(value: string | undefined): boolean {
  return typeof value === "string" && value.trim() !== "";
}

/**
 * Load Kibi-owned env files into `process.env` (or an injectable env object).
 * Existing process keys are never overwritten. Project file overrides user file.
 * Call only from CLI/MCP entrypoints — not on library import.
 */
// implements REQ-002
export function bootstrapKibiEnvironment(
  options: BootstrapKibiEnvironmentOptions = {},
): BootstrapKibiEnvironmentResult {
  const env = options.env ?? process.env;
  const workspaceRoot = resolveKibiWorkspaceRoot(options.startDir, env);
  const userEnvPath = resolveKibiUserEnvPath({
    ...(options.homedir !== undefined ? { homedir: options.homedir } : {}),
    ...(options.xdgConfigHome !== undefined
      ? { xdgConfigHome: options.xdgConfigHome }
      : {}),
    env,
  });
  const projectEnvPath = resolveKibiProjectEnvPath(workspaceRoot, env);
  const legacyEnvPath = resolveEnvFilePath(KIBI_LEGACY_ENV_FILE, workspaceRoot);

  const initialKeys = new Set(Object.keys(env));
  const sources: Record<string, EnvValueSource> = {};
  for (const key of initialKeys) {
    if (nonEmpty(env[key])) sources[key] = "process";
  }

  const keysLoadedFromUser: string[] = [];
  const keysLoadedFromProject: string[] = [];
  const keysLoadedFromLegacy: string[] = [];

  // User first, then project (project may overwrite user-sourced keys).
  for (const [key, value] of readEnvFileEntries(userEnvPath)) {
    if (initialKeys.has(key)) continue;
    if (processOwnsKey(env, key)) continue;
    env[key] = value;
    sources[key] = "user_env";
    keysLoadedFromUser.push(key);
  }

  for (const [key, value] of readEnvFileEntries(projectEnvPath)) {
    if (initialKeys.has(key)) continue;
    if (sources[key] === "process") continue;
    // Project overrides user-sourced keys; never pre-bootstrap process keys.
    env[key] = value;
    sources[key] = "project_env";
    keysLoadedFromProject.push(key);
  }

  // Legacy .env fills only keys still unset (compatibility; not preferred).
  // Attribution uses `process` under the four-label contract so doctor still
  // treats the secret as available without recommending generic `.env`.
  for (const [key, value] of readEnvFileEntries(legacyEnvPath)) {
    if (initialKeys.has(key)) continue;
    if (processOwnsKey(env, key)) continue;
    env[key] = value;
    sources[key] = "process";
    keysLoadedFromLegacy.push(key);
  }

  return {
    workspaceRoot,
    userEnvPath,
    projectEnvPath,
    legacyEnvPath,
    sources,
    keysLoadedFromUser,
    keysLoadedFromProject,
    keysLoadedFromLegacy,
  };
}

// implements REQ-cli-doctor
export type InspectSecretSourceOptions = BootstrapKibiEnvironmentOptions &
  Readonly<{
    /** Keys that must be treated as process-owned (pre-bootstrap snapshot). */
    initialProcessKeys?: ReadonlySet<string>;
  }>;

/**
 * Read-only secret attribution. Never returns secret values.
 * Project file wins over user file when both define the key.
 */
// implements REQ-cli-doctor
export function inspectSecretSource(
  key: string,
  options: InspectSecretSourceOptions = {},
): EnvValueSource {
  const env = options.env ?? process.env;
  const workspaceRoot = resolveKibiWorkspaceRoot(options.startDir, env);
  const userEnvPath = resolveKibiUserEnvPath({
    ...(options.homedir !== undefined ? { homedir: options.homedir } : {}),
    ...(options.xdgConfigHome !== undefined
      ? { xdgConfigHome: options.xdgConfigHome }
      : {}),
    env,
  });
  const projectEnvPath = resolveKibiProjectEnvPath(workspaceRoot, env);
  const legacyEnvPath = resolveEnvFilePath(KIBI_LEGACY_ENV_FILE, workspaceRoot);
  const project = readEnvFileEntries(projectEnvPath);
  const user = readEnvFileEntries(userEnvPath);
  const legacy = readEnvFileEntries(legacyEnvPath);

  if (options.initialProcessKeys?.has(key) && nonEmpty(env[key])) {
    return "process";
  }

  // Preferred Kibi files (project overrides user for attribution).
  if (nonEmpty(project.get(key))) return "project_env";
  if (nonEmpty(user.get(key))) return "user_env";

  // Harness-injected or legacy-compat value already on the process.
  if (nonEmpty(env[key])) return "process";
  if (nonEmpty(legacy.get(key))) return "process";
  return "missing";
}

/**
 * Whether a secret is available for provider use (non-empty after resolution).
 */
// implements REQ-cli-doctor
export function isSecretAvailable(
  key: string,
  options: InspectSecretSourceOptions = {},
): boolean {
  return inspectSecretSource(key, options) !== "missing";
}
