# kibi-claude

## 0.2.1

### Patch Changes

- db5376c: Projects can now opt into impact reviews that bind a change to its exact source, knowledge decisions and trusted analysis policy. Kibi validates both staged changes and a complete pull-request diff, rejects stale review evidence, and lets agents prepare an unauthored review template through the CLI or MCP instead of hand-assembling one. Every decision and reviewer field stays for an agent to write; preparation never approves or proves anything.
  - Add versioned impact policy and review schemas, immutable review fingerprints, reviewed Python decorator coordinate migration and the trusted aggregate `check-diff` command.
  - Add the read-only `prepare-impact-review --input` CLI route and `kb_prepare_impact_review` MCP operation; regenerate the bundled operation-access catalog for the agent integrations.
  - Keep the sample CI workflow inactive until it is adopted on a protected target.

- 3d78159: Setting up Kibi no longer starts with installing SWI-Prolog. The documentation now says that Linux (x64 and arm64, glibc 2.28 or newer) and macOS (Apple silicon and Intel) need nothing beyond Node.js 22, explains the lookup order and the `KIBI_SWIPL` and `KIBI_SWIPL=system` overrides, and shows how `kibi doctor` reports which SWI-Prolog is in use and what to do when an install skipped the bundled runtime (`--omit=optional`, pnpm `supportedArchitectures`). Manual instructions stay for Alpine and native Windows. The GitHub Pages report workflows that `kibi init` can write no longer install SWI-Prolog by hand, because `npm ci` brings the bundled runtime with it.
  - kibi-cli: drop the `apt-get install swi-prolog` step from the shipped `kibi-report.yml` and `kibi-badge.yml` workflow templates.
  - kibi-cursor, kibi-claude: README and plugin manifest prerequisites say SWI-Prolog is bundled on supported platforms and only needed on `PATH` elsewhere.
  - Kibi's own CI and proof now run the pipeline-built bundled SWI-Prolog (one job keeps a system install with `KIBI_SWIPL=system`), and the release dry run follows the README quick start with the packed tarballs on four platforms; neither ships in a package.

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
