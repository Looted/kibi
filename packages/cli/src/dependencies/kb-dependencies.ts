/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

// implements REQ-kb-dependencies-git
/**
 * KB dependencies: read another repository's knowledge base, read-only, at a
 * pinned commit.
 *
 * A project names the repositories it depends on in `.kb/dependencies.json`
 * and pins each one to a commit in `.kb/dependencies.lock.json`. A locked
 * dependency is fetched once into a shared cache as a detached checkout of
 * that commit. Reads are then answered by that checkout's own read-only
 * snapshot store, so a dependency is never compiled into, written through or
 * slowed down by the project's own KB, and each project moves its pins when
 * it chooses.
 */

import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { LATEST_KB_SCHEMA_VERSION } from "../utils/schema-version.js";

/** Workspace-relative path of the authored dependency list. */
export const KB_DEPENDENCIES_PATH = ".kb/dependencies.json";
/** Workspace-relative path of the dependency lock. */
export const KB_DEPENDENCIES_LOCK_PATH = ".kb/dependencies.lock.json";
export const KB_DEPENDENCIES_VERSION = 1;
export const KB_DEPENDENCIES_LOCK_VERSION = 1;
/** Oldest KB schema a dependency may carry; older KBs must migrate first. */
export const KB_DEPENDENCY_MIN_SCHEMA_VERSION = 6;
/** Environment variable that relocates the shared dependency cache. */
export const KB_DEPENDENCY_CACHE_ENV = "KIBI_DEPENDENCY_CACHE";

const NAME_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const COMMIT_PATTERN = /^[0-9a-f]{40}([0-9a-f]{24})?$/;
const CHECKOUT_MARKER = "kibi-dependency.json";

export type KbDependencyErrorCode =
  | "DEPENDENCIES_INVALID"
  | "DEPENDENCY_UNKNOWN"
  | "DEPENDENCY_NOT_LOCKED"
  | "DEPENDENCY_LOCK_STALE"
  | "DEPENDENCY_REF_NOT_FOUND"
  | "DEPENDENCY_FETCH_FAILED"
  | "DEPENDENCY_NOT_A_KB"
  | "DEPENDENCY_SCHEMA_UNSUPPORTED";

export class KbDependencyError extends Error {
  readonly code: KbDependencyErrorCode;
  constructor(code: KbDependencyErrorCode, message: string) {
    super(message);
    this.name = "KbDependencyError";
    this.code = code;
  }
}

/** One dependency as authored in `.kb/dependencies.json`. */
export interface KbDependencySpec {
  readonly name: string;
  /** Git URL or local path of the repository. */
  readonly git: string;
  /** Tag, branch or commit to pin; the remote HEAD when absent. */
  readonly ref?: string;
  /** Subdirectory of the repository that holds the Kibi workspace. */
  readonly directory?: string;
}

/** One pinned dependency in `.kb/dependencies.lock.json`. */
export interface KbDependencyLockEntry {
  readonly git: string;
  readonly ref?: string;
  readonly directory?: string;
  readonly commit: string;
  readonly kbSchema: number;
}

export type KbDependencyLock = Readonly<Record<string, KbDependencyLockEntry>>;

/** Run git and return its stdout; throws on a non-zero exit. */
export type GitRunner = (args: readonly string[], cwd?: string) => string;

export const defaultGitRunner: GitRunner = (args, cwd) =>
  execFileSync("git", [...args], {
    ...(cwd !== undefined ? { cwd } : {}),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 300_000,
    // A credential prompt would hang an agent or CI forever.
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });

