---
"kibi-mcp": minor
---

Kibi tools now answer from the workspace you are working in, in every harness. Hosts start the Kibi MCP server once per project and then let the agent work elsewhere, most often in a git worktree, and until now every lookup was answered from the original checkout's branch with nothing in the result to say so. Each call is now routed to the right workspace, and when that is not possible the result says which workspace answered and why.

- Every tool accepts `workspaceRoot`, the absolute path of the directory the call is about. Host hooks fill it in automatically where they exist; any agent can pass its working directory.
- Without it, the client's MCP roots are used when the client declares them (cached while the client reports changes), else the attached workspace.
- Another workspace is served by a pooled child `kibi-mcp` started there (its own project-local install when present), at most four, retired after ten idle minutes. Async `kb_check` jobs started in a child are polled in that child.
- Routing is limited to worktrees of the attached repository, directories under the client's roots, and `KIBI_MCP_ROUTABLE_ROOTS`. Refusals and failures fall back to the attached workspace with a `workspace_mismatch` diagnostic (`pinned`, `not_a_kibi_workspace`, `not_routable`, `unavailable`).
- `KIBI_WORKSPACE` and its aliases pin the server and disable routing; `KIBI_MCP_ROUTING=0` disables it; routed children run with `KIBI_MCP_ROUTED=1` and never route further.
- The frozen `tools/list` contract fixtures gain the `workspaceRoot` property on every tool.
