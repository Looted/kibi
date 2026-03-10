# Kibi (alpha)

Kibi is a repo-local, per-git-branch, queryable knowledge base for software projects. It is designed to be used by both developers (via CLI) and LLM agents (via MCP) to maintain a living, verifiable project memory.

Kibi stores eight typed entity kinds (requirements, scenarios, tests, ADRs, flags, events, symbols, and facts) plus typed relationships between them to ensure end-to-end traceability.

⚠️ **Alpha Status:** Kibi is in early alpha. Expect breaking changes. Pin exact versions of `kibi-cli` and `kibi-mcp` in your projects, and expect to occasionally delete and rebuild your `.kb` folder when upgrading.

## Strong Points

- **Branch-Aware Context:** Every git branch gets its own KB snapshot under `.kb/branches/<branch>`, tracking your code context accurately as you switch contexts.
- **Agent-First Interface:** A robust Model Context Protocol (MCP) server allows LLMs to query and manipulate the KB predictably without risking corrupted files.
- **Built-in Validation:** Runs rules to catch requirement coverage gaps, dangling references, cycles, and missing required fields.
- **Automation Friendly:** Git hooks automatically extract entities and sync the KB on checkout and merge.

## Prerequisites

- **SWI-Prolog 9.0+**: The core RDF graph and validation rules run on Prolog. You must have `swipl` installed and available in your PATH.

## Installation

### Using npm
```bash
npm install -g kibi-cli kibi-mcp
```

### Using bun
```bash
bun add -g kibi-cli kibi-mcp
```

## Quick Start

Initialize a new Kibi project in your repository:

```bash
# Verify environment prerequisites
kibi doctor

# Scaffold the .kb folder, default configuration, and optional git hooks
kibi init --hooks

# Parse markdown docs and symbols into the branch KB
kibi sync

# Run integrity checks
kibi check
```

## Usage Instructions

### Core Concepts and Data Model

Kibi maps your project into a standard taxonomy. Entities are extracted from Markdown frontmatter or manifest files (`.yaml`) defined in `.kb/config.json`.

- **Entities:** `req`, `scenario`, `test`, `adr`, `flag`, `event`, `symbol`, `fact`
- **Required fields:** `id`, `title`, `status`, `created_at`, `updated_at`, `source`
- **Relationships:** e.g., `depends_on`, `specified_by`, `verified_by`, `implements`

### Hooks and Syncing

If you run `kibi init --hooks`, Kibi installs `post-checkout` and `post-merge` hooks.

- On checkout: Kibi runs `kibi branch ensure` (creating a snapshot from `main` if the branch is new) followed by `kibi sync`.
- On merge: Kibi runs `kibi sync` to update the graph based on the latest merged files.

### Providing LLM Rules

When using an LLM to manage your project, you must instruct the agent to use the Kibi MCP server. The LLM must read and write data exclusively via tools like `kb_upsert` and `kb_query`. **Never** allow the LLM to manually edit the raw RDF or Prolog files located inside `.kb/branches/`.

See [docs/prompts/llm-rules.md](docs/prompts/llm-rules.md) for ready-to-copy system prompts.

## CLI Reference

### `kibi init [--hooks]`
- Creates `.kb/` directory structure
- Installs git hooks (`post-checkout`, `post-merge`) for KB sync
- Adds `.kb/` to `.gitignore`
- Idempotent: safe to run multiple times

### `kibi sync`
- Extracts entities and relationships from project documents
- Supports Markdown for req, scenario, test, adr, flag, event, fact
- Imports symbol manifests from YAML
- Updates KB for current branch

### `kibi query <type> [--id ID] [--tag TAG] [--format json|table]`
- Queries entities by type, ID, or tag
- Supports output as JSON or table
- Example:
  ```bash
  kibi query req --format table
  kibi query test --tag sample
  kibi query scenario --id SCEN-001
  ```
- Returns "No entities found" if empty

### `kibi check`
- Validates KB integrity
- Checks required fields, must-priority coverage, dangling references, cycles
- Reports violations with suggestions

### `kibi gc [--dry-run] [--force]`
- Lists or deletes stale branch KBs (branches deleted in git)
- `--dry-run`: only list
- `--force`: delete

### `kibi branch [--list]`
- Lists branch KBs
- Ensures branch KB exists (copy-from-main semantics)

### `kibi doctor`
- Verifies environment:
  - SWI-Prolog installation
  - `.kb/` directory
  - `config.json` validity
  - Git repository presence
  - Git hooks installed/executable

## MCP Server

