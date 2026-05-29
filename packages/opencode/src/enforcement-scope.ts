// implements REQ-opencode-worktree-hard-enforcement-v1

import { createHash } from "node:crypto";
import { resolve } from "node:path";

export interface EnforcementScopeInput {
  sessionId?: string | undefined;
  agentIdentity?: string | undefined;
  worktreeRoot: string;
  branch: string;
  dirtyRelevantFingerprint: string;
}

function normalizeComponent(
  value: string | undefined,
  fallback: string,
): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

/**
 * Build a deterministic scope key for hard-enforcement decisions.
 */
// implements REQ-opencode-worktree-hard-enforcement-v1
export function buildEnforcementScopeKey(input: EnforcementScopeInput): string {
  return JSON.stringify({
    sessionId: normalizeComponent(input.sessionId, "unknown"),
    agentIdentity: normalizeComponent(input.agentIdentity, "unknown"),
    worktreeRoot: resolve(input.worktreeRoot),
    branch: normalizeComponent(input.branch, "unknown"),
    dirtyRelevantFingerprint: normalizeComponent(
      input.dirtyRelevantFingerprint,
      "clean",
    ),
  });
}

/**
 * Hash dirty relevant inputs into a stable, order-insensitive fingerprint.
 */
// implements REQ-opencode-worktree-hard-enforcement-v1
export function buildDirtyRelevantFingerprint(
  values: Iterable<string | null | undefined>,
): string {
  const normalized = [...values]
    .map((value) => value?.trim() ?? "")
    .filter((value) => value.length > 0)
    .sort();

  if (normalized.length === 0) {
    return "clean";
  }

  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}
