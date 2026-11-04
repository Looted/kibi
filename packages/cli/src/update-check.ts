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

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Command } from "commander";
import {
  CI_ENV_KEYS,
  TEST_ENV_KEYS,
  telemetryChannel,
  telemetryDirectory,
} from "kibi-agent-core/usage-telemetry";

/**
 * The update-available notice: the CLI asks the npm registry for the latest
 * kibi-cli at most once a day, in a detached background process, caches the
 * answer, and prints one line on stderr when the cached latest version is
 * newer than the running one. The registry request sends nothing about the
 * user or the project. `kibi doctor` reports the same answer for every host,
 * including agents whose commands never get a terminal.
 */

type Env = NodeJS.ProcessEnv;

export const UPDATE_CACHE_FILE = "update-check.json";
export const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const UPDATE_NOTICE_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const UPDATE_FETCH_TIMEOUT_MS = 5000;
export const DEFAULT_NPM_REGISTRY = "https://registry.npmjs.org";
const PACKAGE_NAME = "kibi-cli";

/** Commands other programs run for their own purposes, never a person. */
const UNNOTIFIED_COMMANDS = new Set(["engine", "merge-driver", "telemetry"]);

export interface UpdateCache {
  /** When the last registry check started (successful or not). */
  checkedAt?: string;
  /** The latest kibi-cli version the registry reported. */
  latest?: string;
  /** The KB schema that latest version writes, when it declares one. */
  latestKbSchema?: number | undefined;
  /** When a notice was last printed, and for which version. */
  notifiedAt?: string;
  notifiedVersion?: string;
}

/** `0`, `false`, `no` or `off`, in any case and with any padding. */
function isFalseFlag(value: string | undefined): boolean {
  return ["0", "false", "no", "off"].includes(
    String(value).trim().toLowerCase(),
  );
}

function automationName(env: Env, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const [name, expected] = key.split("=") as [string, string | undefined];
    const value = env[name]?.trim();
    if (!value) continue;
    if (expected !== undefined) {
      if (value === expected) return key;
      continue;
    }
    if (!isFalseFlag(value)) return name;
  }
  return undefined;
}

/** This module's file; the worker sits next to it with the same extension. */
const MODULE_FILE = fileURLToPath(import.meta.url);

// implements REQ-kibi-update-notice
/**
 * Why the update check is off, or undefined when it runs. `KIBI_UPDATE_CHECK=0`
 * and the common `NO_UPDATE_NOTIFIER` convention turn it off, and so do CI and
 * test runs and a Kibi source checkout (whose version is never on npm).
 */
export function updateCheckOffReason(
  env: Env = process.env,
  moduleFile: string | null = MODULE_FILE,
): string | undefined {
  if (isFalseFlag(env.KIBI_UPDATE_CHECK)) return "KIBI_UPDATE_CHECK=0";
  if (env.NO_UPDATE_NOTIFIER?.trim()) return "NO_UPDATE_NOTIFIER is set";
  const ci = automationName(env, CI_ENV_KEYS);
  if (ci) return `CI environment (${ci})`;
  const test = automationName(env, TEST_ENV_KEYS);
  if (test) return `test environment (${test})`;
  if (telemetryChannel(env, moduleFile).channel === "source") {
    return "Kibi source checkout";
  }
  return undefined;
}

// implements REQ-kibi-update-notice
export function updateCachePath(env: Env = process.env): string {
  return path.join(telemetryDirectory(env), UPDATE_CACHE_FILE);
}

// implements REQ-kibi-update-notice
export function readUpdateCache(env: Env = process.env): UpdateCache {
  try {
    const parsed: unknown = JSON.parse(
      String(fs.readFileSync(updateCachePath(env))),
    );
    return typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? (parsed as UpdateCache)
      : {};
  } catch {
    return {};
  }
}

