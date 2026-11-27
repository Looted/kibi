import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

import { commandEditPaths, kibiInitLevelTarget } from "./bash-command.js";
import { canonicalKbToolName } from "./kb-mcp-tools.js";
import {
  DEFAULT_KIBI_LEVEL,
  type KibiLevel,
  isKibiLevel,
  kibiLevelInSettings,
  readKibiLevel,
} from "./kibi-level.js";
import {
  extractPatchTexts,
  normalizeWorkspacePath,
  toWorkspacePath,
} from "./path-policy.js";

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
type PatchLines = {
  added: string[];
  removed: string[];
  sections: Array<{
    kind: "Update" | "Add" | "Delete";
    lines: string[];
  }>;
};

const PATCH_SECTION_HEADER = /^\*\*\* (Update|Add|Delete) File: (.+)$/;

function patchLinesFor(
  toolInput: unknown,
  relativePath: string,
): PatchLines | undefined {
  const target = normalizeWorkspacePath(relativePath);
  const found: PatchLines = { added: [], removed: [], sections: [] };
  let matched = false;
  for (const patch of extractPatchTexts(toolInput)) {
    let current: string | undefined;
    let currentSection:
      | { kind: "Update" | "Add" | "Delete"; lines: string[] }
      | undefined;
    for (const line of patch.split(/\r?\n/)) {
      const header = PATCH_SECTION_HEADER.exec(line.trim());
      if (header?.[1] && header[2]) {
        current = normalizeWorkspacePath(header[2]);
        if (current === target) {
          matched = true;
          currentSection = {
            kind: header[1] as "Update" | "Add" | "Delete",
            lines: [],
          };
          found.sections.push(currentSection);
        } else {
          currentSection = undefined;
        }
        continue;
      }
      if (line.trim() === "*** End Patch") {
        current = undefined;
        currentSection = undefined;
        continue;
      }
      if (current !== target || !currentSection) continue;
      currentSection.lines.push(line);
      if (line.startsWith("+")) found.added.push(line.slice(1));
      else if (line.startsWith("-")) found.removed.push(line.slice(1));
    }
  }
  return matched ? found : undefined;
}

/**
 * Reconstruct a file's text after applying a Codex-style patch when all hunks
 * match `currentText` (or when the file is freshly added). Returns undefined
 * when the patch cannot be applied cleanly.
 */
