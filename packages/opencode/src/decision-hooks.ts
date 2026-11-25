import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";

import {
  type ShellRead,
  shellToolEditPaths,
  shellToolReadViews,
} from "kibi-agent-core/bash-command";
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
import {
  extractKbMcpToolCall,
  hostKbOperation,
} from "kibi-agent-core/kb-mcp-tools";
import { loadKnowledgeIndex } from "kibi-agent-core/knowledge-index";
import {
  type GuardedChange,
  guardedChangeNotice,
  guardedChangeOf,
} from "kibi-agent-core/level-guard";
import {
  canonicalizeWorkspacePath,
  classifyPath,
  extractEditedPaths,
  isSourceImpactRelevantPath,
} from "kibi-agent-core/path-policy";
import {
  globFilter,
  hookReadRows,
  searchToolRead,
} from "kibi-agent-core/read-context";
import { createEntitySummarizer, editFocus } from "kibi-agent-core/snippets";

import { kibiToolName } from "./smart-enforcement-events.js";

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

/**
 * The notice that stops a tool call changing the Kibi level or lowering a
 * requirement's required_evidence, the first time the session tries that
 * change; undefined for any other call and for the same change tried again.
 * `stopped` holds the changes already stopped, per session.
 */
export function guardedChangeStop(
  workspaceRoot: string,
  stopped: Set<string>,
  tool: string,
  sessionId: string | undefined,
  args: unknown,
): string | undefined {
  const kbTool = kibiToolName(tool);
  let change: GuardedChange | undefined;
  if (kbTool !== undefined)
    change = guardedChangeOf({
      workspaceRoot,
      toolName: kbTool,
      toolInput: args,
    });
  else if (EDIT_TOOLS.has(tool))
    for (const relativePath of editedRelativePaths(workspaceRoot, tool, args)) {
      change = guardedChangeOf({
        workspaceRoot,
        toolName: tool,
        toolInput: args,
        relativePath,
      });
      if (change) break;
    }
  if (change === undefined) return undefined;
  const key = JSON.stringify([sessionId ?? "", change]);
  if (stopped.has(key)) return undefined;
  stopped.add(key);
  return guardedChangeNotice(change);
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

/** OpenCode's read tool reads 2000 lines from its offset unless limited. */
const READ_TOOL_LINES = 2000;

/**
 * What a read, grep or bash call puts in view: the read tool's file and
 * window, a grep's pattern over its path (limited by its include glob), a
 * command's files and searches. Glob lists names only and shows nothing.
 */
export function toolReads(
  workspaceRoot: string,
  tool: string,
  args: unknown,
): { reads: ShellRead[]; admits?: (relativePath: string) => boolean } {
  const fields = (
    args !== null && typeof args === "object" ? args : {}
  ) as Record<string, unknown>;
  if (tool === "read") {
    if (typeof fields.filePath !== "string") return { reads: [] };
    const offset =
      typeof fields.offset === "number" ? fields.offset : undefined;
    const limit = typeof fields.limit === "number" ? fields.limit : undefined;
    const start = Math.max(1, offset ?? 1);
    const focus =
      offset === undefined && limit === undefined
        ? undefined
        : [{ start, end: start + (limit ?? READ_TOOL_LINES) - 1 }];
    return {
      reads: [
        {
          absolute: path.resolve(workspaceRoot, fields.filePath),
          directory: false,
          ...(focus ? { focus } : {}),
        },
      ],
    };
  }
  if (tool === "grep") {
    const read = searchToolRead({
      pattern: fields.pattern,
      path: fields.path,
      cwd: workspaceRoot,
    });
    const include =
      typeof fields.include === "string" ? fields.include : undefined;
    return {
      reads: read ? [read] : [],
      ...(include ? { admits: globFilter(include) } : {}),
    };
  }
  if (tool === "bash") {
    return { reads: shellToolReadViews("Bash", args, workspaceRoot) };
  }
  return { reads: [] };
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

  // The guarded changes this process already stopped once, per session.
  const stopped = new Set<string>();
  /**
   * Requirement rows for the code a read, grep or bash call puts in view
   * (see kibi-agent-core/read-context), each requirement once per session.
   */
  const readRows = (
    tool: string,
    sessionId: string | undefined,
    args: unknown,
  ): string | undefined => {
    try {
      const { reads, admits } = toolReads(workspaceRoot, tool, args);
      if (reads.length === 0) return undefined;
      return hookReadRows(reads, {
        workspaceRoot,
        files: loadKnowledgeIndex(workspaceRoot, stateDir).files,
        isSource: (relativePath) => classifyPath(relativePath) === "source",
        admits,
        summarize: createEntitySummarizer(workspaceRoot),
        stateDir,
        sessionKey: sessionId ?? "",
      })?.text;
    } catch {
      // Requirement context is advisory; an unreadable manifest or file
      // leaves the tool's output as it is.
      return undefined;
    }
  };

  return {
    chatMessage(sessionId, parts) {
      const text = messageText(parts);
      if (text.trim() === "") return;
      const session = sessionFor(sessionId);
      const rule = recordRequest(session, text, { workspaceRoot });
      // The message hook cannot add context: the note waits for the next
      // tool result the agent reads.
      if (rule !== undefined)
        holdRuleNote(session, rule, statedReason(text, workspaceRoot));
    },

    beforeTool(tool, sessionId, args) {
      if (tool === undefined) return;
      // A change of the Kibi level or a lowered required_evidence is the
      // person's choice: the first try is stopped with the notice so the
      // agent asks, and the same change tried again goes through.
      const stop = guardedChangeStop(
        workspaceRoot,
        stopped,
        tool,
        sessionId,
        args,
      );
      if (stop !== undefined) throw new Error(stop);
      // An edit tool, or a shell call that writes files in place.
      if (!confirmFirmEdits(env)) return;
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
          absolutePath: absolute,
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
      // OpenCode names an MCP tool `<server key>_<tool>`, whatever the
      // server key is; a write through the CLI runs in the bash tool.
      const kbCall = extractKbMcpToolCall(kibiToolName(tool) ?? tool, args);
      const kbOperation =
        kbCall?.toolName ??
        (tool === "bash" ? hostKbOperation("Bash", args) : undefined);
      if (kbOperation === "kb_upsert") {
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
        readRows(tool, sessionId, args),
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
