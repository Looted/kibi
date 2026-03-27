![Kibi Wordmark](assets/wordmark.svg)

[![CI](https://github.com/Looted/kibi/actions/workflows/ci.yml/badge.svg)](https://github.com/Looted/kibi/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/Looted/kibi/branch/develop/graph/badge.svg)](https://codecov.io/gh/Looted/kibi)

Kibi is a repo-local, per-git-branch, queryable knowledge base for software projects. It stores requirements, scenarios, tests, architecture decisions, and more as linked entities, ensuring end-to-end traceability between code and documentation.


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

For OpenCode users, bootstrap an existing repo with `/init-kibi`.


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

Kibi supports two common setups:

- **Global install** for normal use across repositories
- **Repo-local dogfood workflow** in this repository, where OpenCode and MCP use locally built artifacts

```bash
# Using npm (recommended)
npm install -g kibi-cli kibi-mcp

# Using bun
bun add -g kibi-cli kibi-mcp
```

After installation, verify that kibi is available:

```bash
kibi --version
```

### OpenCode Plugin

Add `kibi-opencode` to your project `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["kibi-opencode"]
}
```

OpenCode installs npm plugins declared in `plugin` automatically at startup.

### VS Code Extension

The Kibi VS Code extension provides a TreeView explorer for your knowledge base and built-in MCP integration.

Download the latest `.vsix` from [GitHub Releases](https://github.com/Looted/kibi/releases), then install it:

- **Command Palette**: `Ctrl+Shift+P` → `Extensions: Install from VSIX...` → select the file
- **CLI**: `code --install-extension kibi-vscode-x.x.x.vsix`

Every GitHub release includes the latest VS Code extension build as a `.vsix` artifact.

### Repo-local dogfood workflow (this repo)

This repository uses local built `kibi-mcp` and `kibi-opencode` artifacts during development. If you change package versions or local package wiring used by the OpenCode setup here, rebuild before testing:

```bash
bun run build
```

### VS Code MCP

Create `.vscode/mcp.json`:

```json
{
  "servers": {
    "kibi": {
      "type": "stdio",
      "command": "kibi-mcp"
    }
  }
}
```

If `kibi-mcp` is not on your `PATH`, replace `command` with the full executable path.

For complete installation steps and SWI-Prolog setup, see [detailed installation guide](docs/install.md).

## Quick Start

Initialize kibi in your repository:

```bash
# Verify environment prerequisites
kibi doctor

# Initialize .kb/ and install git hooks
kibi init

# Parse markdown docs and symbols into branch KB
kibi sync

# Discover relevant knowledge before exact lookups
kibi search auth

# Inspect current branch snapshot and freshness
kibi status

# Run integrity checks
kibi check
```

> **Note:** `kibi init` installs git hooks by default. Hooks automatically sync your KB on branch checkout and merge.

### Typical discovery workflow

```bash
# Explore the KB first
kibi search login

# Then follow up with exact/source-linked queries
kibi query req --source src/auth/login.ts --format table

# Check branch attachment and freshness when needed
kibi status

# Ask focused reporting questions
kibi gaps req --missing-rel specified_by,verified_by --format table
kibi coverage --by req --format table
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

All publishable npm packages in this repo (`kibi-core`, `kibi-cli`, `kibi-mcp`, `kibi-opencode`) follow the same Changesets workflow for versioning and changelog generation.

```bash
# Add release metadata for changed package(s)
bun run changeset

# Preview pending releases
bunx changeset status

# Apply version bumps and update package changelogs
bun run version-packages
```

---

⚠️ **Alpha Status:** Kibi is in early alpha. Expect breaking changes. Pin exact versions of `kibi-cli`, `kibi-mcp`, and `kibi-opencode` in your projects, and expect to occasionally delete and rebuild your `.kb` folder when upgrading.
