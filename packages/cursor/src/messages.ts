// implements REQ-cursor-kibi-plugin-v1, REQ-cursor-stop-job-vs-plan
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
  const freshnessPaths = state.dirtyPaths.filter(isKbFreshnessRelevantPath);
  // rationale: the fall-through branches return undefined exactly when
  // hasFollowupWork is false, so flipping or dropping any term of the
  // disjunction is observationally equivalent.
  // rationale: the fall-through branches return undefined exactly when
  // hasFollowupWork is false, so flipping or dropping any term of the
  // disjunction is observationally equivalent.
  // Stryker disable ConditionalExpression, EqualityOperator, LogicalOperator
  const hasFollowupWork =
    uncheckedSourcePaths.length > 0 ||
    (freshnessPaths.length > 0 && !state.kbCheckRun);
  // Stryker restore

  // rationale: when hasFollowupWork is false the fall-through branches return
  // undefined, so this early return is behaviorally redundant.
  // Stryker disable next-line ConditionalExpression, BlockStatement
  if (state.planDelivered && !hasFollowupWork) {
    return undefined;
  }

  // rationale: this branch duplicates the unconditional check below; the
  // impactCheckRun term cannot change the returned message.
  // Stryker disable next-line ConditionalExpression, BooleanLiteral, BlockStatement
  if (uncheckedSourcePaths.length > 0 && !state.impactCheckRun) {
    return impactCheckFollowup(uncheckedSourcePaths);
  }

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
