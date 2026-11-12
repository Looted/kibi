import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * Signals that show where agents struggle with Kibi, sent with
 * `kibi_operation` events: which rule and field a refused payload broke, how
 * often an agent retries the same entity, whether a Kibi skill was loaded
 * first, how searches end, and where in Kibi's own code a crash happened.
 *
 * Every value is fixed vocabulary, a bucketed count or a boolean. Field
 * names are Kibi schema names; what an agent wrote is never sent. Retries,
 * repeated searches and skill loads are recognised from one-way hashes kept
 * in a small local file next to the telemetry queue; the hashed keys never
 * leave the machine.
 */

/** One reason Kibi refused a payload: a fixed rule and the schema field. */
export type RejectionIssue = {
  /** Fixed rule id: a JSON Schema keyword or a Kibi check name. */
  readonly rule: string;
  /** Schema field path with list positions as `*`, e.g. `relationships.*.type`. */
  readonly field?: string | undefined;
};

/** What an operation tells telemetry about the call, before sanitizing. */
export type OperationSignals = {
  /** A validation-only upsert (`dryRun: true` or kb_validate_upsert). */
  readonly dryRun?: boolean | undefined;
  /** How many relationships the upsert carried. */
  readonly relationshipCount?: number | undefined;
  /** The code of the refusal a dry run reported, e.g. ENTITY_VALIDATION_FAILED. */
  readonly rejectionCode?: string | undefined;
  /** Why Kibi refused the payload, most specific first. */
  readonly issues?: readonly RejectionIssue[] | undefined;
  /** How many results a search returned. */
  readonly resultCount?: number | undefined;
  /** Whether a search declined to answer. */
  readonly abstained?: boolean | undefined;
  /** Whether a search showed concept hints. */
  readonly hintsShown?: boolean | undefined;
  /** Marks a search, for `search_repeat`. */
  readonly search?: boolean | undefined;
  /**
   * What the call worked on (entity type and id), so a repeated call on the
   * same entity counts as a retry. Hashed locally and never sent.
   */
  readonly retryKey?: string | undefined;
  /** The error a failure threw, for its Kibi stack frames. Never sent. */
  readonly error?: unknown;
};

/** How long a repeated call on the same entity counts as a retry. */
export const RETRY_WINDOW_MS = 10 * 60 * 1000;
/** How long a second search counts as a repeat of the first. */
export const SEARCH_REPEAT_WINDOW_MS = 2 * 60 * 1000;
/** How long a loaded Kibi skill counts as loaded before a call. */
export const SKILL_WINDOW_MS = 30 * 60 * 1000;
const MAX_RECENT_ENTRIES = 200;
const RECENT_FILE = "telemetry-recent.json";

/** The Kibi skills a skill-load signal may name; anything else is `other`. */
export const KIBI_SKILL_NAMES: ReadonlySet<string> = new Set([
  "kibi-bootstrap",
  "kibi-commit-review",
  "kibi-decisions",
  "kibi-freshness",
  "kibi-provable-code",
  "kibi-traceability",
  "kibi-usage",
]);

/** A count as one of a few fixed ranges, never the exact number. */
export function countBucket(
  value: number | null | undefined,
  ranges: readonly (readonly [number, number, string])[],
): string | null {
  // A missing count is NaN here, and NaN or a negative count is in no range.
  const whole = Math.floor(value ?? Number.NaN);
  for (const [low, high, label] of ranges) {
    if (whole >= low && whole <= high) return label;
  }
  return null;
}

export const RESULT_COUNT_BUCKETS = [
  [0, 0, "0"],
  [1, 1, "1"],
  [2, 5, "2-5"],
  [6, 10, "6-10"],
  [11, Number.POSITIVE_INFINITY, "11+"],
] as const;

export const RELATIONSHIP_COUNT_BUCKETS = [
  [0, 0, "0"],
  [1, 1, "1"],
  [2, 5, "2-5"],
  [6, Number.POSITIVE_INFINITY, "6+"],
] as const;

export const SMALL_COUNT_BUCKETS = [
  [1, 1, "1"],
  [2, 2, "2"],
  [3, 3, "3"],
  [4, Number.POSITIVE_INFINITY, "4+"],
] as const;

/** A rule id as sent: a short identifier, lower-cased, else `other`. */
export function telemetryRule(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(trimmed)
    ? trimmed.toLowerCase()
    : "other";
}

/**
 * A schema field path as sent: identifier segments and `*` joined by dots,
 * at most six segments, else `other`. Callers map names that are not Kibi
 * schema fields to `other` before this, so an invented key never passes.
 */
export function telemetryField(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const segments = trimmed.split(".");
  return segments.length <= 6 &&
    trimmed.length <= 120 &&
    segments.every(
      (segment) =>
        segment === "*" || /^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(segment),
    )
    ? trimmed
    : "other";
}

const KIBI_SOURCE_PACKAGES =
  "agent-core|cli|mcp|core|runtime|claude|codex|cursor|opencode|zcode|vscode|plugin-[a-z0-9-]+|lang-[a-z0-9-]+";
