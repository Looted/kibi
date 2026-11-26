// Decision guard for the Vibe hooks: the rule-phrase note at prompt time,
// the firm-requirement notice after an edit, the rule-capture template on
// the session's first source edit, and the missing-git-hooks note at session
// start. The logic is the shared kibi-agent-core code the other adapters
// use. scripts/build-guard.ts bundles this file with kibi-agent-core into
// bin/hooks/kibi-guard.mjs, because a copied Vibe plugin has no
// node_modules.
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";

import {
  type ShellRead,
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
import { canonicalKbToolName } from "kibi-agent-core/kb-mcp-tools";
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

/**
 * Per-session marker directory, keyed by the workspace root and the hashed
 * Vibe session id, under a per-user directory in the OS temp dir (or
 * KIBI_VIBE_STATE_DIR). Events without a session id share one bucket.
 */
export function sessionStateDir(
  workspaceRoot: string,
  sessionId: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const base =
    env.KIBI_VIBE_STATE_DIR?.trim() ||
    path.join(os.tmpdir(), `kibi-vibe-${process.getuid?.() ?? "user"}`);
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

/**
 * The change the person decides that a tool Vibe has already run made: an
 * edit that changed the Kibi level or lowered a requirement's floor, or a
 * kb_upsert that lowered one. The earlier text is the edit turned back, or
 * the file in the last commit.
 */
export function guardedChangeAfter(
  workspaceRoot: string,
  input: ReturnType<typeof parseHookInput>,
  targets: readonly { absolute: string; relative: string }[],
): GuardedChange | undefined {
  const fields = asFields(input.toolInput);
  const candidates =
    canonicalKbToolName(input.toolName) === "kb_upsert"
      ? typeof fields.id === "string" && fields.dryRun !== true
        ? [{ relative: `.kb/requirements/${fields.id}.md`, before: undefined }]
        : []
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
  return undefined;
}

/**
 * post_tool after an edit or a kb_upsert: the notice to ask the person about
 * a change of the Kibi level or a lowered required_evidence (once per change
 * per session), the firm-requirement notice (once per requirement per
 * session), then the rule-capture template on the first source edit of a
 * session whose prompt stated a rule.
 */
export function postEditNote(
  workspaceRoot: string,
  payload: unknown,
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const input = parseHookInput(payload);
  const kbWrite = canonicalKbToolName(input.toolName) === "kb_upsert";
  if (!kbWrite && !isEditTool(input.toolName)) return undefined;
  const base = input.cwd ?? workspaceRoot;
  const edited = kbWrite
    ? []
    : extractEditedPaths(input.toolInput)
        .map((raw) => path.resolve(base, raw))
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
      const focus = editFocus(target.absolute, afterEditInput(input.toolInput));
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
