// Decision guard for the Vibe hooks: the rule-phrase note at prompt time,
// the firm-requirement notice after an edit, the rule-capture template on
// the session's first source edit, and the missing-git-hooks note at session
// start. The logic is the shared kibi-agent-core code the other adapters
// use. scripts/build-guard.ts bundles this file with kibi-agent-core into
// bin/hooks/kibi-guard.mjs, because a copied Vibe plugin has no
// node_modules.
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  type ShellRead,
  commandEditPaths,
  kibiInitLevelTarget,
  shellToolCommand,
  shellToolReadViews,
} from "kibi-agent-core/bash-command";
import { checkoutSessionNote } from "kibi-agent-core/checkout-hooks";
import {
  type DecisionSession,
  claimGuardedChangeNotice,
  claimRuleCaptureTemplate,
  confirmFirmEdits,
  firmRequirementsTouched,
  markDecisionFlag,
  recordRequest,
  rulePromptNote,
  settleFirmRequirements,
  settledFirmRequirements,
  startDecisionSession,
  statedReason,
} from "kibi-agent-core/decision-guard";
import { parseHookInput } from "kibi-agent-core/hook-input";
import {
  canonicalKbToolName,
  effectiveKbOperation,
} from "kibi-agent-core/kb-mcp-tools";
import {
  type EntitySummary,
  loadKnowledgeIndex,
} from "kibi-agent-core/knowledge-index";
import {
  type GuardedChange,
  committedContent,
  contentBeforeEdit,
  guardedChangeAfterNotice,
  guardedChangeSince,
} from "kibi-agent-core/level-guard";
import { classifyPath, extractEditedPaths } from "kibi-agent-core/path-policy";
import { hookReadRows, searchToolRead } from "kibi-agent-core/read-context";
import { createEntitySummarizer, editFocus } from "kibi-agent-core/snippets";

/** Vibe's file-writing tools, with or without the `file_system.` prefix. */
const EDIT_TOOLS = new Set(["edit", "write_file", "search_replace"]);

export function isEditTool(toolName: string | undefined): boolean {
  return EDIT_TOOLS.has(String(toolName ?? "").replace(/^file_system\./, ""));
}

function privateFallbackBase(): string {
  const candidate = path.join(
    os.tmpdir(),
    `kibi-vibe-${process.getuid?.() ?? "user"}`,
  );
  try {
    fs.mkdirSync(candidate, { recursive: true, mode: 0o700 });
    const stat = fs.lstatSync(candidate);
    if (
      stat.isDirectory() &&
      (typeof process.getuid !== "function" || stat.uid === process.getuid())
    ) {
      return candidate;
    }
  } catch {
    // Fall through to a fresh private directory if candidate is unusable.
  }
  return fs.mkdtempSync(path.join(os.tmpdir(), "kibi-vibe-priv-"));
}

/**
 * Per-session marker directory, keyed by the workspace root and the hashed
 * Vibe session id, under KIBI_VIBE_STATE_DIR, PLUGIN_DATA, or a 0700 per-user
 * directory in the OS temp dir. Events without a session id share one bucket.
 */
export function sessionStateDir(
  workspaceRoot: string,
  sessionId: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const base =
    env.KIBI_VIBE_STATE_DIR?.trim() ||
    env.PLUGIN_DATA?.trim() ||
    privateFallbackBase();
  const workspaceKey = createHash("sha256")
    .update(path.resolve(workspaceRoot))
    .digest("hex")
    .slice(0, 32);
  const trimmed = sessionId?.trim();
  const sessionKey = trimmed
    ? createHash("sha256").update(trimmed).digest("hex").slice(0, 32)
    : "unattributed";
  return path.join(base, workspaceKey, "sessions", sessionKey);
}

/**
 * The firm-requirement notice for an edit Vibe has already applied: Vibe's
 * `pre_tool` hook can only deny or rewrite input (not inject advisory
 * context), so the agent is told to check the edit against the rule and undo
 * it, unless the person agrees, when it does not keep the rule.
 */
