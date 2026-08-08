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
    "In OpenCode, Kibi MCP tools are host-prefixed: canonical `kb_autopilot_generate`, `kb_upsert`, and `kb_check` may appear as `kibi_kb_autopilot_generate`, `kibi_kb_upsert`, and `kibi_kb_check`.",
    "OpenCode prefixes Kibi MCP tools with `kibi_`; use the visible prefixed name when the host requires exact tool identifiers.",
    "",
    "## 3. Preview and Approval",
    "Present the `promptBlock`, a summary of synthesized `candidates`, and the exact `applyPlan` payloads to the user. **Wait for explicit approval** before proceeding to writes.",
    "",
    "## 4. Apply Approved Candidates",
    "Apply approved candidates sequentially using `kb_upsert` (following ascending phase order). Confirm success of each write before moving to the next. Run `kb_check` after the batch to verify KB integrity.",
    "",
    "## Rules",
    "- Never apply changes without a user-facing preview and approval.",
    "- MCP tools and the trusted project-local CLI are peer surfaces; choose by what is visible and approved here.",
    "- If Kibi MCP tools are visible and approved, use MCP.",
    "- Otherwise, in a trusted workspace, use the project-local CLI's dedicated JSON routes with `--input <file|->`. If neither interface is available, stop and tell the operator.",
    "- Do not infer MCP availability from config file existence. Do not read or edit `.kb/` files directly.",
    "- Query before mutate. Run `kb_upsert` sequentially. Run `kb_check` before completion.",
  ];

  return lines.join("\n");
}
