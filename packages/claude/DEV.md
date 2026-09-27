# kibi-claude development and dogfooding

## Dogfood in this repository

Opening Claude Code in this repository (or any of its worktrees) runs the
working-tree version of the plugin. No install is needed, and nothing changes
for anyone outside this repository.

| Piece | Where it comes from |
| --- | --- |
| Hooks | `.claude/settings.json` runs `$CLAUDE_PROJECT_DIR/packages/claude/bin/hook-runner.mjs`, the committed bundle of the checkout you opened |
| MCP server | Root `.mcp.json` starts the workspace `kibi-mcp` through `packages/cursor/scripts/worktree-resolver.sh`, the same resolver the Cursor dogfood uses. A worktree without a local build falls back to the primary checkout's build, or builds one |
| Skills | Served through the MCP skill tools (`kb_skills_list`, `kb_skills_load`) |
| Released plugin | `.claude/settings.json` sets `"kibi-claude@kibi": false`, so a user-level install from the marketplace never runs alongside the dogfood hooks |

First session in a fresh clone:

1. Accept the workspace trust dialog. Project hooks and `.mcp.json` load only
   in trusted folders.
2. Approve the `kibi` server from `.mcp.json` when Claude Code asks, or later
   with `/mcp`.
3. Optional: `bun run sync:claude-dogfood` builds the CLI, runtime, MCP, and
   plugin. Hooks work without it because the bundle is committed.

After changing `packages/claude/src/`, rebuild the bundle so the next hook
invocation picks it up. No session restart is needed:

```bash
bun run --filter ./packages/claude build:hook-bundle
```

`tests/distribution.test.ts` fails when the committed bundle is stale, or when
the dogfood hook events and matchers drift from `hooks/hooks.json`.

To see exactly what a hook injects, feed it a payload by hand:

```bash
printf '%s\n' '{"hook_event_name":"PreToolUse","session_id":"manual","cwd":"'"$PWD"'","tool_name":"Read","tool_input":{"file_path":"packages/cli/src/engine.ts"}}' | node packages/claude/bin/hook-runner.mjs
```

The dogfood hooks run outside the plugin, so `CLAUDE_PLUGIN_DATA` is unset.
Session memory and the index cache then live in
`$TMPDIR/kibi-claude-<uid>/`. Delete that directory to reset what the hooks
consider already shown.

To opt out on your machine, override the hooks in
`.claude/settings.local.json` (gitignored). For example, set
`"disableAllHooks": true`, or set `"kibi-claude@kibi": true` in
`enabledPlugins` to run the released plugin instead.

## Test the packaged plugin

Dogfood exercises the hook code, but not the plugin packaging. To load the
plugin exactly as consumers get it (manifest, `.mcp.json` launcher, skills
namespaced as `/kibi-claude:*`), start a session with the plugin directory.
Do this from a Kibi workspace other than this repository, or in this one after
setting `"disableAllHooks": true` in `.claude/settings.local.json` so the
dogfood hooks don't also run:

```bash
claude --plugin-dir packages/claude
```

```bash
claude plugin validate packages/claude
```

## External consumers

Consumers get nothing by default. They opt in by adding the marketplace and
installing the plugin (`claude plugin install kibi-claude@kibi`). The dogfood
configuration lives in this repository's `.claude/settings.json` and
`.mcp.json`, which Claude Code reads only for sessions opened inside this
repository.