export function firmEditAfterNotice(
  where: string,
  requirements: readonly EntitySummary[],
): string {
  const shown = requirements
    .slice(0, 2)
    .map((summary) =>
      summary.title ? `${summary.id}: ${summary.title}` : summary.id,
    );
  const more =
    requirements.length > shown.length
      ? ` (+${requirements.length - shown.length} more)`
      : "";
  const one = requirements.length === 1;
  return [
    `Kibi: this edit changed ${where}, which implements ${one ? "a firm requirement" : "firm requirements"}, a rule the person set: ${shown.join("; ")}${more}.`,
    `If the edit does not keep ${one ? "that rule" : "those rules"}, tell the person, name the rule and undo the edit unless they agree; change the requirement with kb_upsert in this change only when they say so. Record your verdict for each edited symbol with kb_review_firm_edit ("keeps" or "changes"; CLI: kibi review-firm-edit). kibi check --staged blocks the commit until each has a current keeps receipt. A receipt is your own judgment: record it without asking the person to approve it.`,
  ].join("\n");
}

function session(
  workspaceRoot: string,
  input: ReturnType<typeof parseHookInput>,
  env: NodeJS.ProcessEnv,
): DecisionSession {
  return {
    stateDir: sessionStateDir(workspaceRoot, input.sessionId, env),
    sessionId: input.sessionId,
  };
}

/** session_start: start the session's markers; name missing git hooks. */
export function sessionStartNote(
  workspaceRoot: string,
  payload: unknown,
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const input = parseHookInput(payload);
  startDecisionSession(session(workspaceRoot, input, env), "startup");
  return checkoutSessionNote(workspaceRoot) ?? undefined;
}

/** pre_agent: the rule note (with its Why line) for a rule-like prompt. */
export function promptNote(
  workspaceRoot: string,
  payload: unknown,
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const input = parseHookInput(payload);
  if (!input.prompt) return undefined;
  const rule = recordRequest(session(workspaceRoot, input, env), input.prompt, {
    workspaceRoot,
  });
  return rule === undefined
    ? undefined
    : rulePromptNote(rule, statedReason(input.prompt, workspaceRoot));
}

/** Workspace-relative path of `absolute`, or undefined outside it. */
function workspaceRelative(
  workspaceRoot: string,
  absolute: string,
): string | undefined {
  const rel = path.relative(workspaceRoot, absolute);
  return rel === "" || rel.startsWith("..") || path.isAbsolute(rel)
    ? undefined
    : rel.split(path.sep).join("/");
}

type Fields = Record<string, unknown>;

function asFields(value: unknown): Fields {
  return typeof value === "object" && value !== null ? (value as Fields) : {};
}

/**
 * The edit's input as editFocus reads it after the edit: the text now in the
 * file is the replacement, so each new_string stands in for its old_string.
 */
export function afterEditInput(toolInput: unknown): Fields {
  const swap = (record: Fields): Fields => ({
    old_string: record.new_string ?? record.newString,
    replace_all: record.replace_all ?? record.replaceAll,
  });
  const input = asFields(toolInput);
  return {
    ...swap(input),
    edits: Array.isArray(input.edits)
      ? input.edits.map((edit) => swap(asFields(edit)))
      : [],
  };
}

const SEARCH_REPLACE_BLOCK =
  /<{5,} SEARCH\r?\n([\s\S]*?)\r?\n={5,}\r?\n([\s\S]*?)\r?\n>{5,} REPLACE/g;

/**
 * A search_replace call's SEARCH/REPLACE blocks as an `edits` list of
 * old_string/new_string pairs; any other input as it is.
 */
export function searchReplaceEdits(toolInput: unknown): unknown {
  const fields = asFields(toolInput);
  if (typeof fields.content !== "string") return toolInput;
  const edits = [...fields.content.matchAll(SEARCH_REPLACE_BLOCK)].map(
    (block) => ({ old_string: block[1], new_string: block[2] }),
  );
  return edits.length === 0 ? toolInput : { edits };
}

