# kibi-cursor

Cursor plugin for Kibi — repo-local, per-branch, queryable knowledge base.

`kibi-cursor` is optional. It provides Cursor-specific rules, skills, commands, MCP wiring, and advisory editor hooks, but it does not ship a replacement `kibi` CLI or `kibi-mcp` server binary.

## Prerequisites

Install these **before** enabling the plugin MCP server:

| Requirement | Why |
| --- | --- |
| **SWI-Prolog 9+** (`swipl` on `PATH`) | Powers Kibi inference and validation |
| **`kibi-cli`** | Project CLI (`kibi` command) |
| **`kibi-mcp`** | MCP server installed in the opened project; the plugin launcher resolves this package without downloading it |
| **`kibi-core`** | Shared graph/runtime dependency |

```bash
npm install --save-dev kibi-cli kibi-mcp kibi-core
swipl --version
npm exec -- kibi doctor
```

Full setup: [docs/install.md](https://github.com/Looted/kibi/blob/develop/docs/install.md).

Add this plugin only after the base packages work in your project.

**Git worktrees:** the published plugin MCP entry resolves `kibi-mcp` from the opened worktree's `node_modules` (run install there). The plugin does not download or bundle a Kibi runtime. For this monorepo's dogfood path, prefer project `.cursor/mcp.json`, which can fall back to the primary checkout's built MCP — see [DEV.md](./DEV.md#linked-worktrees).

## Installation

### Cursor Marketplace (recommended)

Submit or install from the Kibi repository marketplace at `.cursor-plugin/marketplace.json`, which points at `./plugins/kibi-cursor` (Cursor Plugin) and `./plugins/kibi-agent-plugin` (portable Agent Plugin). Cursor detects the format from the plugin manifest, so both install from the same marketplace.

For local testing before marketplace publication, copy a real directory tree into Cursor's user-plugins folder. Symlinks are rejected when the target lives outside `plugins/local` (common on WSL):

```bash
./scripts/sync-cursor-plugin-local.sh
```

On WSL workspaces, Cursor reads `~/.cursor/plugins/local` in your Linux home, not the Windows profile path. Reload Cursor (**Developer: Reload Window**) and check **Plugins → User**.

### npm package

```bash
npm install --save-dev kibi-cursor
```

Copy the installed package into Cursor's local plugin directory (do not symlink):

```bash
cp -r "$(npm root)/kibi-cursor" ~/.cursor/plugins/local/kibi-cursor
```

## MCP configuration

The plugin bundles `mcp.json` with a thin launcher that locates and starts the
`kibi-mcp` package installed in the opened project. The launcher runs from the
consumer workspace and sets `KIBI_WORKSPACE` to that root; it never downloads,
bundles, or falls back to a global Kibi runtime:

```json
{
  "mcpServers": {
    "kibi": {
      "command": "node",
      "args": ["bin/launch-kibi-mcp.mjs", "${workspaceFolder}"]
    }
  }
}
```

Toggle the bundled MCP server from **Settings → Features → Model Context Protocol** after installing the plugin.

Manual MCP fallback (no plugin install required):

```json
{
  "mcpServers": {
    "kibi": {
      "command": "npx",
      "args": ["--no-install", "kibi-mcp"]
    }
  }
}
```

## Portable Agent Plugin (Agent Plugins standard)

`kibi-cursor` also ships a portable [Agent Plugins](https://agent-plugins.org) build at `agent-plugin/`. The Agent Plugins open standard (v1.0.0) packages Agent Skills and MCP servers for any compatible client — Cursor, Copilot, OpenCode, and others — so the same Kibi capabilities load without client-specific adaptation.

```
agent-plugin/
├── plugin.json   # agent-plugins.org/schemas/1.0.0/plugin.schema.json
├── skills/       # canonical Kibi Agent Skills (kibi-usage, kibi-bootstrap, ...)
└── mcp.json      # agent-plugins.org/schemas/1.0.0/mcp.schema.json (stdio kibi-mcp)
```

- Cursor loads the portable build directly; Cursor-only components (rules, commands, hooks) remain in the `.cursor-plugin` Cursor Plugin build.
- Both formats are listed in the same marketplace; pick the format your client needs.
- The portable build still requires the project-local `kibi-cli`, `kibi-mcp`, and `kibi-core` packages plus SWI-Prolog 9+ (see Prerequisites above).

## Features

### Discovery-first rules and skills

- **Rules**: always-on capability-based workflow guidance plus optional traceability rules for source files.
- **Skills**: `kibi-usage`, `kibi-bootstrap`, `kibi-freshness`, and `kibi-traceability`.
- **Commands**: `/kibi-bootstrap` documents the `kb_plan_bootstrap` bootstrap workflow.

### Advisory editor hooks

Hooks are warning-only and never replace MCP/CLI behavior:

- **sessionStart**: bootstrap reminder when `.kb/manifest.json` is missing.
- **preToolUse**: warns on explicit direct `.kb/**` edits without blocking.
- **beforeReadFile** and **postToolUse (Read)**: inject source-linked lookup guidance once per path per session.
- **postToolUse (Write/Edit)**: inject traceability and freshness guidance once per path per session, including `kb_check({sourceFiles:[...], includeImpactDiagnostics:true, includeWorkingTreeDiff:true})` for meaningful source edits.
- **stop**: emits a single freshness or impact-check follow-up when meaningful paths were **edited** during the turn (reads and search do not count). Plan delivery (`CreatePlan`) stays silent unless that same turn also edited source or mutated the KB.

### What the plugin does not do

Per the thin-adapter architecture, `kibi-cursor` does not:

- Own KB storage, parsing, or validation
- Run background `kibi sync` or CLI `kibi check` from hooks (agents select visible MCP tools or trusted project-local CLI JSON routes; for source edits, use impact-enabled `kb_check` first)
- Block agent actions in advisory mode

## Architecture

`kibi-cursor` is a thin bridge layer:

- **Agent-visible guidance**: visible public MCP tools or trusted project-local CLI JSON routes (`--input`), plus a blocked/operator state when neither is available
- **Editor-specific value**: Cursor hooks for read/write reminders and session freshness follow-ups
- **Foundation**: `kibi-core`, `kibi-cli`, and `kibi-mcp` remain required for project-local operations

## CLI fallback when MCP is unavailable

The always-on `kibi-workflow` rule selects the trusted project-local CLI when Kibi MCP tools are not in the tool list. Hooks stay advisory and never execute that CLI themselves.

For the agent to actually run the fallback, the Cursor session needs:

- Agent mode with Shell enabled (Ask mode cannot run the CLI)
- A trusted workspace, or explicit operator approval of the project-local CLI
- Project-local `kibi-cli` (use `npx --no-install kibi` or `bunx --no-install kibi`; never a global or installing runner)
- Plugin rules loaded in the Cursor harness

If MCP tools are visible, use MCP and do not use this CLI path. If Shell is unavailable or the workspace is untrusted, stop and ask the operator; do not probe the CLI.

A Cursor model invoked outside Cursor's plugin harness will not load this rule. Inject the same always-on guidance into that host's system prompt or `AGENTS.md`.

## License

AGPL-3.0-or-later
