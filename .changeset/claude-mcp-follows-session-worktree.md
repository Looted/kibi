---
"kibi-claude": patch
---

Kibi tools in a Claude Code worktree session now answer from that worktree. Claude Code desktop starts a session's MCP servers in the project you opened and then moves the session into a git worktree, so every Kibi lookup was answered from the main checkout's branch: requirements and symbols that exist only on the worktree's branch came back empty, with nothing to say why.

- Before each tool call the MCP launcher reads the client's MCP roots (Claude Code returns the session's current directory). When they name a different Kibi workspace, it starts `kibi-mcp` there, replays the client's `initialize`, retires the old server, and sends `notifications/tools/list_changed`.
- Client messages are queued during a switch, so ordering is kept.
- `KIBI_WORKSPACE` (or an alias) still pins the workspace. Clients without roots, roots outside a Kibi workspace, an unanswered roots query, and a failed start all keep the current server.
