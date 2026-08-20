# kibi-cursor

Cursor plugin for Kibi — repo-local, per-branch, queryable knowledge base.

`kibi-cursor` is optional. It provides Cursor-specific rules, skills, commands, MCP wiring, and advisory editor hooks, but it does not ship a replacement `kibi` CLI or `kibi-mcp` server binary.

## Prerequisites

Install these **before** enabling the plugin MCP server:

| Requirement | Why |
| --- | --- |
| **SWI-Prolog 9+** (`swipl` on `PATH`) | Powers Kibi inference and validation |
| **`kibi-cli`** | Project CLI (`kibi` command) |
| **`kibi-mcp`** | MCP server the plugin's `mcp.json` invokes via `npx --no-install kibi-mcp` |
| **`kibi-core`** | Shared graph/runtime dependency |

```bash
npm install --save-dev kibi-cli kibi-mcp kibi-core
swipl --version
npm exec -- kibi doctor
```

Full setup: [docs/install.md](https://github.com/Looted/kibi/blob/develop/docs/install.md).

Add this plugin only after the base packages work in your project.

**Git worktrees:** the published plugin MCP entry (`npx --no-install kibi-mcp`) needs `kibi-mcp` resolvable from that worktree's `node_modules` (run install there). For this monorepo's dogfood path, prefer project `.cursor/mcp.json`, which can fall back to the primary checkout's built MCP — see [DEV.md](./DEV.md#linked-worktrees).

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

The plugin bundles `mcp.json` pointing at the project-local `kibi-mcp` binary:

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
├── skills/       # canonical Kibi Agent Skills (kibi-usage, init-kibi, ...)
└── mcp.json      # agent-plugins.org/schemas/1.0.0/mcp.schema.json (stdio kibi-mcp)
```

- Cursor loads the portable build directly; Cursor-only components (rules, commands, hooks) remain in the `.cursor-plugin` Cursor Plugin build.
- Both formats are listed in the same marketplace; pick the format your client needs.
- The portable build still requires the project-local `kibi-cli`, `kibi-mcp`, and `kibi-core` packages plus SWI-Prolog 9+ (see Prerequisites above).

## Features

### Discovery-first rules and skills

- **Rules**: always-on capability-based workflow guidance plus optional traceability rules for source files.
- **Skills**: `kibi-usage`, `init-kibi`, `kibi-freshness`, and `kibi-traceability`.
- **Commands**: `/init-kibi` documents the `kb_autopilot_generate` bootstrap workflow.

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

## License

AGPL-3.0-or-later
