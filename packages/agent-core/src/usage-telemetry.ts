import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  type OperationSignals,
  RELATIONSHIP_COUNT_BUCKETS,
  RESULT_COUNT_BUCKETS,
  SMALL_COUNT_BUCKETS,
  countBucket,
  recallOperation,
  rememberSkillLoad,
  telemetryCrash,
  telemetryField,
  telemetryRootError,
  telemetryRule,
} from "./telemetry-signals.js";

export type { OperationSignals, RejectionIssue } from "./telemetry-signals.js";
export { telemetryRootError } from "./telemetry-signals.js";

/**
 * Anonymous usage telemetry shared by the CLI, the MCP server and the host
 * hooks.
 *
 * `.kb/usage.log` stays the detailed, opt-in diagnostic record and never
 * leaves the machine. This module sends a much smaller summary to the Kibi
 * PostHog project so maintainers can see which operations people run, how
 * long they take and how they fail. Events carry only fixed vocabulary
 * (operation and command names, statuses, error categories, path kinds),
 * durations, versions and platform; never paths, queries, entity ids, KB
 * content, repository names or error messages. The install id is random and
 * the host session id is hashed.
 *
 * Events are appended to a per-user queue file and sent in batches, so
 * short-lived processes (hooks, the CLI) do not wait on the network.
 * `KIBI_TELEMETRY=0`, `DO_NOT_TRACK=1`, `kibi telemetry disable`, CI and test
 * runs, and sandboxes whose home directory is a temp directory (eval and
 * packaging harnesses) turn it off. Runs of Kibi from a checkout of its own
 * repository, and runs a harness marks with `KIBI_TELEMETRY_CHANNEL`, are
 * still sent but carry a `channel` other than `release`, so they can be
 * filtered out of real usage.
 */

/** Public, write-only PostHog project key: it can send events, not read them. */
export const DEFAULT_TELEMETRY_KEY =
  "phc_A5z8jRhD528abGJiTtPfgu4d4hpbEbfiJr9iUGn9TMsY";
export const DEFAULT_TELEMETRY_HOST = "https://eu.i.posthog.com";
export const TELEMETRY_DOCS_URL =
  "https://looted.github.io/kibi/guide/telemetry.html";

const QUEUE_FILE = "telemetry-queue.jsonl";
const SESSIONS_FILE = "telemetry-sessions.json";
/** A hook-recorded session older than this no longer names the workspace's session. */
const SESSION_MARKER_MAX_AGE_MS = 30 * 60 * 1000;
const MAX_SESSION_MARKERS = 200;
const CONFIG_FILE = "telemetry.json";
const SENDING_SUFFIX = ".sending";
/** Queue size that makes a flush due regardless of age. */
const FLUSH_BATCH_EVENTS = 20;
/** Age of the oldest queued event that makes a flush due. */
const FLUSH_MAX_AGE_MS = 5 * 60 * 1000;
/** A claimed batch older than this was left by a process that died. */
const STALE_CLAIM_MS = 10 * 60 * 1000;
/** Queued events older than this are dropped instead of sent. */
const MAX_EVENT_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/** The queue stops growing past this size when sends keep failing. */
const MAX_QUEUE_BYTES = 1024 * 1024;
const DEFAULT_FLUSH_TIMEOUT_MS = 1500;

type Env = NodeJS.ProcessEnv;

export type TelemetryPreference = "enabled" | "disabled";

export type TelemetryConfig = {
  installId?: string;
  preference?: TelemetryPreference;
  noticeShownAt?: string;
};

export type TelemetryStatus = {
  enabled: boolean;
  /** Why telemetry is on or off, e.g. `KIBI_TELEMETRY=0` or `default`. */
  reason: string;
  directory: string;
  /** The channel events carry, e.g. `release`, `source` or `agent-test`. */
  channel: string;
  /** Where the channel comes from. */
  channelSource: TelemetryChannelSource;
};

/**
 * `KIBI_TELEMETRY_CHANNEL` (a harness set it), `checkout` (Kibi runs from a
 * checkout of its own repository) or `installed` (an installed package).
 */
export type TelemetryChannelSource =
  | "KIBI_TELEMETRY_CHANNEL"
  | "checkout"
  | "installed";

/** Summary of one Kibi operation run through MCP or the CLI. */
export type OperationTelemetry = {
  interface: "mcp" | "cli";
  /** Registered MCP tool or CLI command name. */
  operation: string;
  status: "success" | "error";
  durationMs: number;
  /** Fixed diagnostic category such as `tool_timeout`, when known. */
  errorCategory?: string | undefined;
  /**
   * The class of the error a failure threw (`TypeError`, `SyncError`), so
   * failures nobody has given a code yet can still be told apart.
   */
  errorClass?: string | undefined;
  exitCode?: number | undefined;
  /** Where the agent struggled; see telemetry-signals.ts. */
  signals?: OperationSignals | undefined;
};