Kibi exposes an MCP server for agent integration via stdio (JSON-RPC).

### Tools

- `kb_query`: Query entities by type, ID, tags, and source file
- `kb_upsert`: Insert or update entities
- `kb_delete`: Delete entities by ID
- `kb_check`: Validate KB integrity

Branch KB preparation happens automatically when the MCP server attaches to the
active workspace branch. Branch garbage collection remains a CLI workflow via
`kibi gc` or repository automation hooks.

### Configuration

- Transport: stdio (JSON-RPC, newline-delimited)
- No embedded newlines in messages
- Server writes only valid MCP messages to stdout
- Branch-aware: the server attaches to the active git branch on startup

See [docs/mcp-reference.md](docs/mcp-reference.md) for detailed MCP server documentation.
## Project Structure

Kibi is organized as a monorepo with the following packages:

- **kibi-core** (`packages/core/`): Core Prolog modules and RDF graph logic. Contains entity definitions, relationship predicates, and validation rules. Not published separately - bundled with kibi-cli and kibi-mcp.
- **kibi-cli** (`packages/cli/`): Command-line interface for Kibi. Provides the `kibi` command and all CLI functionality. Published as `kibi-cli` on npm.
- **kibi-mcp** (`packages/mcp/`): Model Context Protocol server for LLM agent integration. Allows AI assistants to query and manipulate the knowledge base. Published as `kibi-mcp` on npm.
- **kibi-vscode** (`packages/vscode/`): VS Code extension with TreeView visualization and CodeLens integration for symbol-aware development. Published as `kibi-vscode` on the VS Code Marketplace.

### Development Workflow

```bash
# Install dependencies across all packages
bun install

# Build all packages
bun run build

# Run tests
bun test

# Release packages to npm (selectively publishes only packages with newer versions)
bun run release:npm  # Publish via npm
bun run release:bun  # Publish via npm (alias for release:npm)

# Release specific packages only
bun run publish:selective core,mcp  # publish only core and mcp
bun run publish:selective cli  # publish only cli
```

## Directory Structure

```
packages/
├── core/                 # Core Prolog modules and RDF graph logic
│   ├── schema/
│   │   ├── entities.pl     # Entity type definitions
│   │   ├── relationships.pl # Relationship predicates
│   │   └── validation.pl   # Validation rules
│   └── src/               # Core Prolog source files
├── cli/                  # Command-line interface (kibi-cli)
│   ├── bin/
│   │   └── kibi           # CLI entry point
│   ├── schema/            # Bundled schema files
│   └── src/               # TypeScript source
├── mcp/                  # MCP server (kibi-mcp)
│   ├── bin/
│   │   └── kibi-mcp       # MCP server entry point
│   └── src/               # TypeScript source
└── vscode/               # VS Code extension
    └── src/               # Extension source

.kb/                      # Knowledge base (generated, per-branch)
├── config.json           # Document paths configuration
└── branches/
    ├── main/
    │   ├── kb.rdf          # RDF triple store (binary snapshot)
    │   └── audit.log       # Change audit log
    └── feature-branch/
        ├── kb.rdf
        └── audit.log
```

## Entity Types

| Type     | Description                                                        | ID Prefix  |
|----------|--------------------------------------------------------------------|------------|
| `req`    | Requirement                                                        | REQ-XXX    |
| `scenario` | BDD scenario describing user behavior                              | SCEN-XXX   |
| `test`   | Unit, integration, or e2e test case                                | TEST-XXX   |
| `adr`    | Architecture decision record documenting technical choices           | ADR-XXX    |
| `flag`   | Feature flag controlling functionality rollout                     | FLAG-XXX   |
| `event`  | Domain or system event published/consumed by components            | EVT-XXX    |
| `symbol` | Abstract code symbol (function, class, module) - language-agnostic | Varies     |
| `fact`   | Atomic domain fact used by requirements and inference checks        | FACT-XXX   |

## Relationship Types

| Relationship        | Source → Target       | Description                                      |
|---------------------|----------------------|--------------------------------------------------|
| `depends_on`        | req → req            | Requirement depends on another requirement        |
| `specified_by`      | req → scenario       | Requirement specified by scenario                 |
| `verified_by`       | req → test           | Requirement verified by test                      |
| `validates`         | test → req           | Test validates requirement                        |
| `implements`        | symbol → req        | Symbol implements requirement                     |
| `covered_by`        | symbol → test        | Symbol covered by test                            |
| `constrained_by`    | symbol → adr        | Symbol constrained by ADR                         |
| `constrains`        | req → fact           | Requirement constrains domain fact                |
| `requires_property` | req → fact           | Requirement requires property fact/value         |
| `guards`            | flag → symbol/event/req | Flag guards entity                         |
| `publishes`         | symbol → event       | Symbol publishes event                            |
| `consumes`          | symbol → event       | Symbol consumes event                             |
| `supersedes`        | adr → adr            | ADR supersedes prior ADR                         |
| `relates_to`        | any → any            | Generic relationship                             |

