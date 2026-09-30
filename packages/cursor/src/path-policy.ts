// implements REQ-cursor-kibi-plugin-v1
import {
  extractExplicitPathFields as extractSharedExplicitPathFields,
  isKbPath,
  isDocumentationTrackedPath as isSharedDocumentationTrackedPath,
  isMeaningfulTrackedPath as isSharedMeaningfulTrackedPath,
  isSourceImpactRelevantPath as isSharedSourceImpactRelevantPath,
  normalizeWorkspacePath,
} from "kibi-agent-core/path-policy";

export function isFreshnessLane(lane: string | undefined): boolean {
  return (
    lane === "requirements" ||
    lane === "scenarios" ||
    lane === "tests" ||
    lane === "facts" ||
    lane === "adr" ||
    lane === "flags" ||
    lane === "events" ||
    lane === "symbols.yaml" ||
    lane === "symbol-coordinates.yaml"
  );
}

export function extractExplicitPathFields(input: unknown): string[] {
  return extractSharedExplicitPathFields(input);
}

export function isDirectKbPath(candidate: string): boolean {
  return isKbPath(candidate);
}

export function isMeaningfulTrackedPath(candidate: string): boolean {
  return isSharedMeaningfulTrackedPath(candidate);
}

/** Paths whose edits should trigger a KB freshness stop follow-up. */
export function isKbFreshnessRelevantPath(candidate: string): boolean {
  const segments = normalizeWorkspacePath(candidate).split("/").filter(Boolean);
  if (segments[0] === ".kb" && isFreshnessLane(segments[1])) return true;
  if (segments.includes("documentation")) return true;
  return (
    segments[0] === "packages" &&
    segments[1] === "core" &&
    segments[2] === "src"
  );
}

export function isSourceImpactRelevantPath(candidate: string): boolean {
  return isSharedSourceImpactRelevantPath(candidate);
}

export function isDocumentationTrackedPath(candidate: string): boolean {
  return isSharedDocumentationTrackedPath(candidate);
}

export function toRepoRelativePath(
  candidate: string,
  cwd: string | undefined,
): string {
  const normalized = normalizeWorkspacePath(candidate);
  if (!cwd) return normalized;
  const cwdPrefix = `${normalizeWorkspacePath(cwd)}/`;
  return normalized.startsWith(cwdPrefix)
    ? normalized.slice(cwdPrefix.length)
    : normalized;
}
