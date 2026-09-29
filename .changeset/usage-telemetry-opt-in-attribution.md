---
"kibi-mcp": patch
"kibi-cursor": patch
"kibi-codex": patch
---

Usage telemetry stays off by default for every client, and there is now a supported way to turn it on. Previously the only way to capture usage was to hand-write an MCP command line with `--diagnostic-mode`, which meant anyone using a shipped plugin recorded nothing at all and had no documented alternative. Operators can now opt in with an environment variable, and once they do, each row identifies the host, package version, and checkout that produced it, so behavior can be compared across editors, worktrees, and Kibi versions.

- Honor `KIBI_DIAGNOSTIC_MODE=1` alongside the existing `--diagnostic-mode` flag, for hosts where a plugin owns the MCP command line.
- Stamp `interface`, `host`, `package_version`, and `workspace_root` on every usage row.
- Set `KIBI_MCP_HOST` from the Cursor and Codex launchers for attribution only; it never enables logging, and installing or enabling a plugin never starts telemetry.
- Stop the bundled Cursor worktree resolver from hard-coding `--diagnostic-mode`, so a shipped launcher cannot enable capture on an operator's behalf.
- Document the opt-in, what a row contains, and how to opt out in `docs/mcp-reference.md`.
