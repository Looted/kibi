# Kibi OpenCode Dogfood Setup

This repository dogfoods local built `kibi-mcp` and `kibi-opencode` artifacts instead of consuming the published npm packages in its own OpenCode workflow.

## Local Wiring

The repo-root setup relies on these files:

1. `opencode.json` starts the local MCP server through a `git rev-parse --show-toplevel` wrapper so it still resolves the repo root when OpenCode is launched from a subdirectory like `packages/opencode`.
2. `opencode.json` keeps `"plugin": []`, so OpenCode does not auto-install the published `kibi-opencode` package.
3. `.opencode/plugins/kibi.ts` re-exports `../../packages/opencode/dist/index.js`.
4. `.opencode/tui.json` loads `.opencode/plugins/kibi.tui.ts`, which re-exports `../../packages/opencode/dist/tui.js`.
5. `packages/mcp/dist/` and `packages/opencode/dist/` must exist locally because OpenCode uses those built outputs.

Agent-visible Kibi operations are not owned exclusively by this MCP dogfood wiring. MCP tools and the trusted project-local CLI's `--input` JSON routes are peer surfaces over the same operation catalog; this setup exercises MCP transport and plugin behavior specifically.

## Initial Setup

```bash
bun install
bun run build
```

## Rebuild Rule

Because this repo uses local build artifacts, rerun the full build whenever you:

- change a version in `package.json` for any Kibi package
- change local package wiring between `packages/core`, `packages/cli`, `packages/mcp`, and `packages/opencode`
- change code in `packages/mcp/src/`
- need refreshed build output before testing the repo's OpenCode dogfood flow

Use:

```bash
bun run build
```

If you are only iterating on `packages/opencode/src/`, you can keep the plugin build hot with:

```bash
bun run dev:opencode
```

That watch mode updates `packages/opencode/dist/`, but version bumps and cross-package changes still require `bun run build`.

## How It Works

1. You edit code in `packages/mcp/src/` or `packages/opencode/src/`.
2. The build writes compiled output into `packages/mcp/dist/` and `packages/opencode/dist/`.
3. OpenCode resolves the repo root with `git rev-parse --show-toplevel` and then starts `packages/mcp/bin/kibi-mcp` from that absolute path.
4. OpenCode auto-loads `.opencode/plugins/kibi.ts`, which re-exports the local `packages/opencode/dist/index.js` build.
5. The repo-local TUI dogfood path also loads `.opencode/tui.json`, which points at `.opencode/plugins/kibi.tui.ts` and re-exports the local `packages/opencode/dist/tui.js` build.
6. Restarting OpenCode picks up the refreshed local artifacts.

## Verification

Check the dogfood wiring after rebuilds:

```bash
cat opencode.json
cat .opencode/plugins/kibi.ts
ls packages/mcp/dist
ls packages/opencode/dist
```

## Common Issues

**Published plugin got loaded instead of the local one:**
- Ensure `opencode.json` keeps `"plugin": []`
- Ensure `.opencode/plugins/kibi.ts` still points at `../../packages/opencode/dist/index.js`

**Changes are not reflected in OpenCode:**
- Run `bun run build`
- If you are iterating only on the plugin, confirm `bun run dev:opencode` is still running
- Restart OpenCode after the rebuild

## Testing

Run the relevant plugin tests:

```bash
bun test packages/opencode/tests
```

### Built-artifact verification

Verify the compiled `dist/` artifact reflects the repaired toast contract:

```bash
node --test documentation/tests/e2e/opencode-plugin-local.test.ts
```

## Publishing

When preparing a release for `kibi-opencode`:

1. Update version metadata as needed
2. Run `bun run build`
3. Test the local dogfood setup against the rebuilt artifacts
4. Create a changeset with `bun run changeset`
5. Follow the release workflow in the main README
