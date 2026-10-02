---
"kibi-claude": minor
---

The Claude Code plugin can now record what an agent did around its Kibi calls, so you can see whether it looked up requirements before editing or only afterwards. MCP and CLI rows show which Kibi operations ran, but not the reads and edits between them, and that was the question the earlier data could not answer. Recording is off unless `KIBI_DIAGNOSTIC_MODE=1` is set, the same opt-in the MCP server and CLI use.

- Append `interface: "hook"` rows to `.kb/usage.log` for reads, edits, Grep/Glob searches, `.kb/` access, Kibi calls, and Stop reminders. Each row carries `hook_action` (shown vs. silent), `path`, `path_kind`, owning `requirement_ids`, `kb_operation`, `kb_used_before`, and the host `session_id`.
- Rows are best effort and never change hook output; files outside the knowledge surface are not recorded.
- Rebuild `bin/hook-runner.mjs`.
