---
"kibi-mcp": patch
"kibi-cli": patch
---

Kibi now records MCP tool failures with structured error categories and stages, so operators can tell persistence conflicts, Prolog runtime failures, lifecycle failures, and validation errors apart without manually inspecting raw logs. Usage metrics now surface those categories across all tools instead of only grouping `kb_upsert` failures, making incidents like stale snapshots or Prolog startup errors easier to diagnose.

- `kibi-mcp`: add diagnostic error classification fields (`error_name`, `error_category`, `error_stage`, `error_summary`) to handler error rows in `.kb/usage.log`.
- `kibi-cli`: extend `usage-metrics` reports with cross-tool error category, stage, and tool breakdowns while preserving existing upsert error summaries.
