/**
 * Builds the canonical native alias for the Kibi MCP bootstrap workflow.
 * This is a thin wrapper over the MCP-defined workflow, preserving all
 * semantic markers while removing namespacing and keeping text concise.
 * 
 * Markers (MUST PRESERVE):
 * - "at most 4 bounded questions"
 * - "kb_autopilot_generate"
 * - "preview" or "approval"
 * - "kb_upsert"
 * - "kb_check"
 * - "sequential" or similar ordering language
 */
// implements REQ-opencode-kibi-briefing-v2
export function buildInitKibiAlias(): string {
  const lines = [
    "# /init-kibi: Interactive Activation",
    "",
    "Use this workflow to onboard a new or empty repository into Kibi through interactive discovery.",
    "",
    "## 1. Gather Declared Context",
    "Ask at most 4 bounded questions to gather intent: Project Summary, Source of Truth, Priority Root, and Verification Anchors.",
    "",
    "## 2. Synthesize Candidates",
    "Call `kb_autopilot_generate` with the gathered context to synthesize candidate entities. This tool is **read-only**.",
    "",
    "## 3. Preview and Approval",
    "Present the `promptBlock` and a summary of synthesized `candidates` to the user. **Wait for explicit approval** before proceeding to writes.",
    "",
    "## 4. Apply Approved Candidates",
    "Apply approved candidates sequentially using `kb_upsert` (following ascending phase order). Confirm success of each write before moving to the next. Run `kb_check` after the batch to verify KB integrity.",
    "",
    "## Rules",
    "- Never apply changes without a user-facing preview and approval.",
    "- Guidance must stay MCP-only; do not suggest `kibi` CLI commands.",
  ];

  return lines.join("\n");
}
