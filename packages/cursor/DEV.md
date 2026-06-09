# Kibi Cursor Dogfood Setup

This repository dogfoods local built `kibi-mcp` and `kibi-cursor` artifacts instead of consuming the published npm packages in its own Cursor workflow.

## Local Wiring

The repo-root setup relies on these files:

1. `.cursor/mcp.json` starts the local MCP server through a `git rev-parse --show-toplevel` wrapper, matching the OpenCode dogfood pattern in `opencode.json`.
2. `.cursor/hooks.json` runs `packages/cursor/dist/hook-runner.js` for advisory editor hooks.
3. `.cursor/rules/*.mdc` mirrors plugin rules after sync (optional but recommended for rule dogfood).
4. `packages/mcp/dist/` and `packages/cursor/dist/` must exist locally because Cursor uses those built outputs.

Do **not** rely on a symlink into `~/.cursor/plugins/local` for repo dogfood. Cursor rejects symlinks whose targets live outside the plugins/local directory.

## Initial Setup

```bash
bun install
bun run build
./scripts/sync-cursor-dogfood.sh
```

Then reload Cursor (**Developer: Reload Window**).

## Rebuild Rule

Because this repo uses local build artifacts, rerun the full build whenever you:

- change a version in `package.json` for any Kibi package
- change local package wiring between `packages/core`, `packages/cli`, `packages/mcp`, and `packages/cursor`
- change code in `packages/mcp/src/` or `packages/cursor/src/`
- need refreshed build output before testing the repo's Cursor dogfood flow

Use:

```bash
bun run build
./scripts/sync-cursor-dogfood.sh
```

If you are only iterating on `packages/cursor/src/`, you can keep the plugin build hot with:

```bash
bun run dev:cursor
```

That watch mode updates `packages/cursor/dist/`, but version bumps and cross-package changes still require `bun run build`.

## How It Works

1. You edit code in `packages/mcp/src/` or `packages/cursor/src/`.
2. The build writes compiled output into `packages/mcp/dist/` and `packages/cursor/dist/`.
3. Cursor loads `.cursor/mcp.json` from the workspace and starts `packages/mcp/bin/kibi-mcp` from the repo root resolved via `git rev-parse`.
4. Cursor loads `.cursor/hooks.json` from the workspace and runs the local hook runner on agent events.
5. `./scripts/sync-cursor-dogfood.sh` copies plugin rules into `.cursor/rules/` so rule dogfood does not require a marketplace install.
6. Reloading Cursor picks up the refreshed local artifacts.

## Full Plugin UI Testing (Optional)

Project-level `.cursor/mcp.json` and `.cursor/hooks.json` are enough for MCP + hook dogfood.

To also test plugin packaging (skills, commands, plugin-bundled MCP) in the Cursor Plugins UI:

```bash
./scripts/sync-cursor-plugin-local.sh
```

This copies a real directory (not a symlink) into `~/.cursor/plugins/local/kibi-cursor` (WSL/Linux home). Reload Cursor afterward.

**WSL note:** With `layout: unifiedAgent`, Cursor loads user plugins from your WSL home (`/home/<user>/.cursor/plugins/local`), not `C:\Users\<user>\.cursor\plugins\local`. A Windows profile copy is ignored for WSL workspaces and is not created by default.

For native Windows plugin testing only:

```bash
SYNC_CURSOR_PLUGIN_WINDOWS=1 CURSOR_WINDOWS_USER=pfran ./scripts/sync-cursor-plugin-local.sh
```

## Verification

Check the dogfood wiring after rebuilds:

```bash
cat .cursor/mcp.json
cat .cursor/hooks.json
ls packages/mcp/dist
ls packages/cursor/dist
ls .cursor/rules
```

Run the lock tests:

```bash
bun test packages/cursor/tests/dogfood-config.test.ts
```

## Common Issues

**MCP shows error/degraded:**
- Run `bun run build` and `./scripts/sync-cursor-dogfood.sh`
- Confirm `bun run packages/mcp/bin/kibi-mcp --diagnostic-mode` works from the repo root
- Reload Cursor

**Hooks do not fire:**
- Confirm `packages/cursor/dist/hook-runner.js` exists
- Check the Hooks output channel in Cursor
- Reload Cursor after `hooks.json` changes

**Plugin MCP fails with `npx canceled due to missing packages ... kibi-mcp`:**
- The bundled plugin `mcp.json` uses `npx --no-install kibi-mcp`, which requires `kibi-mcp` in the workspace `node_modules`.
- This repo wires that via root `devDependencies.kibi-mcp: workspace:*`. Run `bun install` after pulling that change.
- For dogfood you can also disable the plugin MCP entry (`plugin-kibi-cursor-kibi`) and keep the workspace `.cursor/mcp.json` server, which runs the local `packages/mcp/bin/kibi-mcp` build instead.

**Published plugin got loaded instead of local artifacts:**
- Prefer repo dogfood via `.cursor/mcp.json` and `.cursor/hooks.json`
- Disable duplicate `kibi` MCP entries in Settings if both project and plugin MCP are present

**Symlinked local plugin rejected:**
- Cursor logs: `loadUserLocalPlugin kibi-cursor rejected: symlink target ... is outside .../plugins/local`
- Use `./scripts/sync-cursor-plugin-local.sh` (copy) instead of `ln -s`
