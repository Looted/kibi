// implements REQ-opencode-smart-enforcement-v1
import { getFileLinkedTargetsByType } from "./file-entity-links.js";

/**
 * Resolve the configured symbols manifest path using loadKbSyncPaths(worktree),
 * read the YAML synchronously, and return up to 3 deduped REQ IDs linked to
 * the edited file path via implements relationships.
 *
 * Supports both YAML formats: top-level array and { symbols: [...] } object.
 * This function is purely synchronous and makes no runtime KB queries.
 */
// implements REQ-opencode-smart-enforcement-v1
export function getSourceLinkedRequirementIds(
  worktree: string,
  editedAbsolutePath: string,
): string[] {
  // Delegate to the shared file-entity-links resolver with implements-only filter.
  // implements relationships always target REQ- IDs, so no additional filtering needed.
  return getFileLinkedTargetsByType(worktree, editedAbsolutePath, ["implements"]).slice(0, 3);
}
