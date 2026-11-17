import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";

import { shellToolEditPaths } from "kibi-agent-core/bash-command";
import {
  type DecisionSession,
  captureReminder,
  claimCaptureReminder,
  claimRuleCaptureTemplate,
  claimSignoffReminder,
  confirmFirmEdits,
  firmEditNotice,
  firmRequirementsTouched,
  holdRuleNote,
  isRequirementUpsert,
  markDecisionFlag,
  recordRequest,
  removesOnlyDeadImplementsComments,
  sessionRulePhrase,
  settleFirmRequirements,
  settledFirmRequirements,
  signoffReminder,
  startDecisionSession,
  statedReason,
  takeRuleNote,
} from "kibi-agent-core/decision-guard";
import { extractKbMcpToolCall } from "kibi-agent-core/kb-mcp-tools";
import { loadKnowledgeIndex } from "kibi-agent-core/knowledge-index";
import {
  canonicalizeWorkspacePath,
  extractEditedPaths,
  isSourceImpactRelevantPath,
} from "kibi-agent-core/path-policy";
import { createEntitySummarizer, editFocus } from "kibi-agent-core/snippets";

/**
 * The decision hooks every other host runs, for OpenCode: a prompt that
 * states a rule is noted and its capture template follows the first source
 * edit, an edit of code that implements a firm requirement is stopped once so
 * the agent asks the person first, and a session that changed source and
 * recorded nothing is asked, when it goes idle, to record the decision.
 */

/** OpenCode's file-writing tools; the shell is read for in-place edits. */
const EDIT_TOOLS = new Set([
  "edit",
  "write",
  "patch",
  "apply_patch",
  "multiedit",
]);

export type DecisionHookOptions = {
  /** The Kibi workspace root (the plugin's worktree). */
  readonly workspaceRoot: string;
  /** Where session markers live; defaults to a per-user temp directory. */
  readonly stateRoot?: string;
  readonly env?: NodeJS.ProcessEnv;
  /** Sends a follow-up message into the session (continues the turn). */
  readonly prompt?: (sessionId: string, text: string) => Promise<void>;
};

export type DecisionHooks = {
  chatMessage(sessionId: string | undefined, parts: unknown): void;
  /** Throws the firm-edit notice to stop an edit once; otherwise returns. */
  beforeTool(
    tool: string | undefined,
    sessionId: string | undefined,
    args: unknown,
  ): void;
  /** Context to append to the tool's output, if any. */
  afterTool(
    tool: string | undefined,
    sessionId: string | undefined,
    args: unknown,
  ): string | undefined;
  sessionIdle(sessionId: string | undefined): Promise<void>;
};

/** Per-workspace marker directory, keyed by the resolved workspace root. */
export function decisionStateDir(
  workspaceRoot: string,
  stateRoot?: string,
): string {
  const root =
    stateRoot ??
    path.join(os.tmpdir(), `kibi-opencode-${process.getuid?.() ?? "user"}`);
  const key = createHash("sha256")
    .update(path.resolve(workspaceRoot))
    .digest("hex");
  return path.join(root, "decisions", key);
}

/** The text of a user message's text parts, joined. */
export function messageText(parts: unknown): string {
  if (!Array.isArray(parts)) return "";
  return parts
    .filter(
      (part): part is { type: string; text: string; synthetic?: boolean } =>
        part !== null &&
        typeof part === "object" &&
        (part as { type?: unknown }).type === "text" &&
        typeof (part as { text?: unknown }).text === "string" &&
        (part as { synthetic?: unknown }).synthetic !== true,
    )
    .map((part) => part.text)
    .join("\n");
}

function editedRelativePaths(
  workspaceRoot: string,
  tool: string,
  args: unknown,
): string[] {
  const raw = EDIT_TOOLS.has(tool)
    ? extractEditedPaths(args)
    : shellToolEditPaths(tool === "bash" ? "Bash" : tool, args, workspaceRoot);
  return [
    ...new Set(
      raw
        .map(
          (rawPath) =>
            canonicalizeWorkspacePath(workspaceRoot, {
              eventCwd: workspaceRoot,
              rawPath,
            })?.workspaceRelative,
        )
        .filter((relative): relative is string => relative !== undefined),
    ),
  ];
}

