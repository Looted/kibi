// implements REQ-cursor-kibi-plugin-v1
import type { HookState } from "./hook-state.js";
import { isKbFreshnessRelevantPath } from "./path-policy.js";

export const BOOTSTRAP_REMINDER =
  "Kibi is not initialized for this workspace. Use the Kibi MCP workflow to bootstrap project memory before relying on KB lookups; do not edit .kb/ files directly.";

export const DIRECT_KB_EDIT_WARNING =
  "Avoid direct edits to .kb/. Use Kibi MCP tools for KB discovery and mutations so project memory stays valid.";

export function stopFollowupMessage(state: HookState): string | undefined {
  if (state.kbMutationTools.length > 0) {
    const tools = [...new Set(state.kbMutationTools)];
    return `Kibi KB updated (${tools.join(", ")}).`;
  }

  const freshnessPaths = state.dirtyPaths.filter(isKbFreshnessRelevantPath);
  if (freshnessPaths.length === 0 || state.kbCheckRun) {
    return undefined;
  }

  const fileCount = freshnessPaths.length;
  const noun = fileCount === 1 ? "file" : "files";
  return `Kibi: sync or record no-impact after ${fileCount} edited ${noun}.`;
}

/** @deprecated Use stopFollowupMessage */
export function freshnessReminder(dirtyPaths: readonly string[]): string {
  const fileCount = dirtyPaths.length;
  const noun = fileCount === 1 ? "file" : "files";
  return `Kibi: sync or record no-impact after ${fileCount} edited ${noun}.`;
}
