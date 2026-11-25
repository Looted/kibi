import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { canonicalKbToolName } from "./kb-mcp-tools.js";
import {
  DEFAULT_KIBI_LEVEL,
  type KibiLevel,
  isKibiLevel,
  kibiLevelInSettings,
  readKibiLevel,
} from "./kibi-level.js";
import { extractPatchTexts, normalizeWorkspacePath } from "./path-policy.js";

/**
 * Host-neutral checks for the two edits a person decides: one that changes
 * the project's Kibi level, and one that lowers a requirement's
 * required_evidence. Each host adapter decides how to put them to the person,
 * as it does for an edit of a firm requirement's code.
 */

/** The evidence levels a requirement accepts, weakest first. */
export const EVIDENCE_LEVELS = [
  "unverified",
  "asserted",
  "tested",
  "proved",
] as const;

export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];

export type LevelChange = {
  readonly kind: "level";
  readonly path: string;
  readonly from: KibiLevel;
  readonly to: KibiLevel;
};

export type EvidenceLowering = {
  readonly kind: "evidence";
  readonly requirementId: string;
  readonly from: EvidenceLevel;
  readonly to: EvidenceLevel;
};

export type GuardedChange = LevelChange | EvidenceLowering;

/** Files larger than this are not read. */
const MAX_READ_BYTES = 2 * 1024 * 1024;

