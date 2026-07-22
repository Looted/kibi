---
"kibi-cursor": patch
"kibi-mcp": patch
---

Cursor dogfood sessions now keep each linked worktree as the Kibi data workspace while launching a compatible built MCP runtime from that worktree or its primary checkout. Invalid, stale, or unrelated builds are rejected without installing packages, and Cursor hooks offer the project-local CLI only as advisory guidance after explicit workspace trust.

- Add deterministic build, runtime, SWI-Prolog, and package-version checks to the Cursor worktree resolver.
- Preserve an explicit `KIBI_WORKSPACE` when the MCP diagnostic launcher starts from another runtime root.
- Track MCP capability as `observed` or `unknown` and keep hook-driven CLI fallback non-executing.
