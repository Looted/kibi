// implements REQ-cursor-kibi-plugin-v1
import type { HookState } from "./hook-state.js";
import { type McpState, resolveKibiInterface } from "./kb-mcp-tools.js";
import {
  isKbFreshnessRelevantPath,
  isSourceImpactRelevantPath,
} from "./path-policy.js";

export const BOOTSTRAP_REMINDER =
  "Kibi config was not found at the Cursor workspace root. Use the Kibi MCP /init-kibi workflow to bootstrap project memory before relying on KB lookups; do not edit .kb/ files directly.";

export const DIRECT_KB_EDIT_WARNING =
  "Avoid direct edits to .kb/. Use Kibi MCP tools for KB discovery and mutations so project memory stays valid.";

export function interfaceAdvisory(
  mcpState: McpState,
  workspaceTrusted: boolean,
): string | undefined {
  const selectedInterface = resolveKibiInterface(mcpState, workspaceTrusted);
  switch (selectedInterface) {
    case "mcp":
      return undefined;
    case "cli":
      return "Kibi MCP has not been observed in this session. In this explicitly trusted workspace, the project-local CLI is an advisory fallback: use npx --no-install kibi or bunx --no-install kibi. Do not use global or installing runners.";
    case "setup":
      return "Kibi MCP has not been observed in this session and workspace trust is unknown. Do not probe or execute a CLI fallback; ask the operator to enable MCP or explicitly approve the trusted project-local CLI workflow.";
  }
}

export function stopFollowupMessage(state: HookState): string | undefined {
  if (state.kbMutationTools.length > 0) {
    const tools = [...new Set(state.kbMutationTools)];
    return `Kibi KB updated (${tools.join(", ")}).`;
  }

  const sourceImpactPaths = state.dirtyPaths.filter(isSourceImpactRelevantPath);
  const uncheckedSourcePaths = sourceImpactPaths.filter(
    (sourcePath) => !state.impactCheckedPaths.includes(sourcePath),
  );
  if (uncheckedSourcePaths.length > 0 && !state.impactCheckRun) {
    return impactCheckFollowup(uncheckedSourcePaths);
  }

  if (uncheckedSourcePaths.length > 0) {
    return impactCheckFollowup(uncheckedSourcePaths);
  }

  const freshnessPaths = state.dirtyPaths.filter(isKbFreshnessRelevantPath);
  if (freshnessPaths.length === 0 || state.kbCheckRun) {
    return undefined;
  }

  const fileCount = freshnessPaths.length;
  const noun = fileCount === 1 ? "file" : "files";
  return `Kibi: sync or record no-impact after ${fileCount} edited ${noun}.`;
}

function impactCheckFollowup(sourcePaths: readonly string[]): string {
  const fileCount = sourcePaths.length;
  const noun = fileCount === 1 ? "file" : "files";
  const sourceFiles = JSON.stringify(sourcePaths.slice(0, 10));
  return [
    `Kibi: run impact-enabled kb_check after ${fileCount} edited source ${noun}.`,
    `Use kb_check({sourceFiles:${sourceFiles}, includeImpactDiagnostics:true, includeWorkingTreeDiff:true}).`,
    "Review symbol granularity and semantic review of linked requirements/tests before stopping.",
  ].join("\n");
}

/** @deprecated Use stopFollowupMessage */
export function freshnessReminder(dirtyPaths: readonly string[]): string {
  const fileCount = dirtyPaths.length;
  const noun = fileCount === 1 ? "file" : "files";
  return `Kibi: sync or record no-impact after ${fileCount} edited ${noun}.`;
}
