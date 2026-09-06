---
"kibi-cli": patch
"kibi-opencode": patch
"kibi-mcp": patch
---

Unit coverage can now reach leftover CLI, OpenCode, MCP, and SkillOpt
branches without changing product behavior. Helpers that were previously
private (package version, pending relationship recovery, relationship-delete
migration, advisory empty-event policy, daemon and CLI entrypoints, comment
suggestion reset, source-hash warnings) are testable, and a vanished
relationship shard after a successful commit is reported as a repair instead
of being silently skipped.

- Export small CLI, OpenCode, MCP, and SkillOpt test seams and report vanished relationship shards.
- Keep migration `--yes` and legacy-delete blocks unchanged.
