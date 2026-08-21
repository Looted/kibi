# Kibi Cursor Dogfood Setup

This repository dogfoods local built `kibi-mcp` and `kibi-cursor` artifacts instead of consuming the published npm packages in its own Cursor workflow.

## Local Wiring

The repo-root setup relies on these files:

1. `.cursor/mcp.json` starts the local MCP server through a worktree-aware `git` wrapper: prefer the current checkout's `packages/mcp/bin/kibi-mcp` when that binary and `packages/mcp/dist` exist, otherwise fall back to the primary checkout via `git rev-parse --git-common-dir`.
2. `.cursor/hooks.json` runs `packages/cursor/dist/hook-runner.js` for advisory editor hooks.
3. `.cursor/rules/*.mdc` mirrors plugin rules after sync (optional but recommended for rule dogfood).
4. `packages/mcp/dist/` and `packages/cursor/dist/` must exist in the **worktree or the primary checkout** because Cursor uses those built outputs.

Agent-visible Kibi operations are not owned exclusively by this MCP dogfood wiring. MCP tools and the trusted project-local CLI expose the same peer operation catalog; this setup exercises Cursor's MCP transport, resolver, and hooks specifically.

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
- change canonical skills in `packages/cli/src/public/skills/` (they are mirrored into `packages/cursor/skills/` and the portable Agent Plugin artifact)
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
3. Cursor loads `.cursor/mcp.json` from the workspace and starts `packages/mcp/bin/kibi-mcp` from the current worktree when built, otherwise from the primary checkout.
4. Cursor loads `.cursor/hooks.json` from the workspace and runs the local hook runner on agent events.
5. `./scripts/sync-cursor-dogfood.sh` copies plugin rules into `.cursor/rules/` so rule dogfood does not require a marketplace install.
6. `scripts/build-agent-plugin.ts` regenerates the committed portable Agent Plugin artifact at `packages/cursor/agent-plugin/` (root `plugin.json` + `skills/` + Agent-Plugins-compliant `mcp.json`). The repo marketplace serves it at `plugins/kibi-agent-plugin` (symlink → `packages/cursor/agent-plugin`).
7. Reloading Cursor picks up the refreshed local artifacts.

## Linked Worktrees

When Cursor opens a git worktree as the workspace root:

- Project MCP only loads if that worktree has `.cursor/mcp.json` (commit/copy it, or open a worktree that already has it).
- The checked-in resolver prefers a valid worktree MCP build, then derives the primary checkout only from the linked worktree's absolute `git-common-dir`. It rejects missing artifacts, unavailable runtimes or SWI-Prolog, and package-version mismatches.
- The selected build directory is the MCP runtime working directory, while `KIBI_WORKSPACE` remains the opened worktree so Kibi data never moves to the primary checkout.
- Keep at least one version-compatible built primary checkout (`bun run build` on the main tree) so sparse worktrees can still start MCP. The resolver never installs packages or searches global/cache fallbacks.
- Marketplace/plugin MCP uses the packaged `bin/launch-kibi-mcp.mjs` adapter. It resolves `kibi-mcp` from the opened workspace's `node_modules`, runs it with that workspace as cwd, and sets `KIBI_WORKSPACE`; run `bun install` in the worktree before enabling it. The adapter never downloads or uses a global package. Disable the plugin MCP entry and keep project dogfood MCP when testing the monorepo resolver.
- After changing dogfood MCP or re-syncing the local plugin, reload Cursor (**Developer: Reload Window**).
- If both project and plugin `kibi` MCP servers appear, disable the duplicate plugin entry in Customize / MCP settings so dogfood uses `.cursor/mcp.json`.
- Root dogfood hooks pass `--trusted-workspace` as an explicit repository-local opt-in. Without that opt-in or an observed `kb_*` call, hooks emit setup guidance and never probe or execute the CLI.

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
- Run `bun run build` and `./scripts/sync-cursor-dogfood.sh` (on the worktree or primary checkout)
- Confirm `bun run packages/mcp/bin/kibi-mcp --diagnostic-mode` works from the resolved root
- For worktrees without a local build, confirm the primary checkout has `packages/mcp/dist`
- If the local plugin was hand-edited, re-run `./scripts/sync-cursor-plugin-local.sh` so it matches `packages/cursor/mcp.json` (do not point it at `.opencode/bin/kibi-mcp`)
- Reload Cursor

**Hooks do not fire:**
- Confirm `packages/cursor/dist/hook-runner.js` exists
- Check the Hooks output channel in Cursor
- Reload Cursor after `hooks.json` changes

**Plugin MCP reports that project-local `kibi-mcp` is missing:**
- The packaged launcher requires `kibi-mcp` in the opened workspace's `node_modules` and reports the exact workspace it checked.
- Install the project-local foundation with `npm install --save-dev kibi-cli kibi-mcp kibi-core` (or the equivalent command for your package manager), then reload Cursor.
- The plugin does not download packages at startup and does not use global or plugin-local runtimes.
- For dogfood you can disable the plugin MCP entry (`plugin-kibi-cursor-kibi`) and keep the workspace `.cursor/mcp.json` server, which runs the local `packages/mcp/bin/kibi-mcp` build instead.

**Published plugin got loaded instead of local artifacts:**
- Prefer repo dogfood via `.cursor/mcp.json` and `.cursor/hooks.json`
- Disable duplicate `kibi` MCP entries in Settings if both project and plugin MCP are present

**Symlinked local plugin rejected:**
- Cursor logs: `loadUserLocalPlugin kibi-cursor rejected: symlink target ... is outside .../plugins/local`
- Use `./scripts/sync-cursor-plugin-local.sh` (copy) instead of `ln -s`
