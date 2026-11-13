import type { HookState } from "./hook-state.js";
import { type McpState, resolveKibiInterface } from "./kb-mcp-tools.js";
import {
  isKbFreshnessRelevantPath,
  isSourceImpactRelevantPath,
} from "./path-policy.js";

export const BOOTSTRAP_REMINDER =
  "Kibi config was not found at the Cursor workspace root. Use visible Kibi MCP tools or a trusted project-local CLI JSON route with --input (peer surfaces) to bootstrap project memory; if neither interface is available, tell the operator. Do not read or edit `.kb/` files directly. Query before mutate, run kb_upsert sequentially, and run kb_check before completion.";

export const DIRECT_KB_EDIT_WARNING =
  "Do not read or edit `.kb/` files directly. Use visible Kibi MCP tools or trusted project-local CLI JSON routes with --input (peer surfaces). Query before mutate, run kb_upsert sequentially, and run kb_check before completion.";

export function interfaceAdvisory(
  mcpState: McpState,
  workspaceTrusted: boolean,
): string | undefined {
  const selectedInterface = resolveKibiInterface(mcpState, workspaceTrusted);
  switch (selectedInterface) {
    // rationale: an unmatched switch case already returns undefined, so the
    // mcp case is behaviorally redundant.
    // Stryker disable next-line ConditionalExpression, StringLiteral
    case "mcp":
      return undefined;
    case "cli":
      return "Kibi MCP has not been observed in this session. In this explicitly trusted workspace, use the project-local CLI JSON routes, an equal peer of MCP: npx --no-install kibi <route> --input - (or bunx --no-install kibi). Never use a global or installing runner.";
    case "setup":
      return "Kibi MCP has not been observed in this session. Use approved Kibi MCP tools when they are visible; otherwise the project-local CLI JSON routes are an equal peer (npx --no-install kibi <route> --input -), never a global or installing runner. If neither is available, stop and tell the operator.";
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
  const freshnessPaths = state.dirtyPaths.filter(isKbFreshnessRelevantPath);

  if (uncheckedSourcePaths.length > 0) {
    return impactCheckFollowup(uncheckedSourcePaths);
  }

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
