# kibi-claude

Claude Code plugin for Kibi. It shows the agent the project's recorded intent
(requirements, their tests, and the symbols that implement them) at the moment
it reads or edits code. It also reminds the agent, once, to keep the knowledge
base current before it finishes.

The plugin is optional. It builds on the project-local `kibi-core`,
`kibi-cli`, and `kibi-mcp` packages and does not install, replace, or modify
them. In workspaces that have no Kibi (no `.kb/manifest.json` at the project
root), every hook stays silent and the MCP server exposes no tools.

## Install

The repository root is a Claude Code marketplace (`.claude-plugin/marketplace.json`).

```bash
claude plugin marketplace add Looted/kibi
```

```bash
claude plugin install kibi-claude@kibi
```

Or use `/plugin` inside Claude Code. The hooks need Node.js 18+ on `PATH`.
The KB tools need Node.js 22+ and project-local `kibi-cli`, `kibi-mcp`, and
`kibi-core`. SWI-Prolog comes bundled with them on Linux (x64, arm64) and
macOS; only other platforms need SWI-Prolog 9+ on `PATH` (see the
[installation guide](https://looted.github.io/kibi/guide/install.html)).

The hook runner is committed as a single self-contained file
(`bin/hook-runner.mjs`), so installs from GitHub work without a build step.

## What the agent sees

All output is advisory `additionalContext`. Nothing is ever blocked, no tool
input is rewritten, and no workspace file is written. Every snippet is the
first layer of progressive disclosure: requirement IDs and titles, the linked
symbols, and the exact call that opens the next layer. Snippets are capped at
1,200 characters and phrased as project facts.

| When | What | How often |
| --- | --- | --- |
| Session start | One paragraph: Kibi is active, how many files have requirement-linked symbols, which `kb_*` operations exist, and the `kibi-usage` skill | Each start, resume, clear, and compact |
| Before `Read` of a linked source or test file | Requirements with titles, the symbols that implement them, covering tests, and the next-layer calls (`kb_query` by id, intent-mode `kb_search` with `sourceLocations`). A read window (`offset`/`limit`) names the symbol it lands in | Once per file per session. Skipped if the agent already queried that file or all of its requirements through Kibi |
| Before `Edit`/`MultiEdit`/`Write`/`NotebookEdit` | First edit of an unseen file: the same snippet, plus the symbol the edit lands in (found from `old_string` and the symbol coordinates) and the `kb_check` impact call. File already shown: one line, and only when the edit lands in a symbol not yet named | Once per file, then once per new symbol |
| Before editing an unowned source file | One note: the intent-mode `kb_search` call that finds requirements which may already describe this behavior | Once per file |
| Before the first `Grep`/`Glob` | One tip that intent questions are answered by `kb_search` | Once per session, and never after the agent has used Kibi |
| Direct `.kb/` reads or edits | One note that `kb_query`/`kb_upsert` keep the store consistent | Once per session |
| `Stop` | Source files edited without a later impact check, with the exact `kb_check` call, or a no-impact rationale | Once per file. Respects `stop_hook_active`; a later edit makes the file pending again |

Unlinked source files, docs, config, and generated or vendored paths get no
snippet on read.

A check acknowledges pending edits when it names the files in `sourceFiles` or
covers the working tree (`includeWorkingTreeDiff: true`). A project-local CLI
`kibi check` run through Bash also counts, and so does a successful `git
commit` in a repository whose pre-commit hook runs Kibi's staged check,
because that commit passed the gate. `--no-verify` commits don't count. KB
usage is recognized under any MCP host prefix (for example
`mcp__plugin_kibi-claude_kibi__kb_check`) and through the CLI (`npx
--no-install kibi search --input -`).

## Performance

Hooks never call the Kibi CLI or engine. A KB round trip costs seconds, which
is too slow to run before every read. Instead, the runner line-scans
`.kb/symbols.yaml` and `.kb/symbol-coordinates.yaml` into a file-keyed index.
It caches that index in `${CLAUDE_PLUGIN_DATA}` and rebuilds it only when
either manifest's size or mtime changes. Requirement titles come from the
frontmatter of `.kb/requirements/<ID>.md`, with at most four small reads per
snippet.

On the Kibi repository itself (3,680 symbols, 1.4 MB manifest), the one-time
index build takes about 85 ms. Later hook processes take 40–60 ms each,
including Node startup.

Session memory is an append-only journal per workspace and session, so hooks
for parallel tool calls never lose each other's events.

## Usage telemetry (opt-in)

The plugin records nothing by default. To capture usage for diagnosis, set
`KIBI_DIAGNOSTIC_MODE=1` in the environment Claude Code inherits — for example
in the `env` block of `~/.claude/settings.json`. The MCP server, the CLI JSON
routes, and these hooks all honor that one variable.

When opted in, the hooks append rows tagged `interface: "hook"` to the
workspace's `.kb/usage.log`. A row notes which source, test, or `.kb/` file the
agent read or edited, whether a requirement snippet was shown or suppressed,
and whether the session had used Kibi yet, keyed by the Claude Code session
id. That is what shows whether agents look things up before they edit or only
afterwards. Remove the variable to stop recording.

## Layout

- `.claude-plugin/plugin.json`: plugin manifest.
- `.mcp.json`: the `kibi` MCP server, started through `bin/mcp-launcher.cjs`.
  The launcher resolves the workspace from `CLAUDE_PROJECT_DIR`, is silent
  outside Kibi workspaces, and proxies the project-local `kibi-mcp`. The
  `PreToolUse` hook adds `workspaceRoot` (the session's current workspace) to
  every Kibi MCP call, so a session that moves into a git worktree, as Claude
  Code desktop sessions do, is answered from that worktree's branch rather
  than the checkout the server started in. Set `KIBI_WORKSPACE` to pin one
  workspace instead.
- `hooks/hooks.json`: `SessionStart`, `PreToolUse` (read, edit, and search
  tools), `PostToolUse` (edit tools, Bash, and `kb_*` MCP tools), and `Stop`.
- `bin/hook-runner.mjs`: generated bundle of `src/hook-runner.ts`
  (`bun run build:hook-bundle`). It is committed, and a test checks it for
  drift.
- `skills/`: generated mirror of the canonical Kibi skills
  (`scripts/sync-agent-skills.ts --target claude`). `name` is the skill id,
  so the skills are invoked as `/kibi-claude:kibi-usage`,
  `/kibi-claude:kibi-bootstrap`, and so on.

## Development

```bash
bun run build:claude
```

```bash
bun test ./packages/claude
```

```bash
claude plugin validate packages/claude
```

This repository dogfoods the working-tree plugin automatically: see
[DEV.md](DEV.md) for the setup, and for testing the packaged plugin with
`claude --plugin-dir packages/claude`.

## Manual MCP fallback

Use this only when the plugin is not installed. It invokes the
project-local `kibi-mcp` directly and adds no hooks:

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
