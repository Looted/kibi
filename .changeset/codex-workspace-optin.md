---
"kibi-codex": minor
---

The Kibi plugin for Codex now stays silent and inactive in workspaces that never
opted into Kibi, even though the plugin itself is installed and enabled
globally. Unconfigured workspaces no longer see bootstrap prompts, edit
tracking, freshness reminders, or MCP startup errors, while opted-in workspaces
keep the full workflow with reminders scoped per workspace (worktrees
included).

- Workspace opt-in is defined by `.kb/manifest.json` at the resolved Kibi
  project root (honoring the standard `KIBI_WORKSPACE`, `KIBI_PROJECT_ROOT`,
  and `KIBI_ROOT` environment overrides). Project-root resolution walks up from
  the session directory and stops at the `.git` boundary, so subdirectories map
  to their repository, Git worktrees stay independent, and unrelated enclosing
  repositories never leak opt-in.
- Every hook event exits successfully and silently in unconfigured workspaces;
  no hook state is written there, and hook state is now namespaced under
  `workspaces/<hash-of-root>` so one project's activity can never surface as
  reminders in another.
- `.mcp.json` now launches an inline workspace-aware launcher (`node -e`,
  built from `bin/mcp-launcher.cjs`): it serves a clean zero-tool MCP session
  in unconfigured workspaces, proxies the project-local `kibi-mcp`
  (`npx --no-install kibi-mcp`, unchanged resolution semantics) in opted-in
  workspaces, and starts with guidance instead of a handshake failure when an
  opted-in workspace lacks a resolvable `kibi-mcp`. Codex (verified against
  codex-cli 0.153.4) has no workspace-scoped MCP activation, so the launcher is
  the supported way to keep non-Kibi workspaces free of MCP startup errors.
- Explicit initialization is unchanged and remains opt-in: run `kibi init` or
  the kibi-bootstrap skill; the plugin never initializes a workspace on its own.
- Packaging: the packed plugin is verified to ship `dist/hook-runner.js` and
  the compiled hook assets; local marketplace installs should run
  `bun run build:codex` before installing (a source-tree install without a
  build is missing the hook runner entirely).
