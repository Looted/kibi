---
"kibi-agent-core": patch
"kibi-opencode": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Host hooks no longer ask for a `kb_check` after a `kb_upsert` dry run. A dry run only validates, so the Cursor, Codex, ZCode and OpenCode hooks now count it as validation rather than a KB write.

- `extractKbMcpToolCall` reports `kb_upsert` with `dryRun: true` as `kb_validate_upsert`.
- OpenCode's freshness evidence records a dry-run upsert as `kb_validate_upsert`, which carries no mutation evidence.
