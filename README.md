![Kibi Wordmark](assets/wordmark.svg)

Kibi is a repo-local, per-git-branch, queryable knowledge base for software projects. It stores requirements, scenarios, tests, architecture decisions, and more as linked entities, ensuring end-to-end traceability between code and documentation.


## Why Kibi

Kibi is designed to boost AI agents' memory during software development. It maintains a living, verifiable project memory that:

- **Tracks context across branches** — Every git branch gets its own KB snapshot, preserving context as you switch between features
- **Enforces traceability** — Links code symbols to requirements, preventing orphan features and technical debt
- **Validates automatically** — Rules catch missing requirements, dangling references, and consistency issues
- **Agent-friendly** — LLM assistants can query and update knowledge base via MCP without risking file corruption

## Key Components

- **kibi-core** — Prolog-based knowledge graph that tracks entities across branches
- **kibi-cli** — Command-line interface for automation and hooks
- **kibi-mcp** — Model Context Protocol server for LLM integration
- **kibi-vscode** — VS Code extension for exploring the knowledge base

## Prerequisites

- **SWI-Prolog 9.0+** — Kibi's knowledge graph runs on Prolog




## Installation

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

# Run integrity checks
kibi check
```

> **Note:** `kibi init` installs git hooks by default. Hooks automatically sync your KB on branch checkout and merge.

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

---

⚠️ **Alpha Status:** Kibi is in early alpha. Expect breaking changes. Pin exact versions of `kibi-cli` and `kibi-mcp` in your projects, and expect to occasionally delete and rebuild your `.kb` folder when upgrading.
