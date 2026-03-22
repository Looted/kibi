# GitHub Copilot Instructions

This repository uses **Kibi** - a repo-local, per-branch, queryable long-term memory for software projects. Kibi stores requirements, BDD scenarios, tests, architecture decisions (ADRs), feature flags, events, code symbols, and facts with typed relationships between them. The CLI is for humans/operators, while agents should use the MCP server.

Please follow the comprehensive guidelines and rules defined in [AGENTS.md](../AGENTS.md).

---

## Tech Stack

- **Primary Runtime**: Bun v1.3.6 (package manager and runtime)
- **Compatibility**: Node.js v24 (required for npm publishing)
- **Backend Engine**: SWI-Prolog 9.0+ (Prolog KB engine)
- **Monorepo**: Bun workspaces in `packages/*`

---

## Quick Start

```bash
# Install dependencies (must run in both locations)
bun install
cd .opencode && bun install && cd ..

# Build all packages
bun run build

# Run full test suite
bun run test
```

---

## Package Structure

```
packages/
├── core/          # Prolog KB core (kb.pl, schema/*.pl)
├── cli/           # Node.js CLI (commands, extractors, Prolog wrapper)
├── mcp/           # MCP server (stdio, JSON-RPC)
├── opencode/      # OpenCode plugin
└── vscode/        # VS Code extension
```

---

## Common Commands

### Installation
```bash
bun install                    # Root dependencies
cd .opencode && bun install    # OpenCode dependencies
```

### Building
```bash
bun run build:cli             # Build CLI only
bun run build:mcp             # Build MCP server only
bun run build:opencode        # Build OpenCode plugin only
bun run build                 # Build all packages
```

### Testing
```bash
bun run test:unit                      # Unit tests only
bun run test                           # Full test suite (unit + e2e)
bash ./scripts/run-integration-tests.sh # Integration tests
```

### Prolog Tests
```bash
swipl -g "load_test_files([]),run_tests" -t halt packages/core/tests/kb.plt
```

### Linting & Formatting
```bash
bun run check      # Biome lint
bun run format     # Biome format --write
```

---

## Important Constraints & Gotchas

1. **Dual Installation**: Always run `bun install` in both root AND `.opencode/` directories
2. **SWI-Prolog Required**: Must be installed before running any `kibi` commands
3. **CI Environments**: Use `--frozen-lockfile` flag for `bun install`
4. **Staged Symbol Traceability**: Add `// implements REQ-xxx` comments to new functions/classes to maintain traceability
5. **Conventional Commits**: Follow `feat(scope):`, `fix(scope):`, `docs(scope):`, `test(scope):`, `chore(scope):` format
6. **Release Metadata**: Changes to npm packages must include changesets (do not publish directly)

---

## Key Files

- **[AGENTS.md](../AGENTS.md)** - Main contributor guidelines and agent workflows
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - Development setup instructions
- **[package.json](../package.json)** - Root scripts and workspace configuration
- **[.github/workflows/ci.yml](./workflows/ci.yml)** - CI pipeline configuration
- **[.github/workflows/publish.yml](./workflows/publish.yml)** - Publishing pipeline configuration

---

## Kibi-First Workflow

When working on this codebase:

1. **Query Kibi first** - Use MCP tools (`kb_query`) before grepping the project
2. **Document intent** - Route explanations to KB entities via `kb_upsert`, not inline comments
3. **Link during work** - Create relationships: `implements` (symbol→req), `covered_by` (symbol→test), `verified_by` (req→test)
4. **Validate** - Run `kb_check` after KB mutations to catch violations
5. **Use `/init-kibi`** - For initial repository setup, use the `/init-kibi` slash command in OpenCode
6. **Escalate setup issues** - If the KB needs setup or repair beyond `/init-kibi`, ask the user/operator to handle it

For detailed guidelines on entity types, relationships, and best practices, see [AGENTS.md](../AGENTS.md).
