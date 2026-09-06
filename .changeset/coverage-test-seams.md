---
"kibi-cli": patch
"kibi-opencode": patch
---

Unit coverage can now reach a few leftover CLI and OpenCode branches without
changing product behavior. Helpers that were previously private (package
version, doctor export detection, upsert vanished-shard warnings, daemon
entrypoint) are testable, and a vanished relationship shard after a successful
commit is reported as a repair instead of being silently skipped.

- Export small CLI test seams and report vanished relationship shards.
- Keep migration `--yes` and legacy-delete blocks unchanged.
