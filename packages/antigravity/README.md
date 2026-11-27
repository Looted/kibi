# kibi-antigravity

Antigravity plugin for [Kibi](https://looted.github.io/kibi/) — progressive-disclosure requirement snippets, firm-requirement edit confirmation, decision capture, signoff reminders, always-on workflow rules, bundled Kibi skills, and the workspace-gated Kibi MCP server.

The plugin is optional. It builds on project-local `kibi-core`, `kibi-cli`, and `kibi-mcp` and does not install, replace, or modify them. In workspaces without `.kb/manifest.json`, hooks pass tool calls through silently and the MCP server exposes zero tools.

## Install

### Workspace plugin (recommended for repository teams & dogfooding)

Register the plugin in `.agents/plugins.json`:

```json
{
  "entries": [
    {
      "path": "packages",
      "include_only": ["antigravity"]
    }
  ]
}
```

### User-global install

Install globally from GitHub with the Antigravity CLI (use `tree/develop/packages/antigravity` instead of `tree/master/packages/antigravity` if installing before the plugin is released on `master`):

```bash
agy plugin install https://github.com/Looted/kibi/tree/master/packages/antigravity
```

Or copy the built plugin directory from a local Kibi checkout into `~/.gemini/config/plugins/kibi` (`kibi-antigravity` is installed from git rather than published to npm; exclude `node_modules` so workspace symlinks are not copied):

```bash
mkdir -p ~/.gemini/config/plugins
rsync -a --delete --exclude node_modules ./packages/antigravity/ ~/.gemini/config/plugins/kibi/
```

No `node_modules` are needed in the copied plugin directory: `bin/hook-runner.mjs` is a self-contained bundle with `kibi-agent-core` inlined, `bin/mcp-launcher.cjs` uses only Node built-ins (and automatically discovers the opened Kibi workspace via MCP `roots/list` when installed globally), `bin/run-node.cmd` is a cross-platform POSIX/Windows hook launcher, and `bin/run-node.sh` lets hooks find Node even when Antigravity's Language Server launches with a minimal non-login `PATH` (for example under `nvm`, `volta`, `fnm`, `mise`, or `asdf`).

When validating or installing from a local Kibi monorepo checkout, exclude `node_modules` first (`agy plugin install` rejects workspace symlinks pointing outside the plugin directory):

macOS / Linux:

```bash
agy plugin validate --strict ./packages/antigravity
rsync -a --delete --exclude node_modules ./packages/antigravity/ /tmp/kibi-antigravity/
agy plugin install /tmp/kibi-antigravity
rm -rf /tmp/kibi-antigravity
```

Windows (PowerShell):

```powershell
agy plugin validate --strict .\packages\antigravity
$tmp = Join-Path $env:TEMP kibi-antigravity
Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $tmp | Out-Null
Get-ChildItem .\packages\antigravity -Exclude node_modules | Copy-Item -Destination $tmp -Recurse
agy plugin install $tmp
Remove-Item -Recurse -Force $tmp
```

## What the agent gets

| Lifecycle Event | Behavior |
| --- | --- |
| `SessionStart` | Injects the shared Kibi session brief (`kibi-agent-core/session-brief`), linked source file count, MCP/CLI surface summary, and a note when Kibi git hooks are missing. |
| `PreInvocation` | Evaluates each new `lastUserInput` once per prompt hash for stated rules (`"must"`, `"never"`, `"from now on"` -> `kb_upsert` note) and drains any Kibi knowledge snippets queued by tool hooks into `injectSteps`. |
| `PreToolUse` | Stamps `workspaceRoot` via `overwrite` on Kibi MCP (`*kb_*`) calls. Queues progressive-disclosure read/edit snippets (requirements, what the lead requirement must keep true, ADR decision, covering tests, `kb_check` call) for linked source/test files and unowned-source notes for unlinked source files. Returns `decision: "force_ask"` with the requirement title and symbol before edits that change code implementing a current `firm` requirement (`KIBI_CONFIRM_FIRM_EDITS=0` disables this) or guarded changes to the Kibi level / `required_evidence`. All other tool calls (including outside Kibi workspaces) pass through with `decision: "allow"`, delegating to Antigravity's default policy without ever returning `"auto_approve"`. |
| `PostToolUse` | Records successful edits (confirming firm edits only when `error` is absent), shell file modifications, CLI/MCP `kb_*` usage, verified `git commit` checks, opt-in `.kb/usage.log` diagnostic rows (`KIBI_DIAGNOSTIC_MODE=1`, `host: "antigravity"`), and rule-capture templates. |
| `Stop` | On `NO_TOOL_CALL` when `continuationActive` is `false`, returns `decision: "continue"` once to remind the agent about unchecked edited source files (`kb_check`), unrecorded decisions (`kb_upsert`), or pending requirements signoff (`kibi signoff`). |

## Layout

- `plugin.json`: Antigravity plugin manifest (`name: "kibi"`).
- `mcp_config.json`: workspace-gated stdio `kibi` MCP server, `node bin/mcp-launcher.cjs` (like the other Kibi plugins, it needs `node` on the `PATH` Antigravity starts with, on Linux, macOS and Windows).
- `hooks.json`: Antigravity lifecycle hooks (`SessionStart`, `PreInvocation`, `PreToolUse`, `PostToolUse`, `Stop`) placed at the plugin root.
- `rules/AGENTS.md`: always-on Kibi workflow guidance (plain Markdown, no frontmatter).
- `skills/`: generated mirror of the canonical Kibi skills (`scripts/sync-agent-skills.ts --target antigravity`).
- `bin/hook-runner.mjs`: committed self-contained bundle of `src/hook-runner.ts` (`bun run build:hook-bundle`).
- `bin/run-node.sh`: POSIX shell Node resolver for minimal non-login `PATH` environments.

## Development

```bash
bun run build:antigravity
bun test ./packages/antigravity/tests
bun run typecheck:antigravity
bun run typecheck:antigravity:tests
```

## License

AGPL-3.0-or-later