function findRequirementFileById(workspaceRoot: string, id: string): string {
  const direct = `.kb/requirements/${id}.md`;
  if (fs.existsSync(path.join(workspaceRoot, direct))) return direct;
  const reqDir = path.join(workspaceRoot, ".kb", "requirements");
  const stack = [reqDir];
  while (stack.length > 0) {
    const dir = stack.pop() as string;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && entry.name.endsWith(".md")) {
        try {
          const text = fs.readFileSync(full, "utf8");
          if (
            new RegExp(
              `^id:\\s*["']?${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']?\\s*$`,
              "m",
            ).test(text)
          ) {
            const rel = workspaceRelative(workspaceRoot, full);
            if (rel) return rel;
          }
        } catch {
          // ignore unreadable files
        }
      }
    }
  }
  return direct;
}

const GUARDED_KB_OPS = new Set(["kb_upsert", "kb_delete", "kb_apply_plan"]);

function effectiveKbOp(
  toolName: string | undefined,
  fields: Fields,
): string | undefined {
  const canonical = canonicalKbToolName(toolName);
  if (canonical === undefined) return undefined;
  return effectiveKbOperation(canonical, fields);
}

function guardedRequirementIdsOfKbOp(kbOp: string, fields: Fields): string[] {
  if (fields.dryRun === true) return [];
  if (kbOp === "kb_upsert") {
    return typeof fields.id === "string" && fields.id.trim() !== ""
      ? [fields.id.trim()]
      : [];
  }
  if (kbOp === "kb_delete") {
    const ids: string[] = [];
    if (typeof fields.id === "string" && fields.id.trim() !== "") {
      ids.push(fields.id.trim());
    }
    if (Array.isArray(fields.ids)) {
      for (const entry of fields.ids) {
        if (typeof entry === "string" && entry.trim() !== "") {
          ids.push(entry.trim());
        }
      }
    }
    return ids;
  }
  if (kbOp === "kb_apply_plan") {
    const plan =
      typeof fields.plan === "object" && fields.plan !== null
        ? (fields.plan as Fields)
        : undefined;
    if (!plan) return [];
    const ids = new Set<string>();
    const collect = (list: unknown): void => {
      if (!Array.isArray(list)) return;
      for (const entry of list) {
        if (typeof entry === "string" && entry.trim() !== "") {
          ids.add(entry.trim());
        } else if (typeof entry === "object" && entry !== null) {
          const rec = entry as Fields;
          if (typeof rec.id === "string" && rec.id.trim() !== "") {
            ids.add(rec.id.trim());
          }
        }
      }
    };
    collect(plan.entityIds);
    collect(plan.entities);
    collect(plan.requirements);
    return [...ids];
  }
  return [];
}

function committedKibiLevel(workspaceRoot: string): {
  level: "remember" | "test";
  path: string;
} {
  const pkgPath = path.join(workspaceRoot, "package.json");
  if (fs.existsSync(pkgPath)) {
    const before = committedContent(workspaceRoot, "package.json");
    if (before !== undefined) {
      try {
        const parsed = JSON.parse(before) as { kibi?: { level?: unknown } };
        const lvl = parsed?.kibi?.level;
        if (lvl === "remember" || lvl === "test") {
          return { level: lvl, path: "package.json" };
        }
      } catch {
        // Malformed committed package.json falls back to default test level.
      }
    }
    return { level: "test", path: "package.json" };
  }
  const before = committedContent(workspaceRoot, ".kb/setup.json");
  if (before !== undefined) {
    try {
      const parsed = JSON.parse(before) as { level?: unknown };
      if (parsed?.level === "remember" || parsed?.level === "test") {
        return { level: parsed.level, path: ".kb/setup.json" };
      }
    } catch {
      // Malformed committed setup.json falls back to default test level.
    }
  }
  return { level: "test", path: ".kb/setup.json" };
}

/**
 * The change the person decides that a tool Vibe has already run made: an
 * edit or bash command that changed the Kibi level or lowered a requirement's
 * floor, or a kb_upsert/kb_record/kb_delete/kb_apply_plan that lowered one.
 */