const INSTALLED_FRAME = /(?:^|\/)node_modules\/(kibi-[a-z0-9-]+)\/(.+)/;
const SOURCE_FRAME = new RegExp(
  `(?:^|/)packages/(${KIBI_SOURCE_PACKAGES})/((?:src|dist|bin)/.+)$`,
);

/** The Kibi package and the file inside it, or null outside Kibi. */
function framePackage(location: string): [string, string] | null {
  const installed = INSTALLED_FRAME.exec(location);
  if (installed) return [installed[1] as string, installed[2] as string];
  const source = SOURCE_FRAME.exec(location);
  return source ? [`kibi-${source[1]}`, source[2] as string] : null;
}

function frameLocation(raw: string): string | null {
  // A `file://` prefix needs no stripping: both patterns match after a `/`.
  const location = raw.replaceAll("\\", "/").replace(/:\d+(?::\d+)?$/, "");
  const found = framePackage(location);
  if (found === null) return null;
  const [pkg, rest] = found;
  const module = rest.replace(/\.(?:[cm]?js|[cm]?ts|tsx)$/, "");
  return /^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+){0,7}$/.test(module) &&
    !module.split("/").includes("..")
    ? `${pkg}/${module}`
    : null;
}

/**
 * Up to three `package/module#function` frames from a stack, all inside
 * Kibi's own packages. A frame elsewhere (Node, Bun, other packages, the
 * user's code) is skipped, so no path of the user's machine is kept.
 */
export function kibiStackFrames(stack: unknown): string[] {
  if (typeof stack !== "string") return [];
  const frames: string[] = [];
  for (const line of stack.split("\n").slice(1, 60)) {
    const match = /^\s*at (?:(.+?) \()?(.+?)\)?\s*$/.exec(line);
    if (!match) continue;
    const location = frameLocation(match[2] as string);
    if (location === null) continue;
    const name = match[1]?.replace(/^async /, "").trim();
    const fn =
      name !== undefined && /^[A-Za-z0-9_$.<>]{1,80}$/.test(name)
        ? name
        : "anonymous";
    frames.push(`${location}#${fn}`);
    if (frames.length === 3) break;
  }
  return frames;
}

/**
 * The error a plain wrapper stands for: a message-prefixing `Error` with no
 * code of its own (such as `Upsert execution failed: ...`) names nothing, so
 * its `cause` chain is followed to the first error that has a class or code
 * of its own. Anything else is returned as it is.
 */
export function telemetryRootError(error: unknown): unknown {
  let current = error;
  for (let depth = 0; depth < 5; depth += 1) {
    if (!isRecord(current)) return current;
    const wrapper: { code?: unknown; cause?: unknown } = current;
    const errorClass: unknown = current.constructor;
    if (errorClass !== Error) return current;
    if (typeof wrapper.code === "string" && wrapper.code !== "") {
      return current;
    }
    if (!isRecord(wrapper.cause)) return current;
    current = wrapper.cause;
  }
  return current;
}

/**
 * Where a crash happened in Kibi's own code: the top Kibi frame, and a
 * fingerprint of the error class and the top three Kibi frames that groups
 * the same crash across installs. Null when the stack has no Kibi frame.
 */
export function telemetryCrash(
  error: unknown,
  errorClass: string | null,
): { frame: string | null; fingerprint: string | null } {
  const frames = kibiStackFrames(
    (telemetryRootError(error) as { stack?: unknown } | null | undefined)
      ?.stack,
  );
  if (frames.length === 0) return { frame: null, fingerprint: null };
  const fingerprint = createHash("sha256")
    .update("kibi-crash\0")
    .update(errorClass ?? "")
    .update("\0")
    .update(frames.join("\n"))
    .digest("hex")
    .slice(0, 16);
  return { frame: frames[0] as string, fingerprint };
}

/** An object to read fields from; a list's named fields are all missing. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const SKILL_FILE = /(?:^|[\\/])(kibi-[a-z0-9-]+)[\\/]SKILL\.md\b/i;

function skillName(name: string): string {
  return KIBI_SKILL_NAMES.has(name) ? name : "other";
}

function skillInStrings(value: unknown, depth: number): string | undefined {
  if (typeof value === "string") {
    const match = SKILL_FILE.exec(value);
    return match ? skillName((match[1] as string).toLowerCase()) : undefined;
  }
  if (depth <= 0) return undefined;
  // Object.values lists an array's items and nothing for other primitives.
  for (const child of Object.values(value ?? {}).slice(0, 50)) {
    const found = skillInStrings(child, depth - 1);
    if (found) return found;
  }
  return undefined;
}

/**
 * The Kibi skill a host tool call loads, or undefined: a skill tool naming a
 * `kibi-*` skill (Claude Code, OpenCode), or any tool whose input names a
 * `kibi-*\/SKILL.md` file (a read or shell command in Codex, Cursor, ZCode
 * and the rest). Unknown `kibi-*` names come back as `other`.
 */
