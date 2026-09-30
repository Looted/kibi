// implements REQ-codex-kibi-plugin-v1
import {
  extractExplicitPathFields as extractSharedExplicitPathFields,
  isKbPath,
  isMeaningfulTrackedPath as isSharedMeaningfulTrackedPath,
  isSourceImpactRelevantPath as isSharedSourceImpactRelevantPath,
} from "kibi-agent-core/path-policy";

export function extractExplicitPathFields(input: unknown): string[] {
  return extractSharedExplicitPathFields(input);
}

export function isDirectKbPath(candidate: string): boolean {
  return isKbPath(candidate);
}

export function isMeaningfulTrackedPath(candidate: string): boolean {
  return isSharedMeaningfulTrackedPath(candidate);
}

export function isSourceImpactRelevantPath(candidate: string): boolean {
  return isSharedSourceImpactRelevantPath(candidate);
}
