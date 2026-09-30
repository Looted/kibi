# kibi-claude

## 0.2.0

### Minor Changes

- 35cd120: Kibi now ships a Claude Code plugin. When an agent reads or edits code that
  the knowledge base links to requirements, it sees a short note first. The
  note lists which requirements that code implements, which tests cover it, and
  which symbol the edit lands in, plus the exact Kibi call for the full detail.
  Before the agent finishes, it gets one reminder to run an impact check on
  source files it changed. The plugin says nothing in projects without Kibi,
  repeats nothing within a session, and goes quiet once the agent is already
  using Kibi. It installs straight from GitHub through the repository
  marketplace.

  - New `packages/claude` plugin (`kibi-claude`): `.claude-plugin/plugin.json`,
    `.mcp.json` with a `CLAUDE_PROJECT_DIR`-aware workspace-gated launcher,
    `hooks/hooks.json` (`SessionStart`, `PreToolUse`, `PostToolUse`, `Stop`),
    a committed self-contained hook bundle (`bin/hook-runner.mjs`, drift-tested),
    and a skills mirror whose `name` is the skill id so plugin slash commands
    stay usable.
  - Hooks never call the CLI: a line scanner indexes `.kb/symbols.yaml` and
    `.kb/symbol-coordinates.yaml` (equivalent to a full YAML parse, about 20x
    faster) and caches it in `CLAUDE_PLUGIN_DATA`, keyed by manifest size and
    mtime.
  - Session memory is an append-only journal, so concurrent hooks for parallel
    tool calls do not lose events. The Stop reminder uses non-error
    `additionalContext`, fires once per file, and respects `stop_hook_active`.
  - Root `.claude-plugin/marketplace.json` gains the required `owner` field
    (Claude Code rejected the file without it) and lists `kibi-claude`
    alongside `kibi-zcode`.
  - `scripts/sync-agent-skills.ts` gains a `claude` target.