export function guardedChangeAfter(
  workspaceRoot: string,
  input: ReturnType<typeof parseHookInput>,
  targets: readonly { absolute: string; relative: string }[],
): GuardedChange | undefined {
  const fields = asFields(input.toolInput);
  const kbOp = effectiveKbOp(input.toolName, fields);
  const candidates =
    kbOp !== undefined && GUARDED_KB_OPS.has(kbOp)
      ? guardedRequirementIdsOfKbOp(kbOp, fields).map((id) => ({
          relative: findRequirementFileById(workspaceRoot, id),
          before: undefined,
        }))
      : targets.map((target) => ({
          relative: target.relative,
          before: contentBeforeEdit(
            target.absolute,
            String(input.toolName).endsWith("search_replace")
              ? searchReplaceEdits(input.toolInput)
              : input.toolInput,
          ),
        }));
  for (const candidate of candidates) {
    const before =
      candidate.before ?? committedContent(workspaceRoot, candidate.relative);
    // Without earlier text (a settings file the last commit did not have),
    // the level the commit set is compared with the level now.
    const change = guardedChangeSince(
      workspaceRoot,
      candidate.relative,
      before,
    );
    if (change !== undefined) return change;
  }
  const bashCmd =
    String(input.toolName ?? "").replace(/^file_system\./, "") === "bash"
      ? shellToolCommand("Bash", input.toolInput)
      : undefined;
  if (bashCmd !== undefined) {
    const initTarget = kibiInitLevelTarget(bashCmd);
    if (initTarget === "remember" || initTarget === "test") {
      const prev = committedKibiLevel(workspaceRoot);
      if (initTarget !== prev.level) {
        return {
          kind: "level",
          path: prev.path,
          from: prev.level,
          to: initTarget,
        };
      }
    }
    const cwd = input.cwd ?? workspaceRoot;
    for (const file of commandEditPaths(bashCmd, cwd)) {
      const rel = path.relative(workspaceRoot, file).replace(/\\/g, "/");
      if (rel.startsWith("..") || path.isAbsolute(rel)) continue;
      const change = guardedChangeSince(
        workspaceRoot,
        rel,
        committedContent(workspaceRoot, rel),
      );
      if (change !== undefined) return change;
    }
  }
  return undefined;
}

/**
 * post_tool after an edit, bash write, or kb_upsert/kb_record: the notice to
 * ask the person about a change of the Kibi level or a lowered
 * required_evidence (once per change per session), the firm-requirement notice
 * (once per requirement per session), then the rule-capture template on the
 * first source edit of a session whose prompt stated a rule.
 */
