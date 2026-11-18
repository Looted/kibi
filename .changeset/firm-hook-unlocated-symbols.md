---
"kibi-agent-core": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
"kibi-opencode": patch
---

The pre-edit firm-requirement question no longer depends on `.kb/symbol-coordinates.yaml` being present and current. That file is a local cache, missing in a fresh clone and stale once a file changes after the last sync, and without it an edit of firm code got no question or notice on any host. A symbol whose coordinates are missing, run past the end of the file, or no longer name it near its first line now counts as touched by any edit of its file, as do file-level records, so the hooks ask (Claude Code) or tell the agent to ask (Codex, Cursor, ZCode, OpenCode).
