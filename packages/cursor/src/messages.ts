// implements REQ-cursor-kibi-plugin-v1
export const BOOTSTRAP_REMINDER =
  "Kibi is not initialized for this workspace. Use the Kibi MCP workflow to bootstrap project memory before relying on KB lookups; do not edit .kb/ files directly.";

export const DIRECT_KB_EDIT_WARNING =
  "Avoid direct edits to .kb/. Use Kibi MCP tools for KB discovery and mutations so project memory stays valid.";

export function freshnessReminder(dirtyPaths: readonly string[]): string {
  const preview = dirtyPaths.slice(0, 10).map((dirtyPath) => `- ${dirtyPath}`);
  const remaining = dirtyPaths.length - preview.length;
  const suffix = remaining > 0 ? [`- …and ${remaining} more`] : [];

  return [
    "Kibi freshness reminder: source, test, or documentation paths changed during this Cursor session.",
    "Before finishing, use Kibi MCP tools to resolve KB freshness or record a no-impact rationale.",
    ...preview,
    ...suffix,
  ].join("\n");
}
