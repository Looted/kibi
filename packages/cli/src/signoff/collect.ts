import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { effectiveFirmness } from "../decision-firmness.js";
import {
  type ExtractedEntity,
  extractFromMarkdownString,
} from "../extractors/markdown.js";
import { readAllShards } from "../relationships/shards.js";
import {
  SIGNOFF_VERSION,
  type SignoffChange,
  type SignoffFirmness,
  type SignoffProof,
  type SignoffQuestion,
  type SignoffQuestionInput,
  type SignoffQuestions,
  type SignoffRequirement,
  type SignoffStatementRef,
  type SignoffSummary,
} from "./model.js";

const REQUIREMENTS_DIR = ".kb/requirements";
const SCENARIOS_DIR = ".kb/scenarios";
const EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";
const RETIRED_STATUS =
  /supersed|deprecat|reject|obsolete|retired|archived|removed|closed/i;
const REQUIREMENT_ID = /^REQ-[A-Za-z0-9._-]+$/;

export type SignoffScope = "staged" | "working";

/** Changed code symbols per requirement they implement. */
export type AffectedRequirements = ReadonlyMap<string, readonly string[]>;

export type SignoffCollectDeps = Readonly<{
  /** Run git in the workspace and return stdout; throws on failure. */
  git?: (args: readonly string[]) => string;
  /** Requirements the changed code implements, from the impact analysis. */
  loadAffected?: (scope: SignoffScope) => Promise<AffectedRequirements>;
  /** Proof rows by requirement id, from coverage. */
  loadProof?: () => Promise<ReadonlyMap<string, SignoffProof>>;
  now?: () => Date;
}>;

function gitRunner(workspaceRoot: string) {
  return (args: readonly string[]): string =>
    execFileSync("git", [...args], {
      cwd: workspaceRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    });
}

function tryGit(
  git: (args: readonly string[]) => string,
  args: readonly string[],
): string | undefined {
  try {
    return git(args);
  } catch {
    return undefined;
  }
}

function parseEntity(
  content: string | undefined,
  filePath: string,
): ExtractedEntity | undefined {
  if (content === undefined) return undefined;
  try {
    return extractFromMarkdownString(content, filePath).entity;
  } catch {
    return undefined;
  }
}

