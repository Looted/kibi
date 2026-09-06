---
"kibi-cli": patch
"kibi-opencode": patch
---

Unit coverage can now reach leftover CLI, OpenCode, and SkillOpt branches
without changing product behavior. Helpers that were previously private
(package version, pending relationship recovery, relationship-delete
migration, advisory empty-event policy, daemon and CLI entrypoints) are
testable, and a vanished relationship shard after a successful commit is
reported as a repair instead of being silently skipped.

- Export small CLI, OpenCode, and SkillOpt test seams and report vanished relationship shards.
- Keep migration `--yes` and legacy-delete blocks unchanged.
