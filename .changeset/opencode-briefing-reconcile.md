---
"kibi-opencode": patch
---

Improve briefing reliability for programmatic file edits by adding session-delta reconciliation. The plugin now detects risky edits via both the `file.edited` event fast-path and a prompt-cycle fallback that reconciles the current session scope before building guidance. This ensures briefings are available even when programmatic Edit/Write tools bypass the host event bus.