/**
 * How an operation ended as sent: `success`; `rejected` when Kibi worked and
 * its answer was no (a check found violations, a payload failed validation,
 * an id does not exist); `error` when Kibi itself failed.
 */
export type TelemetryOutcome = "success" | "rejected" | "error";

/**
 * Version of the event fields. 2 split expected outcomes (`rejected`) from
 * failures (`error`) and added `error_class`.
 */
export const TELEMETRY_EVENT_VERSION = 2;

/**
 * Categories that are an operation's answer rather than a fault: the input
 * or the workspace was refused, or a check reported what it found.
 */
const REJECTED_CATEGORIES: ReadonlySet<string> = new Set([
  "bootstrap_plan_rejected",
  "check_violations",
  "coarse_symbol_linkage",
  "conflicting_input",
  "entity_not_found",
  "entity_validation_failed",
  "firm_decision_locked",
  "generated_artifacts_stale",
  "git_conflicts_unresolved",
  "incomplete_propositions",
  "input_read_failed",
  "integration_failed",
  "inventory_ingestion_failed",
  "invalid_project_config",
  "invalid_relationship",
  "legacy_branch_storage",
  "migration_plan_refused",
  "missing_input",
  "query_limit_exceeded",
  "relationship_source_mismatch",
  "relationship_validation_failed",
  "semantic_contradiction",
  "symbol_granularity_violation",
  "tests_failed",
  "uncompiled_source",
  "unknown_operation",
  "upsert_dry_run_invalid",
  "validation_failed",
]);

/**
 * Category families that are always findings: doctor checks, migration
 * refusals, and sync refusing pending sources something else changed.
 */
const REJECTED_CATEGORY_PREFIXES = [
  "doctor:",
  "migrate:",
  "pending_source_",
] as const;

/**
 * The outcome an operation's status and category amount to. Only a failure
 * whose category names an expected answer becomes `rejected`; a failure with
 * no category, or any other category, stays `error`.
 */
export function telemetryOutcome(
  status: "success" | "error",
  errorCategory: string | null | undefined,
): TelemetryOutcome {
  if (status === "success") return "success";
  if (!errorCategory) return "error";
  if (REJECTED_CATEGORIES.has(errorCategory)) return "rejected";
  return REJECTED_CATEGORY_PREFIXES.some((prefix) =>
    errorCategory.startsWith(prefix),
  )
    ? "rejected"
    : "error";
}

/**
 * The class name of a thrown value as sent: an identifier such as
 * `TypeError`, or null for a plain `Error`, a non-error or a name that is not
 * an identifier. A plain wrapper is named by its cause (see
 * telemetryRootError). Never the message.
 */
export function telemetryErrorClass(thrown: unknown): string | null {
  const error = telemetryRootError(thrown);
  if (error === null || typeof error !== "object") return null;
  const name = (error as { constructor?: { name?: unknown } }).constructor
    ?.name;
  if (typeof name !== "string" || name === "Error" || name === "Object") {
    return null;
  }
  return /^[A-Za-z_$][A-Za-z0-9_$]{0,79}$/.test(name) ? name : null;
}

/** Summary of one host hook decision. */
export type HookTelemetry = {
  hookEvent: string;
  hookAction: string;
  pathKind?: string | undefined;
  kbOperation?: string | undefined;
  kbUsedBefore?: boolean | undefined;
  requirementCount?: number | undefined;
  /** The Kibi skill a `skill_loaded` action loaded (fixed names or `other`). */
  skill?: string | undefined;
};

/** Who is sending: the package, its version and the host agent. */
export type TelemetrySource = {
  /** npm package name, e.g. `kibi-cli`, `kibi-mcp`, `kibi-claude`. */
  packageName: string;
  packageVersion?: string | null | undefined;
  /** Host agent, e.g. `claude-code`, `cursor`, `codex`, or `unknown`. */
  host?: string | undefined;
  /** Host session id; only its hash is sent. */
  sessionId?: string | null | undefined;
  /**
   * Workspace the CLI or MCP server works in. Without a session id of its
   * own, the event takes the session a host hook last reported there.
   */
  workspaceRoot?: string | undefined;
};

type QueuedEvent = {
  event: string;
  timestamp: string;
  properties: Record<string, unknown>;
};

function flagValue(value: string | undefined): boolean | undefined {
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return undefined;
}