function flat(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** The requirement's statement: its semantic text, else its title. */
export function requirementStatement(entity: ExtractedEntity): string {
  return flat(entity.semantic_text ?? entity.title ?? "");
}

function firmnessOf(entity: ExtractedEntity): SignoffFirmness | undefined {
  return effectiveFirmness(entity.type, entity.firmness, entity.origin);
}

function statementRef(entity: ExtractedEntity): SignoffStatementRef {
  const firmness = firmnessOf(entity);
  return {
    id: entity.id,
    title: flat(entity.title ?? entity.id),
    statement: requirementStatement(entity),
    ...(firmness ? { firmness } : {}),
  };
}

type ChangedFile = Readonly<{ status: "A" | "M" | "D"; file: string }>;

/** Requirement documents the change adds, modifies or deletes. */
function changedRequirementFiles(
  git: (args: readonly string[]) => string,
  scope: SignoffScope,
  base: string,
): ChangedFile[] {
  const args =
    scope === "staged"
      ? ["diff", "--cached", "--name-status", "--no-renames", base]
      : ["diff", "--name-status", "--no-renames", base];
  const output = git([...args, "--", REQUIREMENTS_DIR]);
  const files: ChangedFile[] = [];
  for (const line of output.split("\n")) {
    const [status, file] = line.split("\t");
    if (!file?.endsWith(".md")) continue;
    if (status === "A" || status === "M" || status === "D") {
      files.push({ status, file });
    }
  }
  if (scope === "working") {
    const untracked = git([
      "ls-files",
      "--others",
      "--exclude-standard",
      "--",
      REQUIREMENTS_DIR,
    ]);
    for (const file of untracked.split("\n")) {
      if (file.endsWith(".md")) files.push({ status: "A", file });
    }
  }
  return files.sort((left, right) => left.file.localeCompare(right.file));
}

function currentContent(
  workspaceRoot: string,
  git: (args: readonly string[]) => string,
  scope: SignoffScope,
  file: string,
): string | undefined {
  if (scope === "staged") return tryGit(git, ["show", `:${file}`]);
  try {
    return readFileSync(path.join(workspaceRoot, file), "utf8");
  } catch {
    return undefined;
  }
}

/** Requirement entities in the working tree, read lazily by id. */
function workspaceRequirements(workspaceRoot: string) {
  const cache = new Map<string, ExtractedEntity | undefined>();
  return (id: string): ExtractedEntity | undefined => {
    if (!REQUIREMENT_ID.test(id)) return undefined;
    if (!cache.has(id)) {
      const file = path.join(workspaceRoot, REQUIREMENTS_DIR, `${id}.md`);
      cache.set(
        id,
        existsSync(file)
          ? parseEntity(readFileSync(file, "utf8"), file)
          : undefined,
      );
    }
    return cache.get(id);
  };
}

function scenarioTitle(workspaceRoot: string, id: string): string {
  const file = path.join(workspaceRoot, SCENARIOS_DIR, `${id}.md`);
  if (!/^SCEN-[A-Za-z0-9._-]+$/.test(id) || !existsSync(file)) return id;
  return flat(parseEntity(readFileSync(file, "utf8"), file)?.title ?? id);
}

function readRelationships(workspaceRoot: string) {
  try {
    return readAllShards(path.join(workspaceRoot, ".kb"));
  } catch {
    return [];
  }
}

function headExists(git: (args: readonly string[]) => string): boolean {
  return (
    tryGit(git, ["rev-parse", "--verify", "--quiet", "HEAD"]) !== undefined
  );
}

// implements REQ-kibi-signoff-views
/**
 * The end-of-work signoff summary: the requirements the change adds, rewrites,
 * retires, or leaves unchanged while changing code that implements them, each
 * with its statement, firmness, origin, scenarios and proof state.
 */
export async function collectSignoffSummary(
  workspaceRoot: string,
  scope: SignoffScope,
  deps: SignoffCollectDeps = {},
): Promise<SignoffSummary> {
  const git = deps.git ?? gitRunner(workspaceRoot);
  const notes: string[] = [];
  const base = headExists(git) ? "HEAD" : EMPTY_TREE;
  const readRequirement = workspaceRequirements(workspaceRoot);
  const relationships = readRelationships(workspaceRoot);
  const outgoing = (id: string, type: string) =>
    relationships
      .filter((relationship) => relationship.from === id)
      .filter((relationship) => relationship.type === type)
      .map((relationship) => relationship.to);

  type Draft = Omit<SignoffRequirement, "proof" | "symbols"> & {
    symbols: readonly string[];
  };
  const drafts = new Map<string, Draft>();

  const draftFor = (
    entity: ExtractedEntity,
    change: SignoffChange,
    source: string,
    previous?: ExtractedEntity,
  ): Draft => {
    const statement = requirementStatement(entity);
    const previousStatement = previous
      ? requirementStatement(previous)
      : undefined;
    const firmness = firmnessOf(entity);
    const origin = entity.origin;
    return {
      id: entity.id,
      title: flat(entity.title ?? entity.id),
      change,
      status: entity.status ?? "",
      statement,
      ...(previousStatement !== undefined && previousStatement !== statement
        ? { previousStatement }
        : {}),
      ...(firmness ? { firmness } : {}),
      ...(origin?.kind ? { originKind: origin.kind } : {}),
      ...(origin?.ref ? { originRef: flat(origin.ref) } : {}),
      ...(origin?.approved_by ? { approvedBy: origin.approved_by } : {}),
      supersedes: outgoing(entity.id, "supersedes")
        .map((id) => readRequirement(id))
        .filter((ref): ref is ExtractedEntity => ref !== undefined)
        .map(statementRef),
      scenarios: outgoing(entity.id, "specified_by")
        .filter((id) => id.startsWith("SCEN-"))
        .map((id) => ({ id, title: scenarioTitle(workspaceRoot, id) })),
      symbols: [],
      source,
    };
  };

  let files: ChangedFile[] = [];
  try {
    files = changedRequirementFiles(git, scope, base);
  } catch (error) {
    notes.push(
      `Changed requirement documents could not be listed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  for (const { status, file } of files) {
    const before =
      status === "A"
        ? undefined
        : parseEntity(tryGit(git, ["show", `${base}:${file}`]), file);
    if (status === "D") {
      if (before?.type === "req") {
        drafts.set(before.id, draftFor(before, "retired", file));
      }
      continue;
    }
    const entity = parseEntity(
      currentContent(workspaceRoot, git, scope, file),
      file,
    );
    if (entity?.type !== "req") continue;
    const retired =
      RETIRED_STATUS.test(entity.status ?? "") &&
      !RETIRED_STATUS.test(before?.status ?? "");
    const change: SignoffChange =
      status === "A" ? "new" : retired ? "retired" : "changed";
    drafts.set(entity.id, draftFor(entity, change, file, before));
  }

  try {
    const affected = await (
      deps.loadAffected ??
      ((value: SignoffScope) => loadAffectedForScope(workspaceRoot, value))
    )(scope);
    for (const [id, symbols] of affected) {
      const existing = drafts.get(id);
      if (existing) {
        drafts.set(id, { ...existing, symbols: [...symbols].sort() });
        continue;
      }
      const entity = readRequirement(id);
      if (!entity || RETIRED_STATUS.test(entity.status ?? "")) continue;
      drafts.set(id, {
        ...draftFor(entity, "affected", `${REQUIREMENTS_DIR}/${id}.md`),
        symbols: [...symbols].sort(),
      });
    }
  } catch (error) {
    notes.push(
      `Requirements affected by code changes could not be computed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  let proof: ReadonlyMap<string, SignoffProof> = new Map();
  if (drafts.size > 0 && deps.loadProof) {
    try {
      proof = await deps.loadProof();
    } catch (error) {
      notes.push(
        `Proof state is unavailable: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const unsynced = [...drafts.values()].filter(
    (draft) => draft.change !== "retired" && !proof.has(draft.id),
  );
  if (proof.size > 0 && unsynced.length > 0) {
    notes.push(
      `${unsynced.map((draft) => draft.id).join(", ")} ${unsynced.length === 1 ? "is" : "are"} not in the synced knowledge base yet; run kibi sync to see ${unsynced.length === 1 ? "its" : "their"} proof state.`,
    );
  }

  const order: Readonly<Record<SignoffChange, number>> = {
    new: 0,
    changed: 1,
    affected: 2,
    retired: 3,
  };
  const requirements = [...drafts.values()]
    .map((draft) => {
      const row = proof.get(draft.id);
      return row ? { ...draft, proof: row } : draft;
    })
    .sort(
      (left, right) =>
        order[left.change] - order[right.change] ||
        left.id.localeCompare(right.id),
    );

  const branch = tryGit(git, ["rev-parse", "--abbrev-ref", "HEAD"])?.trim();
  return {
    version: SIGNOFF_VERSION,
    kind: "summary",
    scope,
    generatedAt: (deps.now ?? (() => new Date()))().toISOString(),
    ...(branch && branch !== "HEAD" ? { branch } : {}),
    requirements,
    notes,
  };
}

// implements REQ-kibi-signoff-views
/**
 * Requirements whose implementing code the change edits, read from the
 * `requirement_statement_unverified` impact diagnostics of `kibi check`.
 */
export async function loadAffectedForScope(
  workspaceRoot: string,
  scope: SignoffScope,
): Promise<AffectedRequirements> {
  const { analyzeChangedFileImpact } = await import(
    "../public/impact/analyzer.js"
  );
  const result = await analyzeChangedFileImpact({
    workspaceRoot,
    ...(scope === "staged"
      ? { staged: true }
      : { includeWorkingTreeDiff: true }),
    includeImpactDiagnostics: true,
  });
  const affected = new Map<string, readonly string[]>();
  for (const diagnostic of result.impactDiagnostics) {
    if (diagnostic.id !== "requirement_statement_unverified") continue;
    const evidence = diagnostic.evidence as
      | { requirement?: unknown; symbols?: unknown }
      | undefined;
    const id =
      typeof evidence?.requirement === "string"
        ? evidence.requirement
        : diagnostic.entityId;
    if (!id) continue;
    const symbols = Array.isArray(evidence?.symbols)
      ? evidence.symbols.filter(
          (symbol): symbol is string => typeof symbol === "string",
        )
      : [];
    affected.set(id, symbols);
  }
  return affected;
}

// implements REQ-kibi-signoff-views
/**
 * The mid-work decision questions, numbered, with the recorded requirement a
 * question would change and the recorded rules it conflicts with quoted from
 * the knowledge base rather than from the agent's memory.
 */
export function collectSignoffQuestions(
  workspaceRoot: string,
  inputs: readonly SignoffQuestionInput[],
  now: () => Date = () => new Date(),
): SignoffQuestions {
  const readRequirement = workspaceRequirements(workspaceRoot);
  const notes: string[] = [];
  const questions: SignoffQuestion[] = inputs.map((input, index) => {
    const current = input.id ? readRequirement(input.id) : undefined;
    const conflicts: SignoffStatementRef[] = [];
    for (const id of input.conflictsWith ?? []) {
      const entity = readRequirement(id);
      if (entity) conflicts.push(statementRef(entity));
      else
        notes.push(
          `Question ${index + 1}: ${id} is not a recorded requirement.`,
        );
    }
    return {
      ...input,
      number: index + 1,
      ...(current ? { current: statementRef(current) } : {}),
      conflicts,
    };
  });
  return {
    version: SIGNOFF_VERSION,
    kind: "questions",
    generatedAt: now().toISOString(),
    questions,
    notes,
  };
}

const FIRMNESS_VALUES = new Set(["firm", "default", "exploratory"]);

function optionalString(
  record: Record<string, unknown>,
  key: string,
  where: string,
): string | undefined {
  const value = record[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new Error(`${where}.${key} must be a string`);
  }
  return value.trim() === "" ? undefined : value.trim();
}

function optionalStrings(
  record: Record<string, unknown>,
  key: string,
  where: string,
): string[] | undefined {
  const value = record[key];
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${where}.${key} must be an array of strings`);
  }
  return value.map((item: string) => item.trim()).filter(Boolean);
}

// implements REQ-kibi-signoff-views
/**
 * Parse the questions input: `{"questions":[{statement, id?, title?, quote?,
 * firmness?, governs?, conflictsWith?, question?, answer?}]}` or a bare array.
 */
export function parseSignoffQuestionsInput(
  raw: string,
): SignoffQuestionInput[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Questions input is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const list = Array.isArray(parsed)
    ? parsed
    : parsed !== null && typeof parsed === "object"
      ? (parsed as { questions?: unknown }).questions
      : undefined;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error(
      'Questions input must be {"questions":[...]} or an array with at least one question',
    );
  }
  return list.map((item, index) => {
    const where = `questions[${index}]`;
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`${where} must be an object`);
    }
    const record = item as Record<string, unknown>;
    const statement = optionalString(record, "statement", where);
    if (!statement) throw new Error(`${where}.statement is required`);
    const firmness = optionalString(record, "firmness", where);
    if (firmness !== undefined && !FIRMNESS_VALUES.has(firmness)) {
      throw new Error(`${where}.firmness must be firm, default or exploratory`);
    }
    const id = optionalString(record, "id", where);
    const title = optionalString(record, "title", where);
    const quote = optionalString(record, "quote", where);
    const governs = optionalStrings(record, "governs", where);
    const conflictsWith = optionalStrings(record, "conflictsWith", where);
    const question = optionalString(record, "question", where);
    const answer = optionalString(record, "answer", where);
    return {
      statement: flat(statement),
      ...(id ? { id } : {}),
      ...(title ? { title } : {}),
      ...(quote ? { quote } : {}),
      ...(firmness ? { firmness: firmness as SignoffFirmness } : {}),
      ...(governs?.length ? { governs } : {}),
      ...(conflictsWith?.length ? { conflictsWith } : {}),
      ...(question ? { question } : {}),
      ...(answer ? { answer } : {}),
    };
  });
}
