---
"kibi-opencode": patch
"kibi-vscode": patch
---

Improve idle-brief delivery timing and deduplication across OpenCode TUI and VS Code channels. The OpenCode plugin now syncs before idle briefing, waits for the idle work burst to settle, handles sync-only KB changes, and persists TUI-seen brief hashes so delivered briefs do not replay after restart while VS Code can still receive unread brief files.