export interface KbDependencyOptions {
  readonly git?: GitRunner;
  readonly env?: NodeJS.ProcessEnv;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalText(
  source: Record<string, unknown>,
  key: string,
  where: string,
): string | undefined {
  const value = source[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new KbDependencyError(
      "DEPENDENCIES_INVALID",
      `${where}: '${key}' must be a non-empty string.`,
    );
  }
  return value.trim();
}

function safeDirectory(
  value: string | undefined,
  where: string,
): string | undefined {
  if (value === undefined) return undefined;
  const normalized = path.posix.normalize(value.replaceAll("\\", "/"));
  if (
    path.posix.isAbsolute(normalized) ||
    normalized === ".." ||
    normalized.startsWith("../")
  ) {
    throw new KbDependencyError(
      "DEPENDENCIES_INVALID",
      `${where}: 'directory' must be a path inside the repository, got '${value}'.`,
    );
  }
  return normalized === "." ? undefined : normalized.replace(/\/$/, "");
}

function readJson(file: string, label: string): unknown {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new KbDependencyError(
      "DEPENDENCIES_INVALID",
      `${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * The dependencies a workspace declares, sorted by name. A workspace without
 * `.kb/dependencies.json` has none.
 */
export function readKbDependencies(workspaceRoot: string): KbDependencySpec[] {
  const file = path.join(workspaceRoot, KB_DEPENDENCIES_PATH);
  if (!existsSync(file)) return [];
  const parsed = readJson(file, KB_DEPENDENCIES_PATH);
  if (
    !isRecord(parsed) ||
    parsed.version !== KB_DEPENDENCIES_VERSION ||
    !isRecord(parsed.dependencies)
  ) {
    throw new KbDependencyError(
      "DEPENDENCIES_INVALID",
      `${KB_DEPENDENCIES_PATH} must be {"version": ${KB_DEPENDENCIES_VERSION}, "dependencies": {"<name>": {"git": "<url>", "ref": "<tag, branch or commit>"}}}.`,
    );
  }
  return Object.entries(parsed.dependencies)
    .map(([name, raw]) => {
      const where = `${KB_DEPENDENCIES_PATH} dependency '${name}'`;
      if (!NAME_PATTERN.test(name)) {
        throw new KbDependencyError(
          "DEPENDENCIES_INVALID",
          `${where}: names use lowercase letters, digits, '.', '_' and '-' (at most 64 characters).`,
        );
      }
      if (!isRecord(raw)) {
        throw new KbDependencyError(
          "DEPENDENCIES_INVALID",
          `${where}: expected an object with a 'git' URL.`,
        );
      }
      const git = optionalText(raw, "git", where);
      if (git === undefined) {
        throw new KbDependencyError(
          "DEPENDENCIES_INVALID",
          `${where}: 'git' is required (a repository URL or path).`,
        );
      }
      const ref = optionalText(raw, "ref", where);
      const directory = safeDirectory(
        optionalText(raw, "directory", where),
        where,
      );
      return {
        name,
        git,
        ...(ref !== undefined ? { ref } : {}),
        ...(directory !== undefined ? { directory } : {}),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

/** The pinned dependencies of a workspace; empty without a lock file. */
export function readKbDependencyLock(workspaceRoot: string): KbDependencyLock {
  const file = path.join(workspaceRoot, KB_DEPENDENCIES_LOCK_PATH);
  if (!existsSync(file)) return {};
  const parsed = readJson(file, KB_DEPENDENCIES_LOCK_PATH);
  if (
    !isRecord(parsed) ||
    parsed.lockVersion !== KB_DEPENDENCIES_LOCK_VERSION ||
    !isRecord(parsed.dependencies)
  ) {
    throw new KbDependencyError(
      "DEPENDENCIES_INVALID",
      `${KB_DEPENDENCIES_LOCK_PATH} is not a version ${KB_DEPENDENCIES_LOCK_VERSION} lock; run 'kibi deps lock' to rewrite it.`,
    );
  }
  const lock: Record<string, KbDependencyLockEntry> = {};
  for (const [name, raw] of Object.entries(parsed.dependencies)) {
    if (
      !isRecord(raw) ||
      typeof raw.git !== "string" ||
      typeof raw.commit !== "string" ||
      !COMMIT_PATTERN.test(raw.commit) ||
      typeof raw.kbSchema !== "number"
    ) {
      throw new KbDependencyError(
        "DEPENDENCIES_INVALID",
        `${KB_DEPENDENCIES_LOCK_PATH} entry '${name}' is malformed; run 'kibi deps lock --update ${name}'.`,
      );
    }
    lock[name] = {
      git: raw.git,
      ...(typeof raw.ref === "string" ? { ref: raw.ref } : {}),
      ...(typeof raw.directory === "string"
        ? { directory: raw.directory }
        : {}),
      commit: raw.commit,
      kbSchema: raw.kbSchema,
    };
  }
  return lock;
}

/** Write the lock with sorted names so it diffs and merges cleanly. */
export function writeKbDependencyLock(
  workspaceRoot: string,
  lock: KbDependencyLock,
): void {
  const dependencies = Object.fromEntries(
    Object.keys(lock)
      .sort()
      .map((name) => [name, lock[name]]),
  );
  const file = path.join(workspaceRoot, KB_DEPENDENCIES_LOCK_PATH);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(
    file,
    `${JSON.stringify({ lockVersion: KB_DEPENDENCIES_LOCK_VERSION, dependencies }, null, 2)}\n`,
  );
}

/** Whether a lock entry still pins what the dependency list asks for. */
export function lockEntryMatches(
  spec: KbDependencySpec,
  entry: KbDependencyLockEntry | undefined,
): boolean {
  return (
    entry !== undefined &&
    entry.git === spec.git &&
    entry.ref === spec.ref &&
    entry.directory === spec.directory
  );
}

/**
 * Resolve a tag, branch or other ref of a repository to a commit. A full
 * commit id is taken as is; a tag resolves to the commit it points at.
 */
export function resolveGitRef(
  url: string,
  ref: string | undefined,
  git: GitRunner = defaultGitRunner,
): string {
  const wanted = ref ?? "HEAD";
  if (COMMIT_PATTERN.test(wanted)) return wanted;
  let output: string;
  try {
    // Patterns match by suffix; the peeled `^{}` line of an annotated tag
    // is only listed when asked for.
    output = git(["ls-remote", url, wanted, `${wanted}^{}`]);
  } catch (error) {
    throw new KbDependencyError(
      "DEPENDENCY_FETCH_FAILED",
      `Could not list refs of ${url}: ${gitErrorText(error)}`,
    );
  }
  const refs = new Map<string, string>();
  for (const line of output.split("\n")) {
    const [commit, name] = line.trim().split(/\s+/);
    if (commit && name) refs.set(name, commit);
  }
  const candidates = wanted.startsWith("refs/")
    ? [`${wanted}^{}`, wanted]
    : [
        `refs/tags/${wanted}^{}`,
        `refs/tags/${wanted}`,
        `refs/heads/${wanted}`,
        wanted,
      ];
  for (const candidate of candidates) {
    const commit = refs.get(candidate);
    if (commit !== undefined) return commit;
  }
  throw new KbDependencyError(
    "DEPENDENCY_REF_NOT_FOUND",
    `${url} has no tag, branch or ref named '${wanted}'.`,
  );
}

function gitErrorText(error: unknown): string {
  const stderr = (error as { stderr?: unknown }).stderr;
  const text =
    typeof stderr === "string" && stderr.trim().length > 0
      ? stderr
      : error instanceof Error
        ? error.message
        : String(error);
  return text.trim().split("\n").slice(-3).join(" ");
}

/** Root of the shared, per-user cache of dependency checkouts. */
export function kbDependencyCacheRoot(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const override = env[KB_DEPENDENCY_CACHE_ENV]?.trim();
  if (override) return path.resolve(override);
  const xdg = env.XDG_CACHE_HOME?.trim();
  if (xdg) return path.join(xdg, "kibi", "dependencies");
  return path.join(os.homedir(), ".cache", "kibi", "dependencies");
}

/**
 * Cache location of one repository at one commit. The directory depends only
 * on the repository URL and the commit, so projects pinning the same commit
 * share one checkout and one compiled store.
 */
export function kbDependencyCheckoutPath(
  cacheRoot: string,
  url: string,
  commit: string,
): string {
  const label =
    path
      .basename(url.replace(/\/+$/, ""))
      .replace(/\.git$/, "")
      .replace(/[^A-Za-z0-9._-]/g, "-")
      .slice(0, 40) || "repo";
  const urlKey = createHash("sha256").update(url).digest("hex").slice(0, 12);
  return path.join(cacheRoot, `${label}-${urlKey}`, commit);
}

function checkoutIsComplete(
  checkout: string,
  url: string,
  commit: string,
): boolean {
  try {
    const marker = JSON.parse(
      readFileSync(path.join(checkout, ".git", CHECKOUT_MARKER), "utf8"),
    ) as { git?: unknown; commit?: unknown };
    return marker.git === url && marker.commit === commit;
  } catch {
    return false;
  }
}

/**
 * Fetch one commit of a repository into the cache as a detached checkout,
 * once. The checkout is built under a temporary name and renamed into place,
 * so a reader never sees a half-written one.
 */
export function materializeKbDependency(
  url: string,
  commit: string,
  options: KbDependencyOptions = {},
): string {
  const git = options.git ?? defaultGitRunner;
  const checkout = kbDependencyCheckoutPath(
    kbDependencyCacheRoot(options.env),
    url,
    commit,
  );
  if (checkoutIsComplete(checkout, url, commit)) return checkout;
  mkdirSync(path.dirname(checkout), { recursive: true });
  const staging = `${checkout}.tmp-${process.pid}-${randomBytes(4).toString("hex")}`;
  try {
    git(["init", "-q", staging]);
    try {
      git(["fetch", "-q", "--depth", "1", url, commit], staging);
    } catch {
      // Servers that refuse a fetch by commit id still serve its history.
      try {
        git(
          [
            "fetch",
            "-q",
            url,
            "+refs/heads/*:refs/remotes/origin/*",
            "+refs/tags/*:refs/tags/*",
          ],
          staging,
        );
      } catch (error) {
        throw new KbDependencyError(
          "DEPENDENCY_FETCH_FAILED",
          `Could not fetch ${url}: ${gitErrorText(error)}`,
        );
      }
    }
    try {
      git(
        [
          "-c",
          "advice.detachedHead=false",
          "checkout",
          "-q",
          "--detach",
          commit,
        ],
        staging,
      );
    } catch (error) {
      throw new KbDependencyError(
        "DEPENDENCY_FETCH_FAILED",
        `${url} does not contain commit ${commit}: ${gitErrorText(error)}`,
      );
    }
    writeFileSync(
      path.join(staging, ".git", CHECKOUT_MARKER),
      `${JSON.stringify({ git: url, commit }, null, 2)}\n`,
    );
    try {
      renameSync(staging, checkout);
    } catch (error) {
      // Another process finished the same checkout first.
      if (!checkoutIsComplete(checkout, url, commit)) throw error;
    }
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
  return checkout;
}

/** The KB schema of a fetched dependency, checked against what Kibi reads. */
export function readDependencySchema(
  name: string,
  workspaceRoot: string,
): number {
  const manifestPath = path.join(workspaceRoot, ".kb", "manifest.json");
  let schemaVersion: unknown;
  try {
    schemaVersion = (
      JSON.parse(readFileSync(manifestPath, "utf8")) as {
        schemaVersion?: unknown;
      }
    ).schemaVersion;
  } catch {
    throw new KbDependencyError(
      "DEPENDENCY_NOT_A_KB",
      `Dependency '${name}' has no Kibi knowledge base (.kb/manifest.json) at the pinned commit; set 'directory' if it lives in a subdirectory.`,
    );
  }
  if (typeof schemaVersion !== "number" || !Number.isInteger(schemaVersion)) {
    throw new KbDependencyError(
      "DEPENDENCY_NOT_A_KB",
      `Dependency '${name}' has no valid schemaVersion in .kb/manifest.json.`,
    );
  }
  if (schemaVersion < KB_DEPENDENCY_MIN_SCHEMA_VERSION) {
    throw new KbDependencyError(
      "DEPENDENCY_SCHEMA_UNSUPPORTED",
      `Dependency '${name}' carries KB schema ${schemaVersion}; Kibi reads dependencies from schema ${KB_DEPENDENCY_MIN_SCHEMA_VERSION}. Pin a newer commit, or run 'kibi migrate' in that repository.`,
    );
  }
  if (schemaVersion > LATEST_KB_SCHEMA_VERSION) {
    throw new KbDependencyError(
      "DEPENDENCY_SCHEMA_UNSUPPORTED",
      `Dependency '${name}' carries KB schema ${schemaVersion}, newer than this Kibi reads (${LATEST_KB_SCHEMA_VERSION}). Upgrade Kibi, or pin an older commit.`,
    );
  }
  return schemaVersion;
}

function workspaceOf(checkout: string, directory: string | undefined): string {
  return directory === undefined ? checkout : path.join(checkout, directory);
}

export type KbDependencyLockOutcome = Readonly<{
  name: string;
  status: "kept" | "locked" | "updated";
  commit: string;
  kbSchema: number;
  previousCommit?: string;
}>;

/**
 * Pin every declared dependency. A dependency whose lock entry still matches
 * its declaration keeps its commit unless `update` names it (or is true);
 * the others are resolved, fetched and checked. Entries of dependencies no
 * longer declared are dropped.
 */
export function lockKbDependencies(
  workspaceRoot: string,
  options: KbDependencyOptions & {
    readonly update?: boolean | readonly string[];
  } = {},
): KbDependencyLockOutcome[] {
  const specs = readKbDependencies(workspaceRoot);
  const previous = readKbDependencyLock(workspaceRoot);
  const update = options.update ?? false;
  if (Array.isArray(update)) {
    for (const name of update) requireSpec(specs, name);
  }
  const next: Record<string, KbDependencyLockEntry> = {};
  const outcomes: KbDependencyLockOutcome[] = [];
  for (const spec of specs) {
    const existing = previous[spec.name];
    const forced =
      update === true || (Array.isArray(update) && update.includes(spec.name));
    if (existing !== undefined && lockEntryMatches(spec, existing) && !forced) {
      next[spec.name] = existing;
      outcomes.push({
        name: spec.name,
        status: "kept",
        commit: existing.commit,
        kbSchema: existing.kbSchema,
      });
      continue;
    }
    const commit = resolveGitRef(spec.git, spec.ref, options.git);
    const checkout = materializeKbDependency(spec.git, commit, options);
    const kbSchema = readDependencySchema(
      spec.name,
      workspaceOf(checkout, spec.directory),
    );
    next[spec.name] = {
      git: spec.git,
      ...(spec.ref !== undefined ? { ref: spec.ref } : {}),
      ...(spec.directory !== undefined ? { directory: spec.directory } : {}),
      commit,
      kbSchema,
    };
    outcomes.push({
      name: spec.name,
      status: existing === undefined ? "locked" : "updated",
      commit,
      kbSchema,
      ...(existing !== undefined && existing.commit !== commit
        ? { previousCommit: existing.commit }
        : {}),
    });
  }
  writeKbDependencyLock(workspaceRoot, next);
  return outcomes;
}

function requireSpec(
  specs: readonly KbDependencySpec[],
  name: string,
): KbDependencySpec {
  const spec = specs.find((candidate) => candidate.name === name);
  if (spec !== undefined) return spec;
  const known = specs.map((candidate) => candidate.name);
  throw new KbDependencyError(
    "DEPENDENCY_UNKNOWN",
    known.length === 0
      ? `No KB dependency named '${name}': ${KB_DEPENDENCIES_PATH} declares none.`
      : `No KB dependency named '${name}'. Declared: ${known.join(", ")}.`,
  );
}

/** A dependency ready to read: its pin and the workspace that answers it. */
export type ResolvedKbDependency = Readonly<{
  name: string;
  git: string;
  ref?: string;
  commit: string;
  kbSchema: number;
  /** The detached checkout's Kibi workspace, which serves the reads. */
  workspaceRoot: string;
}>;

/**
 * Resolve a declared, locked dependency to the workspace that answers reads
 * of it, fetching the pinned commit into the cache on first use.
 */
export function resolveKbDependency(
  workspaceRoot: string,
  name: string,
  options: KbDependencyOptions = {},
): ResolvedKbDependency {
  const spec = requireSpec(readKbDependencies(workspaceRoot), name);
  const entry = readKbDependencyLock(workspaceRoot)[name];
  if (entry === undefined) {
    throw new KbDependencyError(
      "DEPENDENCY_NOT_LOCKED",
      `KB dependency '${name}' is not pinned yet; run 'kibi deps lock'.`,
    );
  }
  if (!lockEntryMatches(spec, entry)) {
    throw new KbDependencyError(
      "DEPENDENCY_LOCK_STALE",
      `${KB_DEPENDENCIES_LOCK_PATH} pins '${name}' for a different git URL, ref or directory than ${KB_DEPENDENCIES_PATH} declares; run 'kibi deps lock'.`,
    );
  }
  const checkout = materializeKbDependency(entry.git, entry.commit, options);
  const root = workspaceOf(checkout, entry.directory);
  const kbSchema = readDependencySchema(name, root);
  return {
    name,
    git: entry.git,
    ...(entry.ref !== undefined ? { ref: entry.ref } : {}),
    commit: entry.commit,
    kbSchema,
    workspaceRoot: root,
  };
}

export type KbDependencyStatus = Readonly<{
  name: string;
  git: string;
  ref?: string;
  directory?: string;
  commit: string | null;
  kbSchema: number | null;
  state: "not_locked" | "lock_stale" | "not_fetched" | "fetched";
  checkout: string | null;
}>;

/** Report every declared dependency's pin and cache state; never fetches. */
export function kbDependencyStatus(
  workspaceRoot: string,
  options: Pick<KbDependencyOptions, "env"> = {},
): KbDependencyStatus[] {
  const lock = readKbDependencyLock(workspaceRoot);
  const cacheRoot = kbDependencyCacheRoot(options.env);
  return readKbDependencies(workspaceRoot).map((spec) => {
    const entry = lock[spec.name];
    const base = {
      name: spec.name,
      git: spec.git,
      ...(spec.ref !== undefined ? { ref: spec.ref } : {}),
      ...(spec.directory !== undefined ? { directory: spec.directory } : {}),
    };
    if (entry === undefined) {
      return {
        ...base,
        commit: null,
        kbSchema: null,
        state: "not_locked",
        checkout: null,
      };
    }
    if (!lockEntryMatches(spec, entry)) {
      return {
        ...base,
        commit: entry.commit,
        kbSchema: entry.kbSchema,
        state: "lock_stale",
        checkout: null,
      };
    }
    const checkout = kbDependencyCheckoutPath(
      cacheRoot,
      entry.git,
      entry.commit,
    );
    const fetched = checkoutIsComplete(checkout, entry.git, entry.commit);
    return {
      ...base,
      commit: entry.commit,
      kbSchema: entry.kbSchema,
      state: fetched ? "fetched" : "not_fetched",
      checkout: fetched ? workspaceOf(checkout, entry.directory) : null,
    };
  });
}