function readText(absolutePath: string): string | undefined {
  try {
    if (fs.statSync(absolutePath).size > MAX_READ_BYTES) return undefined;
    return fs.readFileSync(absolutePath, "utf8");
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEvidenceLevel(value: unknown): value is EvidenceLevel {
  return (EVIDENCE_LEVELS as readonly unknown[]).includes(value);
}

function rank(level: EvidenceLevel): number {
  return EVIDENCE_LEVELS.indexOf(level);
}

type Replacement = { before: string; after: string; all: boolean };

/**
 * The file an edit leaves: its replacements (`old_string`/`new_string`, the
 * camel-case spelling, or an `edits` list) applied to the file on disk, or
 * its whole-file `content`. Undefined for any other shape, such as a patch
 * or a shell command, and for a replacement that does not match the file.
 */
export function proposedContent(
  absolutePath: string,
  toolInput: unknown,
): string | undefined {
  if (!isRecord(toolInput)) return undefined;
  for (const key of ["content", "contents", "file_text"]) {
    const value = toolInput[key];
    if (typeof value === "string") return value;
  }
  const records = [
    toolInput,
    ...(Array.isArray(toolInput.edits) ? toolInput.edits : []),
  ].filter(isRecord);
  const replacements: Replacement[] = [];
  for (const record of records) {
    const before = record.old_string ?? record.oldString;
    const after = record.new_string ?? record.newString;
    if (typeof before !== "string" || typeof after !== "string") continue;
    replacements.push({
      before,
      after,
      all: record.replace_all === true || record.replaceAll === true,
    });
  }
  if (replacements.length === 0) return undefined;
  let text = readText(absolutePath);
  if (text === undefined) return undefined;
  for (const { before, after, all } of replacements) {
    if (before === "" || !text.includes(before)) return undefined;
    text = all
      ? text.split(before).join(after)
      : text.replace(before, () => after);
  }
  return text;
}

/** The added and removed lines a patch makes to one file. */
type PatchLines = { added: string[]; removed: string[] };

const PATCH_SECTION_HEADER = /^\*\*\* (Update|Add|Delete) File: (.+)$/;

function patchLinesFor(
  toolInput: unknown,
  relativePath: string,
): PatchLines | undefined {
  const target = normalizeWorkspacePath(relativePath);
  const found: PatchLines = { added: [], removed: [] };
  let matched = false;
  for (const patch of extractPatchTexts(toolInput)) {
    let current: string | undefined;
    for (const line of patch.split(/\r?\n/)) {
      const header = PATCH_SECTION_HEADER.exec(line.trim());
      if (header?.[2]) {
        current = normalizeWorkspacePath(header[2]);
        if (current === target) matched = true;
        continue;
      }
      if (current !== target) continue;
      if (line.startsWith("+")) found.added.push(line.slice(1));
      else if (line.startsWith("-")) found.removed.push(line.slice(1));
    }
  }
  return matched ? found : undefined;
}

// ---------------------------------------------------------------------------
// The Kibi level

const LEVEL_LINE = /"level"\s*:\s*("([^"]*)")?/;

function levelInJson(text: string, settings: "package" | "setup"): KibiLevel {
  return kibiLevelInSettings(
    text,
    settings === "package" ? "package.json" : "setup.json",
  ).level;
}

function asLevel(value: unknown): KibiLevel {
  return isKibiLevel(value) ? value : DEFAULT_KIBI_LEVEL;
}

/**
 * The change of Kibi level an edit makes, or undefined when it makes none.
 * Only the file the project reads its level from counts: the root
 * package.json, or `.kb/setup.json` when there is no root package.json.
 * A patch counts when a line it adds or removes in that file sets `level`.
 */
function levelChangeOfEdit(
  workspaceRoot: string,
  relativePath: string,
  toolInput: unknown,
): LevelChange | undefined {
  const normalized = normalizeWorkspacePath(relativePath);
  const hasPackage = fs.existsSync(path.join(workspaceRoot, "package.json"));
  const settings =
    normalized === "package.json"
      ? "package"
      : normalized === ".kb/setup.json" && !hasPackage
        ? "setup"
        : undefined;
  if (settings === undefined) return undefined;
  const from = readKibiLevel(workspaceRoot).level;
  const absolutePath = path.join(workspaceRoot, normalized);
  const after = proposedContent(absolutePath, toolInput);
  let to: KibiLevel | undefined;
  if (after !== undefined) {
    to = levelInJson(after, settings);
  } else {
    const lines = patchLinesFor(toolInput, normalized);
    if (lines === undefined) return undefined;
    const added = lines.added
      .map((line) => LEVEL_LINE.exec(line))
      .find((match) => match !== null);
    const removed = lines.removed.some((line) => LEVEL_LINE.test(line));
    if (added) to = asLevel(added[2]);
    else if (removed) to = DEFAULT_KIBI_LEVEL;
  }
  if (to === undefined || to === from) return undefined;
  return { kind: "level", path: normalized, from, to };
}

// ---------------------------------------------------------------------------
// A requirement's required_evidence

const REQUIREMENT_PATH = /^\.kb\/requirements\/([^/]+)\.md$/;

type Frontmatter = Map<string, string>;

/** The top-level scalar fields of a document's frontmatter. */
function frontmatter(text: string): Frontmatter | undefined {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  if (!match?.[1]) return undefined;
  const fields: Frontmatter = new Map();
  let section: string | undefined;
  for (const line of match[1].split(/\r?\n/)) {
    const top = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (top?.[1] !== undefined) {
      section = top[1];
      fields.set(top[1], unquote(top[2] ?? ""));
      continue;
    }
    const nested = /^\s+([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (section !== undefined && nested?.[1] !== undefined)
      fields.set(`${section}.${nested[1]}`, unquote(nested[2] ?? ""));
  }
  return fields;
}

function unquote(value: string): string {
  const trimmed = value.trim();
  return /^(['"]).*\1$/.test(trimmed) ? trimmed.slice(1, -1) : trimmed;
}

/**
 * A requirement's floor: its required_evidence, or, when it sets none,
 * tested for a firm requirement or one a person approved that states no
 * firmness, and unverified otherwise.
 */
export function evidenceFloor(fields: {
  required_evidence?: unknown;
  firmness?: unknown;
  originKind?: unknown;
  approvedBy?: unknown;
}): EvidenceLevel {
  if (isEvidenceLevel(fields.required_evidence))
    return fields.required_evidence;
  const firmness =
    typeof fields.firmness === "string" && fields.firmness !== ""
      ? fields.firmness
      : undefined;
  if (firmness === "firm") return "tested";
  if (firmness === undefined) {
    if (fields.originKind !== "agent") return "tested";
    if (typeof fields.approvedBy === "string" && fields.approvedBy !== "")
      return "tested";
  }
  return "unverified";
}

function floorOfDocument(fields: Frontmatter): EvidenceLevel {
  return evidenceFloor({
    required_evidence: fields.get("required_evidence"),
    firmness: fields.get("firmness"),
    originKind: fields.get("origin.kind"),
    approvedBy: fields.get("origin.approved_by"),
  });
}

function currentRequirement(
  workspaceRoot: string,
  requirementId: string,
): Frontmatter | undefined {
  const text = readText(
    path.join(workspaceRoot, ".kb", "requirements", `${requirementId}.md`),
  );
  return text === undefined ? undefined : frontmatter(text);
}

function lowering(
  requirementId: string,
  from: EvidenceLevel,
  to: EvidenceLevel,
): EvidenceLowering | undefined {
  return rank(to) < rank(from)
    ? { kind: "evidence", requirementId, from, to }
    : undefined;
}

/**
 * The lowering of a requirement's floor an edit of its document makes, or
 * undefined when it makes none. A patch counts when a line it adds sets a
 * lower required_evidence, or when it only removes the line.
 */
function evidenceLoweringOfEdit(
  workspaceRoot: string,
  relativePath: string,
  toolInput: unknown,
): EvidenceLowering | undefined {
  const normalized = normalizeWorkspacePath(relativePath);
  const requirementId = REQUIREMENT_PATH.exec(normalized)?.[1];
  if (requirementId === undefined) return undefined;
  const current = currentRequirement(workspaceRoot, requirementId);
  if (current === undefined) return undefined;
  const from = floorOfDocument(current);
  const after = proposedContent(
    path.join(workspaceRoot, normalized),
    toolInput,
  );
  if (after !== undefined) {
    const proposed = frontmatter(after);
    return proposed === undefined
      ? undefined
      : lowering(requirementId, from, floorOfDocument(proposed));
  }
  const lines = patchLinesFor(toolInput, normalized);
  if (lines === undefined) return undefined;
  const field = /^required_evidence:\s*(.*)$/;
  const added = lines.added
    .map((line) => field.exec(line))
    .find((match) => match !== null);
  if (added) {
    const next = new Map(current);
    next.set("required_evidence", unquote(added[1] ?? ""));
    return lowering(requirementId, from, floorOfDocument(next));
  }
  if (lines.removed.some((line) => field.test(line))) {
    const next = new Map(current);
    next.delete("required_evidence");
    return lowering(requirementId, from, floorOfDocument(next));
  }
  return undefined;
}

/** The Kibi operation that can change an existing requirement. */
const REQUIREMENT_WRITE = "kb_upsert";

/**
 * The lowering of a requirement's floor a kb_upsert call makes, or undefined
 * when it makes none: a requirement already in the knowledge base whose call
 * sets a lower required_evidence. kb_record only creates requirements, so it
 * lowers none.
 */
function evidenceLoweringOfKbCall(
  workspaceRoot: string,
  operation: string | undefined,
  toolInput: unknown,
): EvidenceLowering | undefined {
  if (operation !== REQUIREMENT_WRITE || !isRecord(toolInput)) return undefined;
  // A dry run validates and writes nothing.
  if (toolInput.dryRun === true) return undefined;
  const { id, properties } = toolInput;
  if (typeof id !== "string" || !isRecord(properties)) return undefined;
  const type = toolInput.type;
  if (type !== undefined && type !== "req") return undefined;
  const requested = properties.required_evidence;
  if (!isEvidenceLevel(requested)) return undefined;
  const current = currentRequirement(workspaceRoot, id);
  if (current === undefined) return undefined;
  return lowering(id, floorOfDocument(current), requested);
}

/**
 * The change a tool call makes that the person decides: a Kibi tool call
 * (any host's name for it) that lowers a requirement's floor, or an edit of
 * `relativePath` that changes the level or lowers a floor.
 */
export function guardedChangeOf(input: {
  workspaceRoot: string;
  toolName: string | undefined;
  toolInput: unknown;
  relativePath?: string;
}): GuardedChange | undefined {
  const operation = canonicalKbToolName(input.toolName);
  if (operation !== undefined)
    return evidenceLoweringOfKbCall(
      input.workspaceRoot,
      operation,
      input.toolInput,
    );
  if (input.relativePath === undefined) return undefined;
  return (
    levelChangeOfEdit(
      input.workspaceRoot,
      input.relativePath,
      input.toolInput,
    ) ??
    evidenceLoweringOfEdit(
      input.workspaceRoot,
      input.relativePath,
      input.toolInput,
    )
  );
}

// ---------------------------------------------------------------------------
// After the change: hosts whose hook runs only once a tool has run

/**
 * The text a file held before a replacement edit that has already been
 * applied: each new_string turned back into its old_string. Undefined for a
 * whole-file write, whose earlier text the edit does not carry, and when a
 * replacement is no longer in the file.
 */
export function contentBeforeEdit(
  absolutePath: string,
  toolInput: unknown,
): string | undefined {
  if (!isRecord(toolInput)) return undefined;
  const reverse = (record: Record<string, unknown>) => ({
    old_string: record.new_string ?? record.newString,
    new_string: record.old_string ?? record.oldString,
    replace_all: record.replace_all ?? record.replaceAll,
  });
  const edits = Array.isArray(toolInput.edits)
    ? toolInput.edits.filter(isRecord).map(reverse).reverse()
    : [];
  return proposedContent(absolutePath, { ...reverse(toolInput), edits });
}

/**
 * The file's text in the last commit, or undefined when the workspace is no
 * git checkout or the commit has no such file.
 */
export function committedContent(
  workspaceRoot: string,
  relativePath: string,
): string | undefined {
  const result = spawnSync(
    "git",
    ["show", `HEAD:${normalizeWorkspacePath(relativePath)}`],
    {
      cwd: workspaceRoot,
      encoding: "utf8",
      maxBuffer: MAX_READ_BYTES,
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000,
    },
  );
  return result.status === 0 ? result.stdout : undefined;
}

/**
 * The change the file `relativePath` holds now against its earlier text
 * `before`: a different Kibi level in the file the project reads it from,
 * or a requirement whose floor is lower than it was.
 */
export function guardedChangeSince(
  workspaceRoot: string,
  relativePath: string,
  before: string,
): GuardedChange | undefined {
  const normalized = normalizeWorkspacePath(relativePath);
  const now = readText(path.join(workspaceRoot, normalized));
  if (now === undefined) return undefined;
  const settings =
    normalized === "package.json"
      ? "package"
      : normalized === ".kb/setup.json" &&
          !fs.existsSync(path.join(workspaceRoot, "package.json"))
        ? "setup"
        : undefined;
  if (settings !== undefined) {
    const from = levelInJson(before, settings);
    const to = readKibiLevel(workspaceRoot).level;
    return from === to
      ? undefined
      : { kind: "level", path: normalized, from, to };
  }
  const requirementId = REQUIREMENT_PATH.exec(normalized)?.[1];
  if (requirementId === undefined) return undefined;
  const earlier = frontmatter(before);
  const current = frontmatter(now);
  if (earlier === undefined || current === undefined) return undefined;
  return lowering(
    requirementId,
    floorOfDocument(earlier),
    floorOfDocument(current),
  );
}

// ---------------------------------------------------------------------------
// What the person and the agent read

function describe(change: GuardedChange): string {
  if (change.kind === "level")
    return `changes the Kibi level from ${change.from} to ${change.to} (${change.path})`;
  return `lowers the evidence ${change.requirementId} must reach from ${change.from} to ${change.to}`;
}

/**
 * The permission-prompt text for an edit or a Kibi call the person decides.
 * The person reads it, so it says what the change does to the checks.
 */
export function guardedChangeConfirmation(change: GuardedChange): string {
  if (change.kind === "level")
    return `Kibi: this edit ${describe(change)}. ${
      change.to === "remember"
        ? "At remember, Kibi stops asking for the scenarios, tests and proofs that show each requirement holds."
        : "At test, Kibi asks for the scenarios and linked tests that show each requirement holds, and blocks commits that leave them out."
    } Allow it only if you chose this level.`;
  return `Kibi: this change ${describe(change)}, so kibi check stops asking for the evidence it asked for before. Allow it only if you agree the requirement needs less evidence.`;
}

/** What the agent is told when a change was put to the person. */
export function guardedChangeContext(change: GuardedChange): string {
  return `Kibi asked the person to confirm this change because it ${describe(change)}. That is the person's decision: do not make it again a different way if they decline, and say in your reply what you changed.`;
}

/**
 * What the agent is told before such a change on a host whose hook cannot
 * ask the person.
 */
export function guardedChangeNotice(change: GuardedChange): string {
  return `Kibi: this change ${describe(change)}. That is the person's decision, not yours: ask the person before making it, and leave it out unless they agree.`;
}

/**
 * What the agent is told after such a change on a host whose hook runs only
 * once a tool has run.
 */
export function guardedChangeAfterNotice(change: GuardedChange): string {
  return `Kibi: the change you just made ${describe(change)}. That is the person's decision, not yours: ask the person now whether to keep it, and undo it unless they agree.`;
}