/** Variables CI providers set; any non-false value marks a CI run. */
export const CI_ENV_KEYS = [
  "CI",
  "CONTINUOUS_INTEGRATION",
  "GITHUB_ACTIONS",
  "GITLAB_CI",
  "BUILDKITE",
  "CIRCLECI",
  "TRAVIS",
  "TF_BUILD",
  "JENKINS_URL",
  "TEAMCITY_VERSION",
  "BITBUCKET_BUILD_NUMBER",
  "CODEBUILD_BUILD_ID",
  "DRONE",
  "APPVEYOR",
  "SEMAPHORE",
  "BUILDKITE_BUILD_ID",
  "CF_BUILD_ID",
  "HEROKU_TEST_RUN_ID",
] as const;

/** Variables test runners set for the code under test (`NAME=value` must match). */
export const TEST_ENV_KEYS = [
  "NODE_ENV=test",
  "JEST_WORKER_ID",
  "VITEST",
  "VITEST_WORKER_ID",
  "NODE_TEST_CONTEXT",
] as const;

function automationName(env: Env, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const [name, expected] = key.split("=") as [string, string | undefined];
    const value = env[name]?.trim();
    if (!value) continue;
    if (expected !== undefined) {
      if (value === expected) return key;
      continue;
    }
    if (flagValue(value) !== false) return name;
  }
  return undefined;
}

/** Variables an agent host sets for the processes it starts, in priority order. */
export const HOST_ENV_KEYS = [
  ["CLAUDECODE=1", "claude-code"],
  ["CURSOR_AGENT=1", "cursor"],
  ["CODEX_SANDBOX", "codex"],
  ["CODEX_THREAD_ID", "codex"],
  ["GEMINI_CLI=1", "gemini-cli"],
  ["OPENCODE=1", "opencode"],
] as const;

/** Variables that carry the host agent's session id; only its hash is sent. */
export const SESSION_ENV_KEYS = [
  "KIBI_SESSION_ID",
  "CLAUDE_CODE_SESSION_ID",
  "CODEX_THREAD_ID",
] as const;

