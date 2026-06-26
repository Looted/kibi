// implements REQ-codex-kibi-plugin-v1
export const BOOTSTRAP_REMINDER =
  "Kibi is not initialized for this workspace. Use the Kibi MCP workflow to bootstrap project memory before relying on KB lookups; do not edit .kb/ files directly.";

export const DIRECT_KB_EDIT_WARNING =
  "Avoid direct edits to .kb/. Use Kibi MCP tools for KB discovery and mutations so project memory stays valid.";

export function freshnessReminder(dirtyPaths: readonly string[]): string {
  const preview = dirtyPaths.slice(0, 10).map((dirtyPath) => `- ${dirtyPath}`);
  const remaining = dirtyPaths.length - preview.length;
  const suffix = remaining > 0 ? [`- …and ${remaining} more`] : [];

  return [
    "Kibi freshness reminder: source, test, or documentation paths changed during this Codex session.",
    "Before finishing, use Kibi MCP tools to resolve KB freshness or record a no-impact rationale.",
    ...preview,
    ...suffix,
  ].join("\n");
}

export function impactCheckReminder(sourcePaths: readonly string[]): string {
  const preview = sourcePaths.slice(0, 10);
  const sourceFiles = JSON.stringify(preview);
  const remaining = sourcePaths.length - preview.length;
  const suffix = remaining > 0 ? [`- …and ${remaining} more`] : [];

  return [
    "Kibi impact reminder: source paths changed during this Codex session.",
    `Run kb_check({sourceFiles:${sourceFiles}, includeImpactDiagnostics:true, includeWorkingTreeDiff:true}) before finishing.`,
    "Review symbol granularity and semantic review of linked requirements/tests before stopping.",
    ...preview.map((sourcePath) => `- ${sourcePath}`),
    ...suffix,
  ].join("\n");
}
