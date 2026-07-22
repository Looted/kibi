import type { McpState } from "./kb-mcp-tools.js";
import { interfaceAdvisory } from "./messages.js";
// implements REQ-cursor-kibi-plugin-v1
import {
  isDocumentationTrackedPath,
  isMeaningfulTrackedPath,
  toRepoRelativePath,
} from "./path-policy.js";

export { resolveKibiInterface } from "./kb-mcp-tools.js";

export type GuidanceContext = {
  readonly cwd: string | undefined;
  readonly hasKibi: boolean;
  readonly mcpState: McpState;
  readonly workspaceTrusted: boolean;
};

export function readGuidance(
  filePath: string,
  context: GuidanceContext,
): string | undefined {
  if (!context.hasKibi) {
    return undefined;
  }

  const relativePath = toRepoRelativePath(filePath, context.cwd);
  if (!isMeaningfulTrackedPath(relativePath)) {
    return undefined;
  }

  const guidance = [
    "Kibi read guidance: before changing this file, discover linked knowledge with Kibi MCP.",
    `Start with kb_search, then kb_query with sourceFile="${relativePath}".`,
    "Prefer Kibi facts and requirements over long inline comments for durable knowledge.",
  ];
  const advisory = interfaceAdvisory(
    context.mcpState,
    context.workspaceTrusted,
  );
  return advisory ? [advisory, ...guidance].join("\n") : guidance.join("\n");
}

export function writeGuidance(
  filePath: string,
  context: GuidanceContext,
): string | undefined {
  if (!context.hasKibi) {
    return undefined;
  }

  const relativePath = toRepoRelativePath(filePath, context.cwd);
  if (!isMeaningfulTrackedPath(relativePath)) {
    return undefined;
  }

  if (isDocumentationTrackedPath(relativePath)) {
    const guidance = [
      "Kibi write guidance: keep REQ, SCEN, and TEST artifacts separate.",
      "Update KB entities through kb_upsert and finish with kb_check.",
      "Do not edit .kb/ files directly.",
    ];
    const advisory = interfaceAdvisory(
      context.mcpState,
      context.workspaceTrusted,
    );
    return advisory ? [advisory, ...guidance].join("\n") : guidance.join("\n");
  }

  const guidance = [
    "Kibi write guidance: link production symbols to requirements.",
    `After editing, run kb_check({sourceFiles:["${relativePath}"], includeImpactDiagnostics:true, includeWorkingTreeDiff:true}) for symbol granularity and semantic review of linked requirements/tests.`,
    `After editing, resolve freshness with kb_search/kb_query for sourceFile="${relativePath}".`,
    "Prefer symbol manifest + executable_for or // implements REQ-xxx for traceability.",
  ];
  const advisory = interfaceAdvisory(
    context.mcpState,
    context.workspaceTrusted,
  );
  return advisory ? [advisory, ...guidance].join("\n") : guidance.join("\n");
}
