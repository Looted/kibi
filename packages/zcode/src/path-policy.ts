// implements REQ-zcode-kibi-plugin-v1
import {
  canonicalizeWorkspacePath as canonicalizeSharedWorkspacePath,
  extractExplicitPathFields as extractSharedExplicitPathFields,
  isRootKbPath,
  isMeaningfulTrackedPath as isSharedMeaningfulTrackedPath,
  isSourceImpactRelevantPath as isSharedSourceImpactRelevantPath,
} from "kibi-agent-core/path-policy";
import type { CanonicalWorkspacePath as SharedCanonicalWorkspacePath } from "kibi-agent-core/path-policy";

export type CanonicalWorkspacePath = SharedCanonicalWorkspacePath;

export function extractExplicitPathFields(input: unknown): string[] {
  return extractSharedExplicitPathFields(input);
}

export function canonicalizeWorkspacePath(
  workspaceRoot: string,
  options: {
    eventCwd?: string | undefined;
    base?: string | undefined;
    rawPath: string;
  },
): CanonicalWorkspacePath | undefined {
  return canonicalizeSharedWorkspacePath(workspaceRoot, options);
}

export function isDirectKbPath(candidate: string): boolean {
  return isRootKbPath(candidate);
}

export function isMeaningfulTrackedPath(candidate: string): boolean {
  return isSharedMeaningfulTrackedPath(candidate);
}

export function isSourceImpactRelevantPath(candidate: string): boolean {
  return isSharedSourceImpactRelevantPath(candidate);
}