function applyPatchToText(
  currentText: string | undefined,
  lines: PatchLines,
): string | undefined {
  let text = currentText;
  for (const section of lines.sections) {
    if (section.kind === "Delete") {
      text = "";
      continue;
    }
    if (section.kind === "Add") {
      text = `${section.lines
        .filter((line) => line.startsWith("+"))
        .map((line) => line.slice(1))
        .join("\n")}\n`;
      continue;
    }
    if (text === undefined) return undefined;
    const hunks: string[][] = [];
    let currentHunk: string[] | undefined;
    for (const line of section.lines) {
      if (line.startsWith("@@")) {
        if (currentHunk && currentHunk.length > 0) hunks.push(currentHunk);
        currentHunk = [];
      } else if (
        line.startsWith(" ") ||
        line.startsWith("+") ||
        line.startsWith("-")
      ) {
        currentHunk ??= [];
        currentHunk.push(line);
      }
    }
    if (currentHunk && currentHunk.length > 0) hunks.push(currentHunk);
    if (hunks.length === 0) return undefined;
    let fileLines = text.split(/\r?\n/);
    for (const hunk of hunks) {
      const before = hunk
        .filter((line) => !line.startsWith("+"))
        .map((line) => line.slice(1));
      const after = hunk
        .filter((line) => !line.startsWith("-"))
        .map((line) => line.slice(1));
      if (before.length === 0) return undefined;
      let matchAt = -1;
      for (let i = 0; i <= fileLines.length - before.length; i++) {
        if (before.every((line, offset) => fileLines[i + offset] === line)) {
          matchAt = i;
          break;
        }
      }
      if (matchAt < 0) return undefined;
      fileLines = [
        ...fileLines.slice(0, matchAt),
        ...after,
        ...fileLines.slice(matchAt + before.length),
      ];
    }
    text = fileLines.join("\n");
  }
  return text;
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

/**
 * The change of Kibi level an edit makes, or undefined when it makes none.
 * Only the file the project reads its level from counts: the root
 * package.json, or `.kb/setup.json` when there is no root package.json.
 * A patch counts when the resulting file or any line it adds or removes sets
 * a Kibi `level`.
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
    const patched = applyPatchToText(readText(absolutePath), lines);
    if (patched !== undefined) {
      to = levelInJson(patched, settings);
    } else {
      const addedLevel = lines.added
        .map((line) => LEVEL_LINE.exec(line)?.[2])
        .find(isKibiLevel);
      const removed = lines.removed.some((line) =>
        isKibiLevel(LEVEL_LINE.exec(line)?.[2]),
      );
      if (addedLevel !== undefined) {
        to = addedLevel;
      } else if (removed) {
        to = DEFAULT_KIBI_LEVEL;
      }
    }
  }
  if (to === undefined || to === from) return undefined;
  return { kind: "level", path: normalized, from, to };
}

// ---------------------------------------------------------------------------
// A requirement's required_evidence

const REQUIREMENT_PATH = /^\.kb\/requirements\/.+\.md$/;

type ParsedFrontmatter = {
  id?: string | undefined;
  required_evidence?: unknown;
  requiredEvidenceInvalid?: boolean | undefined;
  firmness?: string | undefined;
  originKind?: string | undefined;
  approvedBy?: string | undefined;
  malformed?: boolean | undefined;
};

/** Parse a document's YAML frontmatter using the real YAML parser. */
function frontmatter(text: string): ParsedFrontmatter | undefined {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  if (!match?.[1]) return undefined;
  let parsed: unknown;
  try {
    parsed = parseYaml(match[1]);
  } catch {
    return { malformed: true };
  }
  if (!isRecord(parsed)) return { malformed: true };
  const id =
    typeof parsed.id === "string" && parsed.id.trim() !== ""
      ? parsed.id.trim()
      : undefined;
  const rawEvidence = parsed.required_evidence;
  const hasExplicitEvidence =
    rawEvidence !== undefined && rawEvidence !== null && rawEvidence !== "";
  const requiredEvidenceInvalid =
    hasExplicitEvidence && !isEvidenceLevel(rawEvidence);
  const firmness =
    typeof parsed.firmness === "string" ? parsed.firmness : undefined;
  const origin = isRecord(parsed.origin) ? parsed.origin : undefined;
  const originKind = typeof origin?.kind === "string" ? origin.kind : undefined;
  const approvedBy =
    typeof origin?.approved_by === "string" ? origin.approved_by : undefined;
  return {
    id,
    required_evidence: rawEvidence,
    requiredEvidenceInvalid,
    firmness,
    originKind,
    approvedBy,
  };
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

function floorOfDocument(fields: ParsedFrontmatter): EvidenceLevel {
  // Unreadable frontmatter or an invalid explicit required_evidence fails
  // closed (treated as lowest floor) so tricky YAML cannot bypass the guard.
  if (fields.malformed || fields.requiredEvidenceInvalid) return "unverified";
  return evidenceFloor({
    required_evidence: fields.required_evidence,
    firmness: fields.firmness,
    originKind: fields.originKind,
    approvedBy: fields.approvedBy,
  });
}

function walkMarkdownFiles(dir: string, out: string[]): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkMarkdownFiles(full, out);
    else if (entry.isFile() && entry.name.endsWith(".md")) out.push(full);
  }
}

