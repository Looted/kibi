// implements REQ-zcode-kibi-plugin-v1
// The plugin stays silent in workspaces that never opted into Kibi, so there
// is deliberately no bootstrap reminder: initialization happens only when the
// user explicitly runs the kibi-bootstrap skill or `kibi init`.
export const DIRECT_KB_EDIT_WARNING =
  "Avoid direct edits to .kb/. Use Kibi MCP tools for KB discovery and mutations so project memory stays valid.";

export const SESSION_START_CONTEXT =
  "Kibi is active for this workspace. Discover project memory with kb_search/kb_query, keep .kb/ out of direct file edits, and load the kibi-usage skill (kb_skills_load) for workflow guidance. Check kb_status whenever freshness matters.";

export function freshnessReminder(dirtyPaths: readonly string[]): string {
  const preview = dirtyPaths.slice(0, 10).map((dirtyPath) => `- ${dirtyPath}`);
  const remaining = dirtyPaths.length - preview.length;
  const suffix = remaining > 0 ? [`- …and ${remaining} more`] : [];

  return [
    "Kibi freshness reminder: source, test, or documentation paths changed during this ZCode session.",
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
    "Kibi impact reminder: source paths changed during this ZCode session.",
    `Run kb_check({sourceFiles:${sourceFiles}, includeImpactDiagnostics:true, includeWorkingTreeDiff:true}) before finishing.`,
    "Review symbol granularity and semantic review of linked requirements/tests before stopping.",
    ...preview.map((sourcePath) => `- ${sourcePath}`),
    ...suffix,
  ].join("\n");
}
