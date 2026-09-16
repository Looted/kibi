---
"kibi-zcode": minor
---

Kibi now ships a native ZCode plugin. Teams working in ZCode get the four
bundled Kibi workflow skills, a `/kibi-bootstrap` slash command, advisory
lifecycle hooks, and the Kibi MCP server without hand-editing any ZCode
configuration — and without the plugin making a sound in workspaces that never
adopted Kibi.

- Install via the repo marketplace from a locally built checkout: run
  `bun run build:zcode`, then in ZCode open Settings → Plugin Management →
  Discover, add the repository directory with the `+` button (marketplace
  manifest at `.claude-plugin/marketplace.json`, plugin at `packages/zcode`),
  and install `kibi-zcode`. GitHub-source installs are unsupported — the
  generated `dist/hook-runner.js` is not committed, and marketplace copies
  never build; `prepack` applies only to npm packaging flows.
- `.zcode-plugin/plugin.json` declares the skills, command, hooks, and an
  inline `mcpServers` entry verified against ZCode's strict schemas (stdio
  servers accept only `command`/`args`/`cwd`/`env`/`enabled`/`timeoutMs`;
  hook matchers are case-sensitive regexes, so "match all" is expressed by
  omitting the matcher rather than a bare `*`).
- `hooks/hooks.json` wires `SessionStart`, `PreToolUse` (edit-like tools),
  `PostToolUse`, and `Stop` to `dist/hook-runner.js`. Outputs use the exact
  ZCode contract (`hookSpecificOutput.hookEventName` + `additionalContext`):
  direct `.kb/` edits get an advisory warning, opted-in sessions get discovery
  guidance, and stops remind about impact checks and freshness. Tracking is
  mutation-based (read-only tool calls never count as changes), compares
  canonical workspace-relative paths across edits and `kb_check` sourceFiles,
  invalidates a covering impact check when the same path is edited again, and
  is namespaced per host session so concurrent ZCode sessions in one workspace
  cannot consume or clear each other's pending reminders. Hard enforcement
  stays with the Kibi git hooks.
- The skills mirror (`packages/zcode/skills/`) rewrites each canonical
  SKILL.md frontmatter to ZCode's recognized key set (`name`, `description`,
  `license`, `metadata`) so skills are marked `safeToAutoLoad`; bodies and
  resources stay byte-identical to `packages/runtime/src/skills/`, enforced by
  a drift test. `scripts/sync-agent-skills.ts` gained a `zcode` target.
- `bin/mcp-launcher.cjs` keeps non-Kibi workspaces silent: a zero-tool MCP
  session when no `.kb/manifest.json` exists at the resolved Kibi project
  root, a proxy of the resolved `kibi-mcp` (project-local package entry first
  via Node's own resolution, then a PATH lookup — launched shell-free through
  `process.execPath`, so it also works on Windows without command
  interpreters) when it does, and a guidance session that distinguishes a
  missing installation from a launch failure.
- Packaging: `files` ships the manifest, launcher, hooks, skills, command, and
  built `dist/`; `scripts/sync-plugin-manifest-versions.ts` keeps the plugin
  manifest version in sync with the package version; root scripts gained
  `build:zcode`, `dev:zcode`, and matching typecheck entries wired into the
  `build`, `typecheck`, and `pack:all` chains.