export function kibiSkillLoad(
  toolName: string | undefined,
  toolInput: unknown,
): string | undefined {
  if (/^skill$/i.test(String(toolName).trim()) && isRecord(toolInput)) {
    for (const key of ["skill", "name", "command"]) {
      const value = toolInput[key];
      if (typeof value !== "string") continue;
      const bare = (value.trim().split(":").at(-1) as string).toLowerCase();
      if (/^kibi-[a-z0-9-]+$/.test(bare)) return skillName(bare);
    }
  }
  return skillInStrings(toolInput, 3);
}

type RecentCall = { k: string; t: number; o: string };
type RecentSkill = { w: string; t: number };
type RecentFile = { calls: RecentCall[]; skills: RecentSkill[] };

function recentPath(directory: string): string {
  return path.join(directory, RECENT_FILE);
}

/** A stored list, or none. */
function entries(value: unknown): unknown[] {
  // rationale: a placeholder item in place of the empty list is not an
  // object, so the entry filters below drop it.
  // Stryker disable next-line ArrayDeclaration
  return Array.isArray(value) ? value : [];
}

function fresh(entry: unknown, now: number, windowMs: number): boolean {
  return (
    isRecord(entry) && typeof entry.t === "number" && now - entry.t <= windowMs
  );
}

/**
 * The recent calls and skill loads still inside their windows. A key that is
 * not a string never equals a hash, so only the time and outcome are checked.
 */
function readRecent(directory: string, now: number): RecentFile {
  let parsed: { calls?: unknown; skills?: unknown } = {};
  try {
    parsed =
      JSON.parse(String(fs.readFileSync(recentPath(directory)))) ?? parsed;
  } catch {
    // A missing or broken file starts empty.
  }
  return {
    calls: entries(parsed.calls).filter(
      (entry): entry is RecentCall =>
        fresh(entry, now, RETRY_WINDOW_MS) &&
        typeof (entry as RecentCall).o === "string",
    ),
    skills: entries(parsed.skills).filter((entry): entry is RecentSkill =>
      fresh(entry, now, SKILL_WINDOW_MS),
    ),
  };
}

function writeRecent(directory: string, recent: RecentFile): void {
  try {
    fs.mkdirSync(directory, { recursive: true });
    const file = recentPath(directory);
    const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
    fs.writeFileSync(
      temporary,
      JSON.stringify({
        calls: recent.calls.slice(-MAX_RECENT_ENTRIES),
        skills: recent.skills.slice(-MAX_RECENT_ENTRIES),
      }),
    );
    fs.renameSync(temporary, file);
  } catch {
    // Telemetry is best effort and must never disturb the caller.
  }
}

/** Remember that a Kibi skill was loaded in a workspace (hashed). */
export function rememberSkillLoad(
  directory: string,
  workspaceHash: string,
  now: number = Date.now(),
): void {
  const recent = readRecent(directory, now);
  recent.skills.push({ w: workspaceHash, t: now });
  writeRecent(directory, recent);
}

export type OperationRecall = {
  /** 1 for a first call; n when n-1 calls on the same entity just failed. */
  readonly attempt: number | null;
  /** How the previous call on the same entity ended, within the window. */
  readonly priorOutcome: string | null;
  /** Another search ran in the same workspace within two minutes. */
  readonly searchRepeat: boolean | null;
  /** A Kibi skill was loaded in this workspace in the last 30 minutes. */
  readonly skillLoadedBefore: boolean;
};

/**
 * Compare this call with the recent ones and remember it. `retryHash` and
 * `searchHash` are one-way hashes of what the call worked on;
 * `workspaceHashes` are the hashes of the workspace and its parents.
 */
export function recallOperation(
  directory: string,
  input: {
    readonly retryHash?: string | undefined;
    readonly searchHash?: string | undefined;
    readonly workspaceHashes: readonly string[];
    readonly outcome: string;
  },
  now: number = Date.now(),
): OperationRecall {
  const recent = readRecent(directory, now);
  let attempt: number | null = null;
  let priorOutcome: string | null = null;
  if (input.retryHash !== undefined) {
    const prior = recent.calls.filter((call) => call.k === input.retryHash);
    priorOutcome = prior.at(-1)?.o ?? null;
    let failedBefore = 0;
    for (let index = prior.length - 1; index >= 0; index -= 1) {
      if ((prior[index] as RecentCall).o === "success") break;
      failedBefore += 1;
    }
    attempt = failedBefore + 1;
    recent.calls.push({ k: input.retryHash, t: now, o: input.outcome });
  }
  let searchRepeat: boolean | null = null;
  if (input.searchHash !== undefined) {
    searchRepeat = recent.calls.some(
      (call) =>
        call.k === input.searchHash && now - call.t <= SEARCH_REPEAT_WINDOW_MS,
    );
    recent.calls.push({ k: input.searchHash, t: now, o: input.outcome });
  }
  const skillLoadedBefore = recent.skills.some((skill) =>
    input.workspaceHashes.includes(skill.w),
  );
  if (input.retryHash !== undefined || input.searchHash !== undefined) {
    writeRecent(directory, recent);
  }
  return { attempt, priorOutcome, searchRepeat, skillLoadedBefore };
}