// implements REQ-kibi-update-notice
/** Write the cache atomically, so a reader never sees a torn file. */
export function writeUpdateCache(
  cache: UpdateCache,
  env: Env = process.env,
): void {
  const file = updateCachePath(env);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(cache, null, 2)}\n`);
  fs.renameSync(temporary, file);
}

/** `[major, minor, patch]` of a release version; undefined for prereleases. */
function releaseParts(version: string): [number, number, number] | undefined {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  if (!match) return undefined;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

// implements REQ-kibi-update-notice
/**
 * Whether `latest` is a newer release than `current`. Prereleases and local
 * dev builds (`2.41.0-dev.abc`) on either side never count as an update.
 */
export function isNewerRelease(latest: string, current: string): boolean {
  const next = releaseParts(latest);
  const now = releaseParts(current);
  if (!next || !now) return false;
  const difference = next
    .map((part, index) => part - (now[index] as number))
    .find((delta) => delta !== 0);
  return (difference ?? 0) > 0;
}

function isDue(
  timestamp: string | undefined,
  intervalMs: number,
  now: number,
): boolean {
  const at = Date.parse(String(timestamp));
  // A missing, unreadable or future timestamp makes the check due.
  return !Number.isFinite(at) || at > now || now - at >= intervalMs;
}

// implements REQ-kibi-update-notice
export function updateCheckDue(
  cache: UpdateCache,
  now: number = Date.now(),
): boolean {
  return isDue(cache.checkedAt, UPDATE_CHECK_INTERVAL_MS, now);
}

function existsFile(file: string): boolean {
  return fs.statSync(file, { throwIfNoEntry: false })?.isFile() === true;
}

// implements REQ-kibi-update-notice
/**
 * The command that updates this install: the project's own package manager
 * for a project dependency, `npx kibi-cli@latest` for an npx cache, and a
 * global install otherwise.
 */
export function updateInstallCommand(
  moduleFile: string = MODULE_FILE,
  cwd: string = process.cwd(),
  fileExists: (file: string) => boolean = existsFile,
): string {
  const target = `${PACKAGE_NAME}@latest`;
  const file = moduleFile.replaceAll("\\", "/");
  if (file.includes("/_npx/")) return `npx ${target}`;
  if (file.includes("/.bun/install/global/")) return `bun add -g ${target}`;
  const project = /(.*)\/node_modules\/kibi-cli\//.exec(file);
  if (project) {
    const projectRoot = project[1] as string;
    const here = cwd.replaceAll("\\", "/");
    const inProject =
      here === projectRoot || here.startsWith(`${projectRoot}/`);
    // A global prefix has no lockfile; only a project root has one.
    const lockfiles: Array<[string, string]> = [
      ["bun.lock", `bun add -d ${target}`],
      ["bun.lockb", `bun add -d ${target}`],
      ["pnpm-lock.yaml", `pnpm add -D ${target}`],
      ["yarn.lock", `yarn add -D ${target}`],
      ["package-lock.json", `npm install -D ${target}`],
    ];
    if (inProject) {
      for (const [lockfile, command] of lockfiles) {
        if (fileExists(path.join(projectRoot, lockfile))) return command;
      }
    }
  }
  return `npm install -g ${target}`;
}

/** The KB schema the latest release writes, when it is newer than ours. */
function newerKbSchema(
  cache: UpdateCache,
  currentKbSchema: number,
): number | undefined {
  const schema = cache.latestKbSchema ?? 0;
  return schema > currentKbSchema ? schema : undefined;
}

// implements REQ-kibi-update-notice
/**
 * The one-line notice for a newer cached version, or null when the cache
 * names none. A newer KB schema is called out with the migrate step.
 */
export function formatUpdateNotice(input: {
  currentVersion: string;
  currentKbSchema: number;
  cache: UpdateCache;
  installCommand: string;
}): string | null {
  const latest = input.cache.latest;
  if (latest === undefined || !isNewerRelease(latest, input.currentVersion)) {
    return null;
  }
  const schema = newerKbSchema(input.cache, input.currentKbSchema);
  const schemaNote =
    schema !== undefined
      ? ` It moves the KB from schema ${input.currentKbSchema} to ${schema}; run 'kibi migrate' after updating.`
      : "";
  return `Kibi update available: kibi-cli ${input.currentVersion} -> ${latest}. Update with '${input.installCommand}'.${schemaNote} (KIBI_UPDATE_CHECK=0 turns this off)`;
}

// implements REQ-kibi-update-notice
export function registryUrl(env: Env = process.env): string {
  const configured =
    env.KIBI_UPDATE_REGISTRY?.trim() ||
    env.npm_config_registry?.trim() ||
    env.NPM_CONFIG_REGISTRY?.trim() ||
    DEFAULT_NPM_REGISTRY;
  return `${configured.replace(/\/+$/, "")}/${PACKAGE_NAME}/latest`;
}

// implements REQ-kibi-update-notice
/**
 * The latest version and its KB schema from a registry manifest, or
 * undefined when the manifest has no release version. kibi-cli declares the
 * KB schema it writes as `kibi.kbSchema` in its package.json.
 */
export function parseLatestManifest(
  value: unknown,
): { latest: string; latestKbSchema: number | undefined } | undefined {
  const record = (value ?? {}) as { version?: unknown; kibi?: unknown };
  if (typeof record.version !== "string" || !releaseParts(record.version)) {
    return undefined;
  }
  const kibi = record.kibi as { kbSchema?: unknown } | null | undefined;
  const schema =
    kibi !== null && typeof kibi === "object" ? kibi.kbSchema : undefined;
  return {
    latest: record.version,
    latestKbSchema: Number.isInteger(schema) ? (schema as number) : undefined,
  };
}

// implements REQ-kibi-update-notice
/**
 * Ask the registry for the latest kibi-cli and store the answer. Returns the
 * updated cache; a failed request keeps the previous answer. Never throws.
 */
export async function refreshUpdateCache(
  env: Env,
  options: {
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
    now?: number;
  },
): Promise<UpdateCache> {
  const now = options.now ?? Date.now();
  const previous = readUpdateCache(env);
  const next: UpdateCache = {
    ...previous,
    checkedAt: new Date(now).toISOString(),
  };
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? UPDATE_FETCH_TIMEOUT_MS,
  );
  // rationale: unref only lets a process exit before the timeout fires, which
  // no test can observe from inside that process.
  // Stryker disable next-line CallExpression
  timer.unref();
  try {
    const response = await (options.fetchImpl ?? globalThis.fetch)(
      registryUrl(env),
      {
        headers: { accept: "application/json" },
        signal: controller.signal,
      },
    );
    Object.assign(
      next,
      response.ok ? parseLatestManifest(await response.json()) : undefined,
    );
  } catch {
    // Offline, blocked or slow registry: try again after the next interval.
  }
  // rationale: the timer is unref'd and aborting a settled request does
  // nothing, so clearing it early is not observable.
  // Stryker disable next-line CallExpression
  clearTimeout(timer);
  try {
    writeUpdateCache(next, env);
  } catch {
    // An unwritable state directory only means the next run asks again.
  }
  return next;
}

/** Run this module with this argument to refresh the cache and exit. */
export const UPDATE_REFRESH_ARGUMENT = "--kibi-update-refresh";

// implements REQ-kibi-update-notice
/**
 * Start the refresh in a detached process, so the command exits without
 * waiting on the network. A process that fails to start is ignored; the next
 * due run tries again.
 */
// rationale: detaching, hiding and unref'ing the child are properties of the
// operating-system process that no test can observe; the worker test checks
// that the process runs and writes the cache.
// Stryker disable all
export function spawnUpdateRefresh(env: Env = process.env): void {
  const child = spawn(
    process.execPath,
    [MODULE_FILE, UPDATE_REFRESH_ARGUMENT],
    {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
      env,
    },
  );
  child.on("error", () => {
    // Best effort: the next due run tries again.
  });
  child.unref();
}
// Stryker restore all

export interface UpdateCommandContext {
  readonly commandPath: string | undefined;
  /** The command prints JSON for a program (`--json`, `--format json`, `--input`). */
  readonly machineOutput: boolean;
}

// implements REQ-kibi-update-notice
/** Whether a command's options ask for machine-readable output. */
export function hasMachineOutput(options: Record<string, unknown>): boolean {
  return (
    options.json === true ||
    options.format === "json" ||
    options.input !== undefined
  );
}

// implements REQ-kibi-update-notice
/** Remember the command that ran and whether it prints JSON for a program. */
export function trackUpdateCommand(
  program: Command,
): () => UpdateCommandContext {
  let context: UpdateCommandContext = {
    commandPath: undefined,
    machineOutput: false,
  };
  program.hook("preAction", (_root, actionCommand) => {
    const names: string[] = [];
    let current = actionCommand;
    while (current.parent) {
      names.unshift(current.name());
      current = current.parent;
    }
    context = {
      commandPath: names.join(" "),
      machineOutput: hasMachineOutput(actionCommand.opts()),
    };
  });
  return () => context;
}

// implements REQ-kibi-update-notice
/**
 * At the end of a CLI command: print the notice when the cache names a newer
 * version (at most once a day per version), and start a background refresh
 * when the last check is a day old. Only a person at a terminal sees it:
 * stderr must be a TTY, and JSON output, CI, tests and opt-outs stay silent.
 */
export function finishUpdateCheck(input: {
  readonly context: UpdateCommandContext;
  readonly currentVersion: string;
  readonly currentKbSchema: number;
  readonly env?: Env;
  readonly stderrIsTTY?: boolean;
  readonly now?: number;
  readonly moduleFile?: string;
  readonly write?: (line: string) => void;
  readonly startRefresh?: (env: Env) => void;
  readonly installCommand?: () => string;
}): string | null {
  const env = input.env ?? process.env;
  const command = input.context.commandPath;
  if (!command || UNNOTIFIED_COMMANDS.has(command.split(" ")[0] as string)) {
    return null;
  }
  if (input.context.machineOutput) return null;
  if (!(input.stderrIsTTY ?? process.stderr.isTTY)) return null;
  const moduleFile = input.moduleFile ?? MODULE_FILE;
  if (updateCheckOffReason(env, moduleFile) !== undefined) return null;
  if (!releaseParts(input.currentVersion)) return null;
  const now = input.now ?? Date.now();
  let cache = readUpdateCache(env);
  if (updateCheckDue(cache, now)) {
    cache = { ...cache, checkedAt: new Date(now).toISOString() };
    try {
      // Recorded first, so concurrent commands start one refresh, not many.
      writeUpdateCache(cache, env);
      (input.startRefresh ?? spawnUpdateRefresh)(env);
    } catch {
      // No writable state directory: stay quiet rather than ask every run.
    }
  }
  const notice = formatUpdateNotice({
    currentVersion: input.currentVersion,
    currentKbSchema: input.currentKbSchema,
    cache,
    installCommand: (
      input.installCommand ?? (() => updateInstallCommand(moduleFile))
    )(),
  });
  if (
    notice === null ||
    (cache.notifiedVersion === cache.latest &&
      !isDue(cache.notifiedAt, UPDATE_NOTICE_INTERVAL_MS, now))
  ) {
    return null;
  }
  try {
    writeUpdateCache(
      {
        ...cache,
        notifiedAt: new Date(now).toISOString(),
        notifiedVersion: cache.latest as string,
      },
      env,
    );
  } catch {
    // Without a writable cache the notice would repeat on every run.
    return null;
  }
  (input.write ?? ((line) => process.stderr.write(`${line}\n`)))(notice);
  return notice;
}

export interface UpdateDoctorResult {
  passed: true;
  warning?: boolean;
  message: string;
  remediation?: string;
  details: Record<string, unknown>;
}

// implements REQ-kibi-update-notice
/**
 * The `kibi doctor` row: whether a newer kibi-cli is published. Uses the
 * cached answer when it is under a day old and asks the registry otherwise.
 * A newer version is a warning, never a failure; offline is neither.
 */
export async function checkKibiUpdates(input: {
  readonly currentVersion: string;
  readonly currentKbSchema: number;
  readonly env?: Env;
  readonly now?: number;
  readonly moduleFile?: string;
  readonly fetchImpl?: typeof fetch;
  readonly installCommand?: () => string;
}): Promise<UpdateDoctorResult> {
  const env = input.env ?? process.env;
  const moduleFile = input.moduleFile ?? MODULE_FILE;
  const off = updateCheckOffReason(env, moduleFile);
  if (off !== undefined) {
    return {
      passed: true,
      message: `Update check off: ${off}`,
      details: { enabled: false, reason: off, current: input.currentVersion },
    };
  }
  const now = input.now ?? Date.now();
  let cache = readUpdateCache(env);
  if (updateCheckDue(cache, now) || cache.latest === undefined) {
    cache = await refreshUpdateCache(env, {
      ...(input.fetchImpl ? { fetchImpl: input.fetchImpl } : {}),
      timeoutMs: 3000,
      now,
    });
  }
  const details = {
    enabled: true,
    current: input.currentVersion,
    latest: cache.latest ?? null,
    latestKbSchema: cache.latestKbSchema ?? null,
    checkedAt: cache.checkedAt ?? null,
  };
  if (cache.latest === undefined) {
    return {
      passed: true,
      message: "Could not reach the npm registry to check for a newer kibi-cli",
      details,
    };
  }
  if (!isNewerRelease(cache.latest, input.currentVersion)) {
    return {
      passed: true,
      message: `kibi-cli ${input.currentVersion} is up to date (latest ${cache.latest})`,
      details,
    };
  }
  const schema = newerKbSchema(cache, input.currentKbSchema);
  const schemaNote =
    schema !== undefined
      ? ` (KB schema ${input.currentKbSchema} -> ${schema})`
      : "";
  const install = (
    input.installCommand ?? (() => updateInstallCommand(moduleFile))
  )();
  return {
    passed: true,
    warning: true,
    message: `kibi-cli ${cache.latest} is available; ${input.currentVersion} is installed${schemaNote}`,
    remediation:
      schemaNote === ""
        ? `Run '${install}', and update kibi-mcp and the other Kibi packages to the same release.`
        : `Run '${install}', update kibi-mcp and the other Kibi packages to the same release, then run 'kibi migrate'.`,
    details,
  };
}

// implements REQ-kibi-update-notice
/**
 * The detached background process spawnUpdateRefresh starts: when this
 * module runs with the refresh argument, make one registry request, write
 * the cache, then exit. Returns whether it refreshed.
 */
export async function runUpdateRefreshEntrypoint(
  argv: readonly string[] = process.argv,
  env: Env = process.env,
): Promise<boolean> {
  if (argv[1] !== MODULE_FILE || argv[2] !== UPDATE_REFRESH_ARGUMENT) {
    return false;
  }
  await refreshUpdateCache(env, {});
  return true;
}

await runUpdateRefreshEntrypoint();
