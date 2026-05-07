---
"kibi-cli": patch
"kibi-opencode": patch
---

Add configurable idle-brief delay and retention policies in shared `.kb/config.json` (`briefs.tui.idleDelayMs` and `briefs.retention.*`). OpenCode now applies retention garbage collection after brief writes and prunes stale `.tui-seen` hashes for briefs that were deleted by retention.
