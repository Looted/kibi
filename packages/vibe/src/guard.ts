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

import { missingHooksNote } from "kibi-agent-core/checkout-hooks";
import {
  type DecisionSession,
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
  type EntitySummary,
  loadKnowledgeIndex,
} from "kibi-agent-core/knowledge-index";
import { extractEditedPaths } from "kibi-agent-core/path-policy";
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
    `If the edit does not keep ${one ? "that rule" : "those rules"}, tell the person, name the rule and undo the edit unless they agree; change the requirement with kb_upsert in this change only when they say so. Record your verdict for each edited symbol with kb_review_firm_edit ("keeps" or "changes"; CLI: kibi review-firm-edit). kibi check --staged blocks the commit until each has a current keeps receipt. A receipt is your judgment, not the person's approval.`,
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
  return missingHooksNote(workspaceRoot) ?? undefined;
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

/**
 * post_tool after an edit: the firm-requirement notice (once per
 * requirement per session), then the rule-capture template on the first
 * source edit of a session whose prompt stated a rule.
 */
export function postEditNote(
  workspaceRoot: string,
  payload: unknown,
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const input = parseHookInput(payload);
  if (!isEditTool(input.toolName)) return undefined;
  const base = input.cwd ?? workspaceRoot;
  const targets = extractEditedPaths(input.toolInput)
    .map((raw) => path.resolve(base, raw))
    .map((absolute) => ({
      absolute,
      relative: workspaceRelative(workspaceRoot, absolute),
    }))
    .filter(
      (target): target is { absolute: string; relative: string } =>
        target.relative !== undefined && !target.relative.startsWith(".kb/"),
    );
  if (targets.length === 0) return undefined;
  const decision = session(workspaceRoot, input, env);
  markDecisionFlag(decision, "source-edited");
  const notes: string[] = [];
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
