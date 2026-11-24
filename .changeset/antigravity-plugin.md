---
"kibi-antigravity": minor
---

Kibi now ships an optional Google Antigravity plugin (`packages/antigravity`, `name: "kibi"`) with bundled Kibi skills, always-on workflow rules, a workspace-gated MCP server that supports both workspace-scoped and global Marketplace installs via MCP `roots/list`, and lifecycle hooks for requirement snippets, firm-edit confirmation, and stop reminders. Users can validate and install it directly with `agy plugin validate --strict` / `agy plugin install` or register it per repository via `.agents/plugins.json`.

Technical summary: added `packages/antigravity` (`plugin.json`, `hooks.json`, `mcp_config.json`, `rules/AGENTS.md`, `assets/logo.svg`, `bin/run-node.cmd`, `bin/run-node.sh`, `bin/mcp-launcher.cjs`, `src/*.ts`, bundled `bin/hook-runner.mjs`, synced `skills/`, and unit tests), wired `antigravity` target into `scripts/sync-agent-skills.ts`, root `plugin.json` version sync into `scripts/sync-plugin-manifest-versions.ts`, `scripts/package-catalog.ts`, `package.json`, `test/root.test.ts`, `.agents/plugins.json`, README, and docs-site.
