![Kibi Wordmark](assets/wordmark.svg)

[![CI](https://github.com/Looted/kibi/actions/workflows/ci.yml/badge.svg)](https://github.com/Looted/kibi/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/Looted/kibi/branch/develop/graph/badge.svg)](https://codecov.io/gh/Looted/kibi)

Kibi is a repo-local, per-git-branch, queryable knowledge base for software projects. It stores requirements, scenarios, tests, architecture decisions, and more as linked entities, ensuring end-to-end traceability between code and documentation.

## Entity Taxonomy

Kibi intentionally supports **eight core entity types**, organized into two logical groups:

### Common Authoring Entities
- **req** — Software requirements specifying functionality or constraints.
- **scenario** — BDD scenarios describing user behavior (Given/When/Then).
- **test** — Executable unit, integration, or e2e test cases.
- **fact** — Atomic domain facts and invariants. Supports a **strict lane** for contradiction-sensitive modeling and a **context lane** (`observation`, `meta`) for bugs and workarounds.

### Supporting & System Entities
- **adr** — Architecture Decision Records documenting technical choices.
- **flag** — Runtime or config gates (feature flags, kill-switches).
- **event** — Domain or system events published/consumed by components.
- **symbol** — Abstract code symbols (functions, classes, modules).


## Why Kibi

Kibi is designed to boost AI agents' memory during software development. It maintains a living, verifiable project memory that:

- **Tracks context across branches** — Every git branch gets its own KB snapshot, preserving context as you switch between features
- **Enforces traceability** — Links code symbols to requirements, preventing orphan features and technical debt
- **Validates automatically** — Rules catch missing requirements, dangling references, and consistency issues
- **Agent-friendly** — LLM assistants can query and update knowledge base via MCP without risking file corruption

### What You Get

Kibi provides concrete, day-to-day benefits for developers and teams:

- **Requirements Traceability** — Track every code symbol back to its requirement. Know why code exists and what business need it addresses.

- **Test Coverage Visibility** — See which requirements have tests, which don't, and what's covered at a glance. Ensure nothing slips through the cracks.

- **Architectural Constraints** — Link code to ADRs. Know what constraints apply to each symbol and verify architecture decisions are honored.

- **Feature Flag Blast Radius** — See what code depends on a runtime/config gate before toggling it. Understand the impact of enabling or disabling a feature.

- **Event-Driven Architecture** — Map who publishes and consumes each domain event. Trace event flows and identify couplings across the system.

- **Branch-Local Memory** — Every git branch keeps its own KB snapshot. Switch contexts without losing traceability or polluting other branches.

For OpenCode users, bootstrap an existing repo with \`/init-kibi\` (\`kb_autopilot_generate\`).


> **Entity Modeling Note:** Use `flag` for runtime/config gates only. Document bugs and workarounds as `fact` entities with `fact_kind: observation` or `meta`. See [Entity Schema](docs/entity-schema.md) and [AGENTS.md](AGENTS.md) for the canonical guidance.

## Key Components

- **kibi-core** — Prolog-based knowledge graph that tracks entities across branches
- **kibi-cli** — Command-line interface for automation and hooks
- **kibi-mcp** — Model Context Protocol server for LLM integration
- **kibi-opencode** — OpenCode plugin that injects Kibi guidance and runs background syncs
- **kibi-vscode** — VS Code extension for exploring the knowledge base

## Prerequisites

- **SWI-Prolog 9.0+** — Kibi's knowledge graph runs on Prolog




## Installation

Kibi is designed to run from your project, so each MCP client starts the same local `kibi-mcp` binary for that workspace.

Install the CLI and MCP server as development dependencies:

```bash
npm install --save-dev kibi-cli kibi-mcp
```

Prefer npm unless your project already uses another package manager. Equivalent installs are:

```bash
pnpm add -D kibi-cli kibi-mcp
yarn add -D kibi-cli kibi-mcp
bun add -d kibi-cli kibi-mcp
```

The recommended MCP command is:

```bash
npx --no-install kibi-mcp
```

`--no-install` makes the MCP client use the version already installed in your project instead of downloading a package at startup. Run the client from the project root, or configure the client to use that workspace as its current working directory.

For detailed setup, global install alternatives, and troubleshooting, see [the installation guide](docs/install.md).

### MCP client examples

<details>
<summary>OpenCode</summary>

Add Kibi to your `opencode.json`:

```json
{
  "mcp": {
    "kibi": {
      "type": "local",
      "enabled": true,
      "command": ["npx", "--no-install", "kibi-mcp"]
    }
  }
}
```

</details>

<details>
<summary>VS Code</summary>

Add Kibi to `.vscode/mcp.json`:

```json
{
  "servers": {
    "kibi": {
      "type": "stdio",
      "command": "npx",
      "args": ["--no-install", "kibi-mcp"]
    }
  }
}
```

</details>

<details>
<summary>Codex</summary>

Add Kibi to `~/.codex/config.toml` or `$CODEX_HOME/config.toml`:

```toml
[mcp_servers.kibi]
command = "npx"
args = ["--no-install", "kibi-mcp"]
enabled = true
```

Or add it with the Codex CLI:

```bash
codex mcp add kibi -- npx --no-install kibi-mcp
```

</details>

<details>
<summary>Generic MCP clients</summary>

Most stdio MCP clients need the same command and arguments:

```text
command: npx
args: --no-install kibi-mcp
transport: stdio
```

If your client supports a working-directory setting, point it at the project where `kibi-mcp` is installed.

</details>

If your project uses a different package manager, keep the same MCP shape and swap the command/args for your runner, for example `pnpm exec kibi-mcp`, `yarn kibi-mcp`, or `bun kibi-mcp`.

### Repo-local dogfood workflow (this repo)

For contributors to this repository only:

This repository uses local built `kibi-mcp` and `kibi-opencode` artifacts during development. If you change package versions or local package wiring used by the OpenCode setup here, rebuild before testing:

```bash
bun run build
```

## Quick Start

Initialize kibi in your repository:

```bash
# Verify environment prerequisites
npx kibi doctor

# Initialize .kb/ and install git hooks
npx kibi init

# Parse markdown docs and symbols into branch KB
npx kibi sync

# Discover relevant knowledge before exact lookups
npx kibi search auth

# Inspect current branch snapshot and freshness
npx kibi status

# Run integrity checks
npx kibi check
```

> **Note:** `kibi init` installs git hooks by default and writes `.kb/` + `.kb/briefs/` ignore entries to `.gitignore`. Hooks automatically sync your KB on branch checkout and merge.

### Typical discovery workflow

```bash
# Explore the KB first
npx kibi search login

# Then follow up with exact/source-linked queries
npx kibi query req --source src/auth/login.ts --format table

# Check branch attachment and freshness when needed
npx kibi status

# Ask focused reporting questions
npx kibi gaps req --missing-rel specified_by,verified_by --format table
npx kibi coverage --by req --format table
```

## Documentation

- **[Installation Guide](docs/install.md)** — Prerequisites, SWI-Prolog setup, and verification steps
- **[CLI Reference](docs/cli-reference.md)** — Complete command documentation with all flags and options
- **[Troubleshooting](docs/troubleshooting.md)** — Recovery procedures and common issues
- **[Entity Schema](docs/entity-schema.md)** — Entity types, relationships, and examples
- **[Architecture](docs/architecture.md)** — System architecture and component descriptions
- **[Inference Rules](docs/inference-rules.md)** — Validation rules and constraint logic
- **[MCP Reference](docs/mcp-reference.md)** — MCP server documentation
- **[LLM Prompts](docs/prompts/llm-rules.md)** — Ready-to-copy system prompts for agents
- **[AGENTS.md](AGENTS.md)** — Guidelines for AI agents working on kibi projects
- **[Contributing](CONTRIBUTING.md)** — Development setup and contributor workflow

## Release and Versioning

Kibi uses a two-branch release model with [Changesets](https://github.com/changesets/changesets). Work happens on `develop`, where version bumps are applied. The `master` branch is publish-only.

### Release Flow
1. **Development**: Create changesets on `develop` as you work.
2. **Versioning**: Run `bun run version-packages` on `develop` to apply bumps.
3. **Merge**: Merge `develop` into `master`.
4. **Publish**: `master` CI builds and publishes new versions to npm.

There is no `master → develop` back-merge.

```bash
# Add release metadata (run on develop)
bun run changeset

# Apply version bumps (run on develop)
bun run version-packages
```

---

⚠️ **Alpha Status:** Kibi is in early alpha. Expect breaking changes. Pin exact versions of `kibi-cli`, `kibi-mcp`, and `kibi-opencode` in your projects, and expect to occasionally delete and rebuild your `.kb` folder when upgrading.