/** `Claude Code`, `claude_code` and `claude-code` name the same host. */
function hostKey(name: string): string {
  // Edge spaces become edge dashes, which the last step strips.
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * The agent host running Kibi, from an explicit `KIBI_HOST`/`KIBI_MCP_HOST`,
 * the variables hosts set for their children, or the `AI_AGENT` convention
 * (`claude-code_2-1-3_agent`). Undefined when nothing names one.
 */
export function detectTelemetryHost(
  env: Env = process.env,
): string | undefined {
  const explicit = env.KIBI_HOST?.trim() || env.KIBI_MCP_HOST?.trim();
  if (explicit) return hostKey(explicit) || undefined;
  for (const [key, host] of HOST_ENV_KEYS) {
    if (automationName(env, [key])) return host;
  }
  const agent = env.AI_AGENT?.trim().split("_")[0];
  return agent ? hostKey(agent) || undefined : undefined;
}

/** The host agent's session id from the environment, when it exposes one. */
export function detectTelemetrySession(
  env: Env = process.env,
): string | undefined {
  for (const key of SESSION_ENV_KEYS) {
    const value = env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

/** Whether the process runs in a hosted cloud workspace rather than on a laptop. */
function remoteEnvironment(env: Env): boolean {
  return (
    flagValue(env.CLAUDE_CODE_REMOTE) === true ||
    flagValue(env.CODESPACES) === true ||
    Boolean(env.GITPOD_WORKSPACE_ID?.trim())
  );
}

function realDirectory(directory: string): string {
  try {
    return fs.realpathSync(directory);
  } catch {
    return path.resolve(directory);
  }
}

/**
 * Eval, packaging and e2e harnesses give each run a fresh home under the temp
 * directory, so every run would count as a new install. A real user's home
 * never lives there.
 */
function sandboxedHome(env: Env): boolean {
  const home = (env.HOME ?? env.USERPROFILE)?.trim();
  if (!home) return false;
  const temp = realDirectory(os.tmpdir());
  const resolved = realDirectory(home);
  // The temp directory itself does not start with `${temp}/`.
  return resolved.startsWith(`${temp}${path.sep}`);
}

/** The Kibi monorepo root's package name. */
const KIBI_REPOSITORY_PACKAGE = "kibi";

/**
 * The file a module URL names, or undefined when there is none: a bundle
 * format can drop `import.meta.url` or make reading it throw.
 */
export function moduleFileFromUrl(readUrl: () => unknown): string | undefined {
  let file: string | undefined;
  try {
    const url = readUrl();
    // An empty URL makes fileURLToPath throw, so it lands in the catch.
    if (typeof url === "string") file = fileURLToPath(url);
  } catch {
    // No usable module URL.
  }
  return file;
}

/** This module's file. */
function thisModuleFile(): string | undefined {
  return moduleFileFromUrl(() => import.meta.url);
}

/**
 * Whether a file belongs to a checkout of the Kibi repository rather than to
 * an installed package. Installed copies live under `node_modules` or in a
 * host's plugin cache; a checkout has the monorepo root `package.json` (named
 * `kibi`, with a `packages/agent-core` workspace) above the file.
 */
function insideKibiCheckout(file: string): boolean {
  const resolved = realDirectory(file);
  if (resolved.split(/[\\/]/).includes("node_modules")) return false;
  let current = path.dirname(resolved);
  for (;;) {
    try {
      const manifest = JSON.parse(
        fs.readFileSync(path.join(current, "package.json"), "utf8"),
      ) as { name?: unknown };
      if (
        manifest.name === KIBI_REPOSITORY_PACKAGE &&
        fs.existsSync(path.join(current, "packages", "agent-core"))
      ) {
        return true;
      }
    } catch {
      // No readable manifest here; keep walking up.
    }
    const parent = path.dirname(current);
    if (parent === current) return false;
    current = parent;
  }
}

const checkoutCache = new Map<string, boolean>();

/**
 * Where a run comes from: the `KIBI_TELEMETRY_CHANNEL` a harness sets (for
 * example `agent-test`), `source` when Kibi runs from a checkout of its own
 * repository (local development, the repository's own hooks, e2e and agent
 * test rounds built from source), and `release` for an installed package.
 */
export function detectTelemetryChannel(
  env: Env = process.env,
  moduleFile: string | null = thisModuleFile() ?? null,
): string {
  return telemetryChannel(env, moduleFile).channel;
}

/** The channel in effect and where it comes from. */
export function telemetryChannel(
  env: Env = process.env,
  moduleFile: string | null = thisModuleFile() ?? null,
): { channel: string; source: TelemetryChannelSource } {
  const explicit = env.KIBI_TELEMETRY_CHANNEL?.trim();
  if (explicit)
    return {
      // A non-blank value always has a category.
      channel: telemetryCategory(explicit) as string,
      source: "KIBI_TELEMETRY_CHANNEL",
    };
  if (!moduleFile) return { channel: "release", source: "installed" };
  let fromCheckout = checkoutCache.get(moduleFile);
  if (fromCheckout === undefined) {
    fromCheckout = insideKibiCheckout(moduleFile);
    checkoutCache.set(moduleFile, fromCheckout);
  }
  return fromCheckout
    ? { channel: "source", source: "checkout" }
    : { channel: "release", source: "installed" };
}

/** Per-user directory holding the telemetry config and queue. */
export function telemetryDirectory(env: Env = process.env): string {
  const explicit = env.KIBI_TELEMETRY_DIR?.trim();
  if (explicit) return explicit;
  if (process.platform === "win32" && env.LOCALAPPDATA) {
    return path.join(env.LOCALAPPDATA, "kibi");
  }
  const stateHome = env.XDG_STATE_HOME?.trim();
  return path.join(
    stateHome || path.join(env.HOME || os.homedir(), ".local", "state"),
    "kibi",
  );
}

export function readTelemetryConfig(env: Env = process.env): TelemetryConfig {
  try {
    const parsed: unknown = JSON.parse(
      String(fs.readFileSync(path.join(telemetryDirectory(env), CONFIG_FILE))),
    );
    return typeof parsed === "object" && parsed !== null
      ? (parsed as TelemetryConfig)
      : {};
  } catch {
    return {};
  }
}

function writeTelemetryConfig(config: TelemetryConfig, env: Env): void {
  const directory = telemetryDirectory(env);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(
    path.join(directory, CONFIG_FILE),
    `${JSON.stringify(config, null, 2)}\n`,
  );
}

/**
 * Persist the user's choice. Disabling also deletes anything still queued,
 * so nothing recorded before the choice is sent afterwards.
 */
export function setTelemetryPreference(
  preference: TelemetryPreference,
  env: Env = process.env,
): void {
  writeTelemetryConfig({ ...readTelemetryConfig(env), preference }, env);
  if (preference === "disabled") clearTelemetryQueue(env);
}

/**
 * Whether events are recorded and sent, and why. Explicit opt-outs win over
 * everything. CI and test runs are off even after `kibi telemetry enable`;
 * only an explicit `KIBI_TELEMETRY=1` sends from them.
 */
export function telemetryStatus(env: Env = process.env): TelemetryStatus {
  const directory = telemetryDirectory(env);
  const { channel, source } = telemetryChannel(env);
  const status = (enabled: boolean, reason: string): TelemetryStatus => ({
    enabled,
    reason,
    directory,
    channel,
    channelSource: source,
  });
  const explicit = flagValue(env.KIBI_TELEMETRY);
  if (explicit === false) return status(false, "KIBI_TELEMETRY=0");
  if (flagValue(env.DO_NOT_TRACK) === true) {
    return status(false, "DO_NOT_TRACK=1");
  }
  const preference = readTelemetryConfig(env).preference;
  if (preference === "disabled") {
    return status(false, "disabled with `kibi telemetry disable`");
  }
  if (telemetryKey(env) === "") return status(false, "no telemetry key");
  if (explicit === true) return status(true, "KIBI_TELEMETRY=1");
  // Read through a variable: bundlers inline `process.env.NODE_ENV`.
  const processEnv: Env = process.env;
  // CI and test runs are checked in both the given env and the process env,
  // so a suite that passes its own env object cannot leak events either.
  const ciName =
    automationName(env, CI_ENV_KEYS) ?? automationName(processEnv, CI_ENV_KEYS);
  if (ciName) return status(false, `CI environment (${ciName})`);
  const testName =
    automationName(env, TEST_ENV_KEYS) ??
    automationName(processEnv, TEST_ENV_KEYS);
  if (testName) return status(false, `test environment (${testName})`);
  if (sandboxedHome(env)) {
    return status(false, "sandboxed home in the temp directory (harness run)");
  }
  if (preference === "enabled") {
    return status(true, "enabled with `kibi telemetry enable`");
  }
  return status(true, "on by default; anonymous, opt-out");
}

export function telemetryEnabled(env: Env = process.env): boolean {
  return telemetryStatus(env).enabled;
}

function telemetryKey(env: Env): string {
  const override = env.KIBI_TELEMETRY_KEY;
  return (override === undefined ? DEFAULT_TELEMETRY_KEY : override).trim();
}

function telemetryHost(env: Env): string {
  return (env.KIBI_TELEMETRY_HOST?.trim() || DEFAULT_TELEMETRY_HOST).replace(
    /\/+$/,
    "",
  );
}

function installId(env: Env): string {
  const config = readTelemetryConfig(env);
  if (typeof config.installId === "string" && config.installId !== "") {
    return config.installId;
  }
  const created = randomUUID();
  try {
    writeTelemetryConfig({ ...config, installId: created }, env);
  } catch {
    // An unwritable directory still lets this process send with a fresh id.
  }
  return created;
}

/** Stable one-way hash, so a session can be grouped without revealing its id. */
export function hashTelemetryId(value: string): string {
  return createHash("sha256")
    .update("kibi-telemetry\0")
    .update(value)
    .digest("hex")
    .slice(0, 16);
}

/**
 * The notice users see before the first event is sent, or null once it was
 * shown. Callers that can reach the user (CLI and MCP stderr) print it.
 */
export function takeTelemetryNotice(env: Env = process.env): string | null {
  if (!telemetryEnabled(env)) return null;
  const config = readTelemetryConfig(env);
  if (config.noticeShownAt) return null;
  try {
    writeTelemetryConfig(
      { ...config, noticeShownAt: new Date().toISOString() },
      env,
    );
  } catch {
    // Without a writable config the notice would repeat on every run.
    return null;
  }
  return [
    "Kibi collects anonymous usage statistics (operation names, durations, error categories and versions) to improve Kibi.",
    "It never sends code, file paths, queries, KB content or repository names.",
    `Turn it off with \`kibi telemetry disable\` or KIBI_TELEMETRY=0. Details: ${TELEMETRY_DOCS_URL}`,
  ].join("\n");
}

// rationale: the suite runs under Bun, whose global cannot be removed, so
// the Node branch is unreachable from tests.
// Stryker disable all
function runtimeName(): string {
  return typeof (globalThis as { Bun?: unknown }).Bun === "undefined"
    ? "node"
    : "bun";
}
// Stryker restore all

type SessionMarkers = Record<string, { session: string; at: number }>;

function sessionMarkersPath(env: Env): string {
  return path.join(telemetryDirectory(env), SESSIONS_FILE);
}

function readSessionMarkers(env: Env): SessionMarkers {
  try {
    const parsed: unknown = JSON.parse(
      String(fs.readFileSync(sessionMarkersPath(env))),
    );
    // An array works as a record here: its markers are named properties.
    return typeof parsed === "object" && parsed !== null
      ? (parsed as SessionMarkers)
      : {};
  } catch {
    return {};
  }
}

function workspaceKey(workspaceRoot: string): string {
  return hashTelemetryId(`workspace\0${path.resolve(workspaceRoot)}`);
}

/**
 * Remember which host session last ran a hook in a workspace. Every host
 * hands its hooks the session id, but only some expose it to the CLI and MCP
 * server through the environment. Only hashes are stored: of the workspace
 * path and of the session id.
 */
export function rememberHookSession(
  workspaceRoot: string,
  sessionId: string,
  env: Env = process.env,
): void {
  if (!sessionId.trim() || !telemetryEnabled(env)) return;
  const now = Date.now();
  const markers = readSessionMarkers(env);
  markers[workspaceKey(workspaceRoot)] = {
    session: hashTelemetryId(sessionId.trim()),
    at: now,
  };
  const kept = Object.entries(markers)
    .filter(
      ([, marker]) =>
        typeof marker?.at === "number" &&
        now - marker.at <= SESSION_MARKER_MAX_AGE_MS,
    )
    .sort(([, left], [, right]) => right.at - left.at)
    .slice(0, MAX_SESSION_MARKERS);
  try {
    const file = sessionMarkersPath(env);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(Object.fromEntries(kept)));
    fs.renameSync(temporary, file);
  } catch {
    // Telemetry is best effort and must never disturb the hook.
  }
}

/**
 * Hashed session a host hook recently reported for this directory or the
 * nearest ancestor that has one, or undefined.
 */
export function workspaceSessionHash(
  startDirectory: string,
  env: Env = process.env,
): string | undefined {
  const markers = readSessionMarkers(env);
  const now = Date.now();
  let current = path.resolve(startDirectory);
  for (;;) {
    const marker = markers[workspaceKey(current)];
    if (
      marker &&
      typeof marker.session === "string" &&
      typeof marker.at === "number" &&
      now - marker.at <= SESSION_MARKER_MAX_AGE_MS
    ) {
      return marker.session;
    }
    const parent = path.dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

function sessionProperty(source: TelemetrySource, env: Env): string | null {
  const sessionId = source.sessionId?.trim() || detectTelemetrySession(env);
  if (sessionId) return hashTelemetryId(sessionId);
  return source.workspaceRoot
    ? (workspaceSessionHash(source.workspaceRoot, env) ?? null)
    : null;
}

function baseProperties(
  source: TelemetrySource,
  env: Env,
): Record<string, unknown> {
  return {
    distinct_id: installId(env),
    $process_person_profile: false,
    $geoip_disable: true,
    $lib: "kibi",
    telemetry_version: TELEMETRY_EVENT_VERSION,
    package: source.packageName,
    package_version: source.packageVersion ?? null,
    host:
      // A blank host keys to "", which falls through like no host.
      (source.host && hostKey(source.host)) ||
      detectTelemetryHost(env) ||
      "unknown",
    remote: remoteEnvironment(env),
    channel: detectTelemetryChannel(env),
    session: sessionProperty(source, env),
    os: process.platform,
    arch: process.arch,
    runtime: runtimeName(),
    runtime_version: process.versions.node.split(".")[0] as string,
  };
}

function queuePath(env: Env): string {
  return path.join(telemetryDirectory(env), QUEUE_FILE);
}

function appendEvent(event: QueuedEvent, env: Env): void {
  try {
    const file = queuePath(env);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    try {
      if (fs.statSync(file).size > MAX_QUEUE_BYTES) return;
    } catch {
      // No queue yet.
    }
    fs.appendFileSync(file, `${JSON.stringify(event)}\n`);
  } catch {
    // Telemetry is best effort and must never disturb the caller.
  }
}

/**
 * An error category as sent: fixed identifiers such as `tool_timeout` or
 * `UPSERT_DRY_RUN_INVALID` pass, lower-cased; anything that looks like free
 * text is replaced, so a message can never leak through this field.
 */
export function telemetryCategory(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return /^[A-Za-z0-9_.:+-]{1,160}$/.test(trimmed)
    ? trimmed.toLowerCase()
    : "unclassified";
}

/** An error class name as sent: an identifier, else null. */
function telemetryClassName(value: string | undefined): string | null {
  return value !== undefined && /^[A-Za-z_$][A-Za-z0-9_$]{0,79}$/.test(value)
    ? value
    : null;
}

export function recordOperationTelemetry(
  source: TelemetrySource,
  operation: OperationTelemetry,
  env: Env = process.env,
): void {
  if (!telemetryEnabled(env)) return;
  const errorCategory = telemetryCategory(operation.errorCategory);
  const status = telemetryOutcome(operation.status, errorCategory);
  appendEvent(
    {
      event: "kibi_operation",
      timestamp: new Date().toISOString(),
      properties: {
        ...baseProperties(source, env),
        interface: operation.interface,
        operation: operation.operation,
        status,
        duration_ms: Math.max(0, Math.round(operation.durationMs)),
        error_category: errorCategory,
        // Only a failure is worth a class: an expected answer has its code.
        error_class:
          status === "error" ? telemetryClassName(operation.errorClass) : null,
        exit_code: operation.exitCode ?? null,
        ...signalProperties(source, operation, status, env),
      },
    },
    env,
  );
  // A skill loaded through the CLI or MCP counts like one a host hook saw.
  if (
    status === "success" &&
    operation.signals?.skillLoad === true &&
    source.workspaceRoot
  ) {
    rememberTelemetrySkillLoad(source.workspaceRoot, env);
  }
}

/** The workspace's hash and its parents', for markers set in a parent. */
function workspaceHashes(workspaceRoot: string | undefined): string[] {
  // rationale: a placeholder entry is not a workspace key, and skill markers
  // only ever hold workspace keys, so it matches none.
  // Stryker disable next-line ArrayDeclaration
  if (!workspaceRoot) return [];
  // rationale: as above, a placeholder entry matches no skill marker.
  // Stryker disable next-line ArrayDeclaration
  const hashes: string[] = [];
  let current = path.resolve(workspaceRoot);
  for (;;) {
    hashes.push(workspaceKey(current));
    const parent = path.dirname(current);
    if (parent === current) return hashes;
    current = parent;
  }
}

/**
 * The struggle signals of one operation event, sanitized: fixed rule ids,
 * Kibi schema field paths, bucketed counts and booleans. Retries, repeated
 * searches and skill loads are recognised from local hashes only.
 */
function signalProperties(
  source: TelemetrySource,
  operation: OperationTelemetry,
  status: TelemetryOutcome,
  env: Env,
): Record<string, unknown> {
  const signals = operation.signals ?? {};
  const issues = signals.issues ?? [];
  const first = issues[0];
  const workspace = source.workspaceRoot
    ? path.resolve(source.workspaceRoot)
    : // rationale: without a workspace every call hashes the same fallback,
      // so which string it is cannot change a retry or repeat match.
      // Stryker disable next-line StringLiteral
      "";
  const recall = recallOperation(telemetryDirectory(env), {
    retryHash: signals.retryKey
      ? hashTelemetryId(`retry\0${workspace}\0${signals.retryKey}`)
      : undefined,
    searchHash: signals.search
      ? hashTelemetryId(`search\0${workspace}`)
      : undefined,
    workspaceHashes: workspaceHashes(source.workspaceRoot),
    outcome: status,
  });
  const crash =
    status === "error"
      ? telemetryCrash(signals.error, telemetryClassName(operation.errorClass))
      : { frame: null, fingerprint: null };
  return {
    dry_run: signals.dryRun ?? null,
    relationship_count: countBucket(
      signals.relationshipCount,
      RELATIONSHIP_COUNT_BUCKETS,
    ),
    rejection_code: telemetryCategory(signals.rejectionCode),
    validation_rule: telemetryRule(first?.rule),
    validation_field: telemetryField(first?.field),
    // No issues and no attempt are in no bucket, so both are sent as null.
    issue_count: countBucket(issues.length, SMALL_COUNT_BUCKETS),
    attempt: countBucket(recall.attempt, SMALL_COUNT_BUCKETS),
    prior_outcome: recall.priorOutcome,
    skill_loaded_before: recall.skillLoadedBefore,
    result_count: countBucket(signals.resultCount, RESULT_COUNT_BUCKETS),
    abstained: signals.abstained ?? null,
    hints_shown: signals.hintsShown ?? null,
    search_repeat: recall.searchRepeat,
    crash_frame: crash.frame,
    crash_fingerprint: crash.fingerprint,
  };
}

/**
 * Remember that a host hook saw a Kibi skill load in a workspace, so later
 * CLI and MCP events there carry `skill_loaded_before`. Only the workspace
 * path's hash is stored.
 */
export function rememberTelemetrySkillLoad(
  workspaceRoot: string,
  env: Env = process.env,
): void {
  if (!telemetryEnabled(env)) return;
  rememberSkillLoad(telemetryDirectory(env), workspaceKey(workspaceRoot));
}

export function recordHookTelemetry(
  source: TelemetrySource,
  hook: HookTelemetry,
  env: Env = process.env,
): void {
  if (!telemetryEnabled(env)) return;
  appendEvent(
    {
      event: "kibi_hook",
      timestamp: new Date().toISOString(),
      properties: {
        ...baseProperties(source, env),
        hook_event: hook.hookEvent,
        hook_action: hook.hookAction,
        path_kind: hook.pathKind ?? null,
        kb_operation: hook.kbOperation ?? null,
        kb_used_before: hook.kbUsedBefore ?? null,
        requirement_count: hook.requirementCount ?? null,
        skill: hook.skill ?? null,
      },
    },
    env,
  );
}

export function clearTelemetryQueue(env: Env = process.env): void {
  const directory = telemetryDirectory(env);
  let names: string[];
  try {
    names = fs.readdirSync(directory);
  } catch {
    return;
  }
  for (const name of names) {
    if (
      name === QUEUE_FILE ||
      name === SESSIONS_FILE ||
      name.endsWith(SENDING_SUFFIX)
    ) {
      // rationale: `force` covers a file a concurrent flush renames between
      // the listing and this removal; tests cannot time that race.
      // Stryker disable next-line ObjectLiteral, BooleanLiteral
      fs.rmSync(path.join(directory, name), { force: true });
    }
  }
}

function parseQueued(text: string, now: number): QueuedEvent[] {
  const events: QueuedEvent[] = [];
  for (const line of text.split("\n")) {
    try {
      // A blank line fails to parse and is dropped with torn lines.
      const event = JSON.parse(line) as QueuedEvent;
      const age = now - Date.parse(event.timestamp);
      if (Number.isFinite(age) && age <= MAX_EVENT_AGE_MS) events.push(event);
    } catch {
      // A torn line from a crashed writer is dropped.
    }
  }
  return events;
}

function flushDue(file: string, now: number): boolean {
  let text: string;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    return false;
  }
  const lines = text.split("\n").filter((line) => line.trim() !== "");
  if (lines.length === 0) return false;
  if (lines.length >= FLUSH_BATCH_EVENTS) return true;
  try {
    const first = JSON.parse(lines[0] as string) as QueuedEvent;
    return now - Date.parse(first.timestamp) >= FLUSH_MAX_AGE_MS;
  } catch {
    return true;
  }
}

/** Atomically take the queue and any batch a dead process left behind. */
function claimBatches(directory: string, now: number): string[] {
  // rationale: a placeholder path in place of the empty list names no file,
  // so reading it fails and it is dropped like an unreadable batch.
  // Stryker disable next-line ArrayDeclaration
  const claimed: string[] = [];
  let names: string[];
  try {
    names = fs.readdirSync(directory);
  } catch {
    return claimed;
  }
  for (const name of names) {
    if (!name.endsWith(SENDING_SUFFIX)) continue;
    const file = path.join(directory, name);
    try {
      if (now - fs.statSync(file).mtimeMs < STALE_CLAIM_MS) continue;
      const reclaimed = `${file}.${randomUUID()}${SENDING_SUFFIX}`;
      fs.renameSync(file, reclaimed);
      claimed.push(reclaimed);
    } catch {
      // Another process reclaimed it first.
    }
  }
  const queue = path.join(directory, QUEUE_FILE);
  const target = path.join(
    directory,
    `${QUEUE_FILE}.${process.pid}.${randomUUID()}${SENDING_SUFFIX}`,
  );
  try {
    fs.renameSync(queue, target);
    claimed.push(target);
  } catch {
    // Nothing queued, or another process is sending it.
  }
  return claimed;
}

export type FlushOptions = {
  /** Send even when the queue is small and recent (process exit, Stop hook). */
  force?: boolean;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

/**
 * Send queued events in one batch when a flush is due (or forced). Returns
 * the number of events sent. A failed send puts the events back for the next
 * flush; nothing here throws.
 */
export async function flushTelemetry(
  options: FlushOptions = {},
  env: Env = process.env,
): Promise<number> {
  if (!telemetryEnabled(env)) return 0;
  const directory = telemetryDirectory(env);
  const now = Date.now();
  if (!options.force && !flushDue(queuePath(env), now)) return 0;
  // With nothing claimed there are no events, so nothing is sent.
  const claimed = claimBatches(directory, now);
  const events: QueuedEvent[] = [];
  for (const file of claimed) {
    try {
      events.push(...parseQueued(fs.readFileSync(file, "utf8"), now));
    } catch {
      // Unreadable batch: drop it.
    }
  }
  const release = () => {
    // rationale: `force` only matters when a claimed file is already gone,
    // which no other process does to a batch this one claimed.
    // Stryker disable next-line ObjectLiteral, BooleanLiteral
    for (const file of claimed) fs.rmSync(file, { force: true });
  };
  if (events.length === 0) {
    release();
    return 0;
  }
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_FLUSH_TIMEOUT_MS,
  );
  // rationale: unref only lets the process exit before the timeout fires;
  // no test can observe the process lifetime from inside it.
  // Stryker disable next-line CallExpression
  timer.unref();
  try {
    const response = await fetchImpl(`${telemetryHost(env)}/batch/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: telemetryKey(env),
        historical_migration: false,
        batch: events,
      }),
      signal: controller.signal,
    });
    // A 4xx means PostHog will never accept this batch; drop it.
    if (!response.ok && response.status >= 500) throw new Error();
    release();
    return response.ok ? events.length : 0;
  } catch {
    release();
    for (const event of events) appendEvent(event, env);
    return 0;
  } finally {
    clearTimeout(timer);
  }
}
