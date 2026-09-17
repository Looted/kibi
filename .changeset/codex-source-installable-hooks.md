---
"kibi-codex": patch
---

Codex plugin installations now include a self-contained hook runner, so lifecycle hooks work directly from a source checkout as well as from a packed package. The runner keeps the existing Kibi workspace opt-in and per-workspace state behavior while covering SessionStart, PreToolUse, PostToolUse, and Stop.

- Bundle the Codex hook runner into the published `bin` artifact and check it for deterministic drift.
- Point the hook manifest at the host-provided `$PLUGIN_ROOT` executable path.
