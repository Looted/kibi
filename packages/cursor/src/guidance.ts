// implements REQ-cursor-kibi-plugin-v1
import {
  isDocumentationTrackedPath,
  isMeaningfulTrackedPath,
  toRepoRelativePath,
} from "./path-policy.js";

export function readGuidance(
  filePath: string,
  cwd: string | undefined,
  hasKibi: boolean,
): string | undefined {
  if (!hasKibi) {
    return undefined;
  }

  const relativePath = toRepoRelativePath(filePath, cwd);
  if (!isMeaningfulTrackedPath(relativePath)) {
    return undefined;
  }

  return [
    "Kibi read guidance: before changing this file, discover linked knowledge with Kibi MCP.",
    `Start with kb_search, then kb_query with sourceFile="${relativePath}".`,
    "Prefer Kibi facts and requirements over long inline comments for durable knowledge.",
  ].join("\n");
}

export function writeGuidance(
  filePath: string,
  cwd: string | undefined,
  hasKibi: boolean,
): string | undefined {
  if (!hasKibi) {
    return undefined;
  }

  const relativePath = toRepoRelativePath(filePath, cwd);
  if (!isMeaningfulTrackedPath(relativePath)) {
    return undefined;
  }

  if (isDocumentationTrackedPath(relativePath)) {
    return [
      "Kibi write guidance: keep REQ, SCEN, and TEST artifacts separate.",
      "Update KB entities through kb_upsert and finish with kb_check.",
      "Do not edit .kb/ files directly.",
    ].join("\n");
  }

  return [
    "Kibi write guidance: link production symbols to requirements.",
    `After editing, run kb_check({sourceFiles:["${relativePath}"], includeImpactDiagnostics:true, includeWorkingTreeDiff:true}) for symbol granularity and semantic review of linked requirements/tests.`,
    `After editing, resolve freshness with kb_search/kb_query for sourceFile="${relativePath}".`,
    "Prefer symbol manifest + executable_for or // implements REQ-xxx for traceability.",
  ].join("\n");
}