## Example Entity

```yaml
---
id: REQ-001
title: Sample requirement
status: open
created_at: 2026-02-20T10:00:00Z
updated_at: 2026-02-20T10:00:00Z
source: requirements/REQ-001
tags:
  - sample
---
Placeholder: This is a sample requirement used for documentation.
```

## Troubleshooting & Migrations

- **Corrupted KB / Migration:** Since this is an alpha release with no automatic migrations, if the KB state breaks or you upgrade versions, simply delete the `.kb/branches` folder and run `kibi sync` to rebuild it.
- **Dangling Refs:** If `kibi check` fails with `no-dangling-refs`, verify that your relationship IDs exactly match existing entity IDs.
- Run `kibi doctor` for environment checks
- Run `kibi init --hooks` to reinstall hooks
- Check `.kb/config.json` for document path configuration

## Documentation

- **Architecture:** [docs/architecture.md](docs/architecture.md)
- **Entity Schema:** [docs/entity-schema.md](docs/entity-schema.md)
- **Inference Rules:** [docs/inference-rules.md](docs/inference-rules.md)
- **MCP Reference:** [docs/mcp-reference.md](docs/mcp-reference.md)
- **LLM Prompts:** [docs/prompts/llm-rules.md](docs/prompts/llm-rules.md)

## Notes

- `.kb/` is repo-local, per-branch
- KBs are copied from `main` on new branch creation
- Content-based SHA256 IDs (or explicit `id:` in frontmatter)
- RDF persistence uses SWI-Prolog `library(semweb/rdf_persistency)`
- Git hooks automate KB sync on branch checkout/merge

## Staged Symbol Traceability

Staged Symbol Traceability ensures that every new or modified code symbol (function, class, or module) is explicitly linked to at least one requirement before it can be committed. This feature helps maintain end-to-end traceability between code and requirements, making it easy to verify that all code changes are justified and tracked.

### What is it and why does it exist?

This feature enforces a discipline where every code change must reference a requirement (REQ-xxx). It prevents "orphan" code from being merged, ensuring that all new features, bug fixes, and refactors are traceable to a documented need. This is especially valuable for regulated projects, safety-critical systems, or any team that wants to avoid technical debt and improve auditability.

### How to use `kibi check --staged`

Run the following command to check staged (about-to-be-committed) changes for traceability coverage:

```bash
kibi check --staged
```

This command scans only the files staged for commit. It reports any new or modified symbols that do not have a requirement link. If violations are found, the commit will be blocked (when run as a pre-commit hook).

#### CLI Flags

- `--staged` – Only check staged files (not the whole repo)
- `--min-links <N>` – Minimum number of requirement links per symbol (default: 1)
- `--kb-path <path>` – Path to the KB directory (optional)
- `--rules <rule1,rule2>` – Comma-separated list of rules to run (optional)
- `--dry-run` – Show what would be blocked, but do not block commit

### The `implements REQ-xxx` directive syntax

To link a code symbol to a requirement, add a comment directly above or beside the symbol definition:

```typescript
export function myFunc() { } // implements REQ-001
```

You can link to multiple requirements by separating them with commas:

```typescript
export class MyClass { } // implements REQ-001, REQ-002
```

Supported languages: TypeScript (`.ts`, `.tsx`), JavaScript (`.js`, `.jsx`).

### Configuration via `.kibi/traceability.json` (not yet implemented)

> **Note:** This configuration file is not yet implemented. Use CLI flags (`--min-links`) to customize enforcement.

The following schema is planned for a future release:

```json
{
  "minLinks": 1,
  "langs": ["ts", "tsx", "js", "jsx"]
}
```

- `minLinks`: Minimum number of requirement links per symbol
- `langs`: File extensions to check

### Integration with git hooks

If you run `kibi init --hooks`, a pre-commit hook is installed. This hook automatically runs `kibi check --staged` before every commit. If any staged code symbols are missing requirement links, the commit will be blocked with a clear error message. To bypass, you must add the appropriate `implements REQ-xxx` directive or use `--dry-run` for testing only.