function currentRequirement(
  workspaceRoot: string,
  requirementId: string,
): ParsedFrontmatter | undefined {
  const directPath = path.join(
    workspaceRoot,
    ".kb",
    "requirements",
    `${requirementId}.md`,
  );
  const directText = readText(directPath);
  if (directText !== undefined) {
    const direct = frontmatter(directText);
    if (
      direct !== undefined &&
      (direct.id === undefined || direct.id === requirementId)
    )
      return direct;
  }
  const files: string[] = [];
  walkMarkdownFiles(path.join(workspaceRoot, ".kb", "requirements"), files);
  for (const file of files) {
    if (file === directPath) continue;
    const text = readText(file);
    if (text === undefined) continue;
    const parsed = frontmatter(text);
    if (parsed?.id === requirementId) return parsed;
  }
  return undefined;
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

/** Parse one YAML mapping line (`key: value` or `"key": value # comment`). */
function parseYamlLine(line: string): Record<string, unknown> | undefined {
  const trimmed = line.trim();
  if (trimmed === "" || trimmed.startsWith("#")) return undefined;
  try {
    const parsed = parseYaml(trimmed);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The lowering of a requirement's floor an edit of its document makes, or
 * undefined when it makes none. A patch applies hunks to the document when
 * possible and falls back to YAML-parsing added/removed frontmatter lines.
 */
function evidenceLoweringOfEdit(
  workspaceRoot: string,
  relativePath: string,
  toolInput: unknown,
): EvidenceLowering | undefined {
  const normalized = normalizeWorkspacePath(relativePath);
  if (!REQUIREMENT_PATH.test(normalized)) return undefined;
  const absolutePath = path.join(workspaceRoot, normalized);
  const currentText = readText(absolutePath);
  if (currentText === undefined) return undefined;
  const current = frontmatter(currentText);
  if (current === undefined) return undefined;
  const requirementId = current.id ?? path.basename(normalized, ".md");
  const from = floorOfDocument(current);
  const after = proposedContent(absolutePath, toolInput);
  if (after !== undefined) {
    const proposed = frontmatter(after);
    const to =
      proposed === undefined ? "unverified" : floorOfDocument(proposed);
    return lowering(requirementId, from, to);
  }
  const lines = patchLinesFor(toolInput, normalized);
  if (lines === undefined) return undefined;
  const patched = applyPatchToText(currentText, lines);
  if (patched !== undefined) {
    const proposed = frontmatter(patched);
    const to =
      proposed === undefined ? "unverified" : floorOfDocument(proposed);
    return lowering(requirementId, from, to);
  }
  const next: ParsedFrontmatter = { ...current };
  let touched = false;
  for (const line of lines.removed) {
    const parsed = parseYamlLine(line);
    if (!parsed) continue;
    if ("required_evidence" in parsed) {
      next.required_evidence = undefined;
      next.requiredEvidenceInvalid = false;
      touched = true;
    }
    if ("firmness" in parsed) {
      next.firmness = undefined;
      touched = true;
    }
    if ("approved_by" in parsed) {
      next.approvedBy = undefined;
      touched = true;
    }
    if ("origin" in parsed) {
      next.originKind = undefined;
      next.approvedBy = undefined;
      touched = true;
    }
  }
  for (const line of lines.added) {
    const parsed = parseYamlLine(line);
    if (!parsed) continue;
    if ("required_evidence" in parsed) {
      const value = parsed.required_evidence;
      next.required_evidence = value;
      next.requiredEvidenceInvalid =
        value !== undefined &&
        value !== null &&
        value !== "" &&
        !isEvidenceLevel(value);
      touched = true;
    }
    if ("firmness" in parsed) {
      next.firmness =
        typeof parsed.firmness === "string" ? parsed.firmness : undefined;
      touched = true;
    }
    if ("approved_by" in parsed) {
      next.approvedBy =
        typeof parsed.approved_by === "string" ? parsed.approved_by : undefined;
      touched = true;
    }
    if ("origin" in parsed && isRecord(parsed.origin)) {
      next.originKind =
        typeof parsed.origin.kind === "string" ? parsed.origin.kind : undefined;
      next.approvedBy =
        typeof parsed.origin.approved_by === "string"
          ? parsed.origin.approved_by
          : undefined;
      touched = true;
    }
  }
  return touched
    ? lowering(requirementId, from, floorOfDocument(next))
    : undefined;
}

function loweringFromUpsertFields(
  workspaceRoot: string,
  id: string,
  properties: Record<string, unknown>,
): EvidenceLowering | undefined {
  const current = currentRequirement(workspaceRoot, id);
  if (current === undefined) return undefined;
  const sent = properties.required_evidence;
  // A value that is no evidence level is refused by the write itself.
  if (typeof sent === "string" && sent !== "" && !isEvidenceLevel(sent))
    return undefined;
  const next: ParsedFrontmatter = { ...current };
  if ("required_evidence" in properties) {
    const value = properties.required_evidence;
    next.required_evidence =
      typeof value === "string" && value !== "" ? value : undefined;
    next.requiredEvidenceInvalid = false;
  }
  if ("firmness" in properties) {
    const value = properties.firmness;
    next.firmness =
      typeof value === "string" && value !== "" ? value : undefined;
  }
  if ("origin" in properties) {
    next.originKind = undefined;
    next.approvedBy = undefined;
    const origin = properties.origin;
    if (isRecord(origin)) {
      if (typeof origin.kind === "string") next.originKind = origin.kind;
      if (typeof origin.approved_by === "string")
        next.approvedBy = origin.approved_by;
    }
  }
  return lowering(id, floorOfDocument(current), floorOfDocument(next));
}

function loweringFromPlan(
  workspaceRoot: string,
  plan: unknown,
): EvidenceLowering | undefined {
  if (!isRecord(plan)) return undefined;
  const lists = [plan.actions, plan.steps, plan.entities].filter(Array.isArray);
  for (const list of lists) {
    for (const item of list) {
      if (!isRecord(item)) continue;
      const target = isRecord(item.payload)
        ? item.payload
        : isRecord(item.entity)
          ? item.entity
          : item;
      const id =
        typeof target.id === "string"
          ? target.id
          : typeof item.entityId === "string"
            ? item.entityId
            : typeof item.id === "string"
              ? item.id
              : undefined;
      if (!id) continue;
      const op = String(item.operation ?? item.kind ?? item.action ?? "");
      if (/delete|remove/i.test(op)) {
        const current = currentRequirement(workspaceRoot, id);
        if (current) {
          const found = lowering(id, floorOfDocument(current), "unverified");
          if (found) return found;
        }
        continue;
      }
      const props = isRecord(target.properties) ? target.properties : target;
      const found = loweringFromUpsertFields(workspaceRoot, id, props);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * The lowering of a requirement's floor a Kibi write call makes, or undefined
 * when it makes none: `kb_upsert`, `kb_delete`, or `kb_apply_plan` lowering
 * an existing requirement's floor. `kb_record` only creates requirements.
 */
function evidenceLoweringOfKbCall(
  workspaceRoot: string,
  operation: string | undefined,
  toolInput: unknown,
): EvidenceLowering | undefined {
  if (!isRecord(toolInput)) return undefined;
  // A dry run validates and writes nothing.
  if (toolInput.dryRun === true) return undefined;
  const targetWorkspace = kbCallWorkspace(workspaceRoot, toolInput);
  if (operation === "kb_delete") {
    const ids: string[] = [];
    if (typeof toolInput.id === "string") ids.push(toolInput.id);
    if (Array.isArray(toolInput.ids)) {
      for (const entry of toolInput.ids)
        if (typeof entry === "string") ids.push(entry);
    }
    for (const id of ids) {
      const current = currentRequirement(targetWorkspace, id);
      if (current === undefined) continue;
      const found = lowering(id, floorOfDocument(current), "unverified");
      if (found) return found;
    }
    return undefined;
  }
  if (operation === "kb_apply_plan") {
    return loweringFromPlan(targetWorkspace, toolInput.plan);
  }
  if (operation !== "kb_upsert") return undefined;
  const { id, properties } = toolInput;
  if (typeof id !== "string" || !isRecord(properties)) return undefined;
  const type = toolInput.type;
  if (type !== undefined && type !== "req") return undefined;
  return loweringFromUpsertFields(targetWorkspace, id, properties);
}

/** The workspace a Kibi call names with workspaceRoot, else the hook's own. */
function kbCallWorkspace(
  workspaceRoot: string,
  toolInput: Record<string, unknown>,
): string {
  const named = toolInput.workspaceRoot;
  return typeof named === "string" && named.trim() !== ""
    ? path.resolve(workspaceRoot, named.trim())
    : workspaceRoot;
}

const LEVEL_SHELL_HINT = /\b(?:level|remember|test)\b/i;
const EVIDENCE_SHELL_HINT =
  /\b(?:required_evidence|firmness|origin|approved_by|unverified|asserted|tested)\b/i;
const DESTRUCTIVE_OR_REWRITE_SHELL =
  /(?:>|>>|\b(?:tee|rm|mv|cp|truncate|dd)\b|\bgit\s+(?:checkout|restore)\b)/;

/**
 * The guarded change a shell command would make (either `kibi init --level`
 * changing a recorded level, or an in-place shell write touching the active
 * level file or a requirement's evidence floor).
 */
export function guardedChangeOfShellCommand(
  workspaceRoot: string,
  command: string,
  cwd: string = workspaceRoot,
): GuardedChange | undefined {
  const hasPackage = fs.existsSync(path.join(workspaceRoot, "package.json"));
  const levelPath = hasPackage ? "package.json" : ".kb/setup.json";
  const fromLevel = readKibiLevel(workspaceRoot).level;

  const initLevel = kibiInitLevelTarget(command)?.trim().toLowerCase();
  if (
    initLevel !== undefined &&
    isKibiLevel(initLevel) &&
    initLevel !== fromLevel
  ) {
    return {
      kind: "level",
      path: levelPath,
      from: fromLevel,
      to: initLevel,
    };
  }

  for (const absolute of commandEditPaths(command, cwd)) {
    const target = toWorkspacePath(workspaceRoot, absolute, cwd);
    if (!target) continue;
    const relative = normalizeWorkspacePath(target.relative);
    if (
      relative === levelPath &&
      (LEVEL_SHELL_HINT.test(command) ||
        DESTRUCTIVE_OR_REWRITE_SHELL.test(command))
    ) {
      return {
        kind: "level",
        path: levelPath,
        from: fromLevel,
        to: fromLevel === "test" ? "remember" : "test",
      };
    }
    if (
      REQUIREMENT_PATH.test(relative) &&
      (EVIDENCE_SHELL_HINT.test(command) ||
        DESTRUCTIVE_OR_REWRITE_SHELL.test(command))
    ) {
      const text = readText(absolute);
      const current = text === undefined ? undefined : frontmatter(text);
      if (current === undefined) continue;
      const from = floorOfDocument(current);
      if (rank(from) > 0) {
        return {
          kind: "evidence",
          requirementId: current.id ?? path.basename(relative, ".md"),
          from,
          to: "unverified",
        };
      }
    }
  }
  return undefined;
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
 * The change of Kibi level since the last commit after a write of
 * `relativePath` whose earlier text is not known: the level the committed
 * package.json or `.kb/setup.json` set (test when HEAD has neither) against
 * the level now. Undefined for other files and without a commit to compare.
 */
function levelChangeSinceCommit(
  workspaceRoot: string,
  relativePath: string,
): LevelChange | undefined {
  const normalized = normalizeWorkspacePath(relativePath);
  if (normalized !== "package.json" && normalized !== ".kb/setup.json")
    return undefined;
  const head = spawnSync("git", ["rev-parse", "--verify", "--quiet", "HEAD"], {
    cwd: workspaceRoot,
    stdio: "ignore",
    timeout: 5000,
  });
  if (head.status !== 0) return undefined;
  const committedPackage = committedContent(workspaceRoot, "package.json");
  const committedSetup = committedContent(workspaceRoot, ".kb/setup.json");
  const from =
    committedPackage !== undefined
      ? levelInJson(committedPackage, "package")
      : committedSetup !== undefined
        ? levelInJson(committedSetup, "setup")
        : DEFAULT_KIBI_LEVEL;
  const to = readKibiLevel(workspaceRoot).level;
  return from === to
    ? undefined
    : { kind: "level", path: normalized, from, to };
}

/**
 * The change the file `relativePath` holds now against its earlier text
 * `before`: a different Kibi level in the file the project reads it from,
 * or a requirement whose floor is lower than it was. Without earlier text,
 * only a level change since the last commit counts.
 */
export function guardedChangeSince(
  workspaceRoot: string,
  relativePath: string,
  before: string | undefined,
): GuardedChange | undefined {
  if (before === undefined)
    return levelChangeSinceCommit(workspaceRoot, relativePath);
  const normalized = normalizeWorkspacePath(relativePath);
  const now = readText(path.join(workspaceRoot, normalized));
  if (now === undefined) {
    if (!REQUIREMENT_PATH.test(normalized)) return undefined;
    const earlier = frontmatter(before);
    if (earlier === undefined) return undefined;
    const requirementId = earlier.id ?? path.basename(normalized, ".md");
    return lowering(requirementId, floorOfDocument(earlier), "unverified");
  }
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
  if (!REQUIREMENT_PATH.test(normalized)) return undefined;
  const earlier = frontmatter(before);
  if (earlier === undefined) return undefined;
  const current = frontmatter(now);
  const requirementId =
    current?.id ?? earlier.id ?? path.basename(normalized, ".md");
  const to = current === undefined ? "unverified" : floorOfDocument(current);
  return lowering(requirementId, floorOfDocument(earlier), to);
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
