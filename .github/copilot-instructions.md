# GitHub Copilot Instructions

This repository is **Kibi**, an agent-native requirements compiler: a repo-local, per-branch knowledge base of requirements, scenarios, tests, ADRs, flags, events, symbols and facts, checked by Prolog.

All agent policy lives in [AGENTS.md](../AGENTS.md); follow it. Development setup is in [CONTRIBUTING.md](../CONTRIBUTING.md).

## Stack

- Bun 1.4 (package manager and runtime), Node.js 24 for npm publishing
- SWI-Prolog 9.0+ on `PATH` (or `KIBI_SWIPL`) in a source checkout; published packages bundle it
- Bun workspaces under `packages/*`; the core engine is `packages/core`, the CLI `packages/cli`, the MCP server `packages/mcp`, and agent-host integrations `packages/{claude,codex,cursor,opencode,zcode,vscode}`

## Commands

```bash
bun install            # use --frozen-lockfile in CI
bun run build          # build all packages
bun run test:unit      # unit tests
bun run test           # unit + local e2e
bun run check          # Biome lint
bun run format         # Biome format --write
swipl -g "load_test_files([]),run_tests" -t halt packages/core/tests/kb.plt
```

## Reminders

- Query Kibi (`kb_search`, then `kb_query`) before grepping, never edit `.kb/` directly, and run `kb_check` after KB mutations.
- Conventional Commits; changes to npm packages need a changeset.
- Meaningful user-facing changes update `README.md` and the docs-site landing page in the same PR.
