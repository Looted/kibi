---
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

The Codex, Cursor, and ZCode plugins now answer Kibi tools from the workspace your session is actually in. Like Claude Code, these hosts start the Kibi MCP server once, in the project that was opened. If a session then works in a git worktree, every lookup used to come from the original checkout's branch, so anything that exists only on the worktree's branch looked missing. When the host supports MCP roots, the launcher now follows the session; when it does not, nothing changes.

- Replace each launcher's byte pipe with the shared kibi-session-proxy. Before each tool call it reads the client's `roots/list`; when the roots name a different Kibi workspace, it starts that workspace's `kibi-mcp`, replays `initialize`, retires the old server after its in-flight calls, and sends `notifications/tools/list_changed`.
- `KIBI_WORKSPACE` pins the workspace. Clients without roots, non-Kibi roots, an unanswered roots query, and a failed start keep the current server.
- The ZCode launcher now sets `KIBI_MCP_HOST=zcode`, like the other hosts, so its usage rows are attributed.
- The Codex `.mcp.json` re-inlines the updated launcher.
