// implements REQ-opencode-smart-enforcement-v1
import { getFileLinkedEntityIds } from "./file-entity-links.js";

/**
 * Resolve the configured symbols manifest path using loadKbSyncPaths(worktree),
 * read the YAML synchronously, and return up to 3 deduped REQ IDs linked to
 * the edited file path. Preference is given to relationships[type=implements].target
 * (in file order) then static links as a fallback, preserving file order.
 *
 * Supports both YAML formats: top-level array and { symbols: [...] } object.
 * This function is purely synchronous and makes no runtime KB queries.
 */
// implements REQ-opencode-smart-enforcement-v1
export function getSourceLinkedRequirementIds(
  worktree: string,
  editedAbsolutePath: string,
): string[] {
  // Delegate to the shared file-entity-links resolver.
  // getFileLinkedEntityIds returns implements → covered_by → executable_for → static links.
  // For the REQ-only API, we filter to REQ-prefixed IDs to maintain the existing contract.
  const result = getFileLinkedEntityIds(worktree, editedAbsolutePath);

  // Filter to only REQ IDs to maintain the existing contract
  return result.ids.filter((id) => id.startsWith("REQ-"));
}
