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

## Installation

### Cursor Marketplace (recommended)

Submit or install from the Kibi repository marketplace at `.cursor-plugin/marketplace.json`, which points at `./plugins/kibi-cursor`.

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

## Features

### Discovery-first rules and skills

- **Rules**: always-on MCP workflow guidance plus optional traceability rules for source files.
- **Skills**: `kibi-usage`, `init-kibi`, `kibi-freshness`, and `kibi-traceability`.
- **Commands**: `/init-kibi` documents the `kb_autopilot_generate` bootstrap workflow.

### Advisory editor hooks

Hooks are warning-only and never replace MCP/CLI behavior:

- **sessionStart**: bootstrap reminder when `.kb/config.json` is missing.
- **preToolUse**: warns on explicit direct `.kb/**` edits without blocking.
- **beforeReadFile** and **postToolUse (Read)**: inject source-linked lookup guidance once per path per session.
- **postToolUse (Write/Edit)**: inject traceability and freshness guidance once per path per session, including `kb_check({sourceFiles:[...], includeImpactDiagnostics:true, includeWorkingTreeDiff:true})` for meaningful source edits.
- **stop**: emits a single freshness or impact-check follow-up when meaningful paths changed during the session.

### What the plugin does not do

Per the thin-adapter architecture, `kibi-cursor` does not:

- Own KB storage, parsing, or validation
- Run background `kibi sync` or CLI `kibi check` (use git hooks and MCP tools; for source edits, use impact-enabled MCP `kb_check` first)
- Block agent actions in advisory mode

## Architecture

`kibi-cursor` is a thin bridge layer:

- **Agent-visible guidance**: public MCP tools (`kb_search`, `kb_query`, `kb_upsert`, impact-enabled `kb_check`, etc.) and the `/init-kibi` command
- **Editor-specific value**: Cursor hooks for read/write reminders and session freshness follow-ups
- **Foundation**: `kibi-core`, `kibi-cli`, and `kibi-mcp` remain required for project-local operations

## License

AGPL-3.0-or-later
