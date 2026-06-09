# kibi-cursor

## 0.2.0

### Minor Changes

- Cursor users can now install an optional Kibi adapter plugin that bundles MCP configuration, workflow rules, skills, slash commands, and advisory editor hooks. The plugin builds on the existing `kibi-cli` and `kibi-mcp` foundation without replacing them, and teams that prefer manual setup can continue configuring the local `kibi-mcp` server directly.

  - Add the publishable `kibi-cursor` package with Cursor plugin manifest assets, rules, skills, commands, hook declarations, and MCP config.
  - Add advisory hooks for bootstrap reminders, direct `.kb` edit warnings, read/write guidance, and session freshness follow-ups.
  - Wire `kibi-cursor` into workspace build, pack, release-state, publish, CI unit coverage, docs, and marketplace verification.

## 0.1.0

### Minor Changes

- Cursor users can install an optional Kibi adapter plugin that bundles MCP configuration, workflow rules, skills, slash commands, and advisory editor hooks. The plugin builds on `kibi-core`, `kibi-cli`, and `kibi-mcp` without replacing them, and teams that prefer manual setup can continue configuring the local `kibi-mcp` server directly.

  - Add the publishable `kibi-cursor` package with Cursor plugin manifest assets, bundled skills, rules, commands, hook declarations, and MCP config.
  - Add a conservative hook runner with bounded session state, bootstrap reminders, direct `.kb` edit warnings, read/write guidance, and freshness follow-ups.
  - Wire `kibi-cursor` into workspace build, pack, release-state, publish, CI unit coverage, docs, and marketplace verification.
