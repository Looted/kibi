---
"kibi-mcp": patch
---

The MCP server reads a KB dependency of another workspace only where it would route a normal call. A `kb` read with a `workspaceRoot` other than the server's own is refused when workspace routing is off or that workspace is neither a worktree of the server's repository nor under the client's roots or `KIBI_MCP_ROUTABLE_ROOTS`. Technically: `WorkspaceRouter.routeKbDependency` resolves its base workspace through the same enabled and `isRoutable` checks as `route`.
