---
"kibi-cursor": minor
---

The Cursor plugin now supports capability-based Kibi interface selection, using visible MCP tools first and a trusted project-local CLI fallback when needed. Deterministic worktree resolution keeps both interface choices anchored to the intended repository.

- Add MCP-first, CLI-fallback agent guidance.
- Resolve trusted worktree runtime paths deterministically.