export function postEditNote(
  workspaceRoot: string,
  payload: unknown,
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const input = parseHookInput(payload);
  const fields = asFields(input.toolInput);
  const kbOp = effectiveKbOp(input.toolName, fields);
  const kbWrite = kbOp !== undefined && GUARDED_KB_OPS.has(kbOp);
  const isBash =
    String(input.toolName ?? "").replace(/^file_system\./, "") === "bash";
  if (!kbWrite && !isEditTool(input.toolName) && !isBash) return undefined;
  const base = input.cwd ?? workspaceRoot;
  const bashCommand = isBash
    ? shellToolCommand("Bash", input.toolInput)
    : undefined;
  const rawPaths = kbWrite
    ? []
    : isBash
      ? bashCommand !== undefined
        ? commandEditPaths(bashCommand, base)
        : []
      : extractEditedPaths(input.toolInput).map((raw) =>
          path.resolve(base, raw),
        );
  const edited = rawPaths
    .map((absolute) => ({
      absolute,
      relative: workspaceRelative(workspaceRoot, absolute),
    }))
    .filter(
      (target): target is { absolute: string; relative: string } =>
        target.relative !== undefined,
    );
  const decision = session(workspaceRoot, input, env);
  const guarded = guardedChangeAfter(workspaceRoot, input, edited);
  const guardedNote =
    guarded !== undefined && claimGuardedChangeNotice(decision, guarded)
      ? guardedChangeAfterNotice(guarded)
      : undefined;
  const targets = edited.filter(
    (target) => !target.relative.startsWith(".kb/"),
  );
  if (targets.length === 0) return guardedNote;
  markDecisionFlag(decision, "source-edited");
  const notes: string[] = guardedNote === undefined ? [] : [guardedNote];
  if (confirmFirmEdits(env)) {
    const files = loadKnowledgeIndex(workspaceRoot, decision.stateDir).files;
    const summarize = createEntitySummarizer(workspaceRoot);
    const settled = settledFirmRequirements(decision);
    for (const target of targets) {
      const focus = isBash
        ? undefined
        : editFocus(target.absolute, afterEditInput(input.toolInput));
      const { ids, symbol } = firmRequirementsTouched({
        symbols: files[target.relative] ?? [],
        focus,
        wholeFile: focus === undefined,
        absolutePath: target.absolute,
        summarize,
        confirmed: settled,
      });
      if (ids.length === 0) continue;
      settleFirmRequirements(decision, ids);
      notes.push(
        firmEditAfterNotice(
          symbol ? `${symbol.title} in ${target.relative}` : target.relative,
          ids.map(summarize),
        ),
      );
      break;
    }
  }
  const capture = claimRuleCaptureTemplate(decision, true);
  if (capture !== undefined) notes.push(capture);
  return notes.length > 0 ? notes.join("\n\n") : undefined;
}

/** Vibe's tools that put code in view without changing it. */
const READ_TOOLS = new Set(["read_file", "grep", "bash"]);

export function isReadTool(toolName: string | undefined): boolean {
  return READ_TOOLS.has(String(toolName ?? "").replace(/^file_system\./, ""));
}

/**
 * What a read_file, grep or bash call puts in view: the file and its window
 * (read_file's offset counts lines from 0), a grep's pattern over its path,
 * a command's files and searches.
 */
export function toolReads(
  toolName: string | undefined,
  toolInput: unknown,
  cwd: string,
): ShellRead[] {
  const tool = String(toolName ?? "").replace(/^file_system\./, "");
  const fields = asFields(toolInput);
  if (tool === "read_file") {
    if (typeof fields.path !== "string") return [];
    const offset = typeof fields.offset === "number" ? fields.offset : 0;
    const limit = typeof fields.limit === "number" ? fields.limit : undefined;
    const start = Math.max(1, offset + 1);
    const focus =
      offset > 0 || limit !== undefined
        ? [
            {
              start,
              end:
                limit === undefined
                  ? Number.MAX_SAFE_INTEGER
                  : start + limit - 1,
            },
          ]
        : undefined;
    return [
      {
        absolute: path.resolve(cwd, fields.path),
        directory: false,
        ...(focus ? { focus } : {}),
      },
    ];
  }
  if (tool === "grep") {
    const read = searchToolRead({
      pattern: fields.pattern,
      path: fields.path,
      cwd,
    });
    return read ? [read] : [];
  }
  return shellToolReadViews("Bash", toolInput, cwd);
}

/**
 * post_tool after a read, grep or bash call: requirement rows for the code
 * it put in view (see kibi-agent-core/read-context), each requirement once
 * per session, within the per-event and per-session budgets.
 */
export function readRowsNote(
  workspaceRoot: string,
  payload: unknown,
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const input = parseHookInput(payload);
  if (!isReadTool(input.toolName)) return undefined;
  const reads = toolReads(
    input.toolName,
    input.toolInput,
    input.cwd ?? workspaceRoot,
  );
  if (reads.length === 0) return undefined;
  const decision = session(workspaceRoot, input, env);
  return hookReadRows(reads, {
    workspaceRoot,
    files: loadKnowledgeIndex(workspaceRoot, decision.stateDir).files,
    isSource: (relativePath) => classifyPath(relativePath) === "source",
    summarize: createEntitySummarizer(workspaceRoot),
    stateDir: decision.stateDir,
    sessionKey: input.sessionId ?? "",
  })?.text;
}