export function createDecisionHooks(
  options: DecisionHookOptions,
): DecisionHooks {
  const { workspaceRoot } = options;
  const env = options.env ?? process.env;
  const stateDir = decisionStateDir(workspaceRoot, options.stateRoot);
  const started = new Set<string>();
  const sessionFor = (sessionId: string | undefined): DecisionSession => {
    const session: DecisionSession = { stateDir, sessionId };
    // OpenCode has no session-start hook the plugin sees for every session:
    // start the markers the first time a session is seen in this process.
    const key = sessionId ?? "";
    if (!started.has(key)) {
      started.add(key);
      startDecisionSession(session, "startup");
    }
    return session;
  };

  return {
    chatMessage(sessionId, parts) {
      const text = messageText(parts);
      if (text.trim() === "") return;
      const session = sessionFor(sessionId);
      const rule = recordRequest(session, text);
      // The message hook cannot add context: the note waits for the next
      // tool result the agent reads.
      if (rule !== undefined) holdRuleNote(session, rule, statedReason(text));
    },

    beforeTool(tool, sessionId, args) {
      if (tool === undefined || !EDIT_TOOLS.has(tool) || !confirmFirmEdits(env))
        return;
      const relatives = editedRelativePaths(workspaceRoot, tool, args).filter(
        isSourceImpactRelevantPath,
      );
      if (relatives.length === 0) return;
      const session = sessionFor(sessionId);
      const index = loadKnowledgeIndex(workspaceRoot, stateDir);
      const summarize = createEntitySummarizer(workspaceRoot);
      const settled = settledFirmRequirements(session);
      for (const relative of relatives) {
        const absolute = path.join(workspaceRoot, relative);
        const focus = tool === "edit" ? editFocus(absolute, args) : undefined;
        const { ids, symbol } = firmRequirementsTouched({
          symbols: index.files[relative] ?? [],
          focus,
          wholeFile: focus === undefined,
          summarize,
          confirmed: settled,
          commentOnly: removesOnlyDeadImplementsComments(
            absolute,
            args,
            workspaceRoot,
          ),
        });
        if (ids.length === 0) continue;
        settleFirmRequirements(session, ids);
        // Thrown, the notice stops this edit and reaches the agent as the
        // tool's result; the same edit tried again goes through.
        throw new Error(
          firmEditNotice(
            symbol ? `${symbol.title} in ${relative}` : relative,
            ids.map(summarize),
          ),
        );
      }
    },

    afterTool(tool, sessionId, args) {
      if (tool === undefined) return undefined;
      const session = sessionFor(sessionId);
      const kbCall = extractKbMcpToolCall(tool, args);
      if (kbCall?.toolName === "kb_upsert") {
        markDecisionFlag(session, "kb-recorded");
        if (isRequirementUpsert(args)) {
          markDecisionFlag(session, "requirement-recorded");
        }
      }
      const editedSource = editedRelativePaths(workspaceRoot, tool, args).some(
        isSourceImpactRelevantPath,
      );
      if (editedSource) markDecisionFlag(session, "source-edited");
      const parts = [
        takeRuleNote(session),
        editedSource ? claimRuleCaptureTemplate(session) : undefined,
      ].filter((part): part is string => part !== undefined);
      return parts.length > 0 ? parts.join("\n\n") : undefined;
    },

    async sessionIdle(sessionId) {
      if (sessionId === undefined || options.prompt === undefined) return;
      const session = sessionFor(sessionId);
      const text = claimCaptureReminder(session)
        ? captureReminder(sessionRulePhrase(session))
        : claimSignoffReminder(session, workspaceRoot)
          ? signoffReminder()
          : undefined;
      if (text === undefined) return;
      await options.prompt(sessionId, text);
    },
  };
}
