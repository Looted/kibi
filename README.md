# Kibi Knowledge Base

> **⚠️ Functional Alpha Release** - Kibi v0 is an early preview suitable for small projects and early adopters. Performance is not optimized. See [Known Limitations](KNOWN_LIMITATIONS.md) for details.

## Project Overview
Kibi is a branch-aware, queryable knowledge base for software projects. It stores requirements, BDD scenarios, tests, architecture decisions (ADRs), feature flags, events, and code symbols, along with typed relationships between them. The KB is accessible via CLI and MCP server, supporting deterministic agent workflows and human review.

### Motivation
Kibi enables traceable, auditable project memory, linking requirements to tests, decisions, and code. It supports per-branch KBs for isolated feature development, and integrates with git automation for seamless updates.

## Quick Start

> **Performance Note**: Kibi v0 is optimized for correctness, not speed. Sync operations take ~2s, suitable for small projects (<100 entities). Performance optimization is the primary goal for v0.1.

### Prerequisites
- SWI-Prolog >= 9.0 (https://www.swi-prolog.org/)
- Bun (https://bun.sh/)
- Git (for branch-aware KB)

### Installation
```bash
bun install
```

### Initialize KB
```bash
kibi init --hooks   # Creates .kb/, installs git hooks
```

### Verify Environment
```bash
kibi doctor         # Checks SWI-Prolog, .kb/, config, git, hooks
```

### Extract Entities
```bash
kibi sync           # Imports entities from Markdown/YAML documents
```

### Query KB
```bash
kibi query req --format table   # List requirements
kibi query test --tag sample    # Query tests by tag
kibi query scenario --id SCEN-001  # Query scenario by ID
```

### Validate KB
```bash
kibi check           # Runs consistency checks
```

### Clean Up Branch KBs
```bash
kibi gc --dry-run    # List stale branch KBs
kibi gc --force      # Delete stale branch KBs
```

### List Branch KBs
```bash
kibi branch --list   # Show all branch KBs
```

## CLI Reference

### `kibi init [--hooks]`
- Creates `.kb/` directory structure
- Installs git hooks (`post-checkout`, `post-merge`) for KB sync
- Adds `.kb/` to `.gitignore`
- Idempotent: safe to run multiple times

### `kibi sync`
- Extracts entities and relationships from project documents
- Supports Markdown for req, scenario, test, adr, flag, event
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

## MCP Server Tools

Kibi exposes an MCP server for agent integration via stdio (JSON-RPC).

### Tools
- `kb_query`: Query entities by type, ID, tags, relationships
- `kb_upsert`: Insert or update entities
- `kb_delete`: Delete entities by ID
- `kb_check`: Validate KB integrity
- `kb_branch_ensure`: Ensure branch KB exists (copy-from-main)
- `kb_branch_gc`: Garbage collect merged branch KBs

Each tool accepts `branch` parameter for branch-aware operations.

### Monitoring MCP Usage with MCPcat

- Set `MCPCAT_PROJECT_ID` before starting `kibi-mcp` to enable MCPcat telemetry. All tool calls are automatically tracked via the `@modelcontextprotocol/sdk` integration and appear on the mcpcat.io dashboard.
- If `MCPCAT_PROJECT_ID` is not set, telemetry is dormant and no traffic is emitted.
- The repository ships a `.env` file at the root that sets `MCPCAT_PROJECT_ID=proj_39vdkV2eZFDHOwI5EhDdVtf0eO3`, and `kibi-mcp` loads it automatically at startup (set `KIBI_ENV_FILE` to point elsewhere).

## Directory Structure
```
.kb/
├── config.json           # Document paths configuration
├── schema/
│   ├── entities.pl       # Entity type definitions
│   ├── relationships.pl  # Relationship predicates
│   └── validation.pl     # Validation rules
└── branches/
    ├── main/
    │   ├── kb.rdf        # RDF triple store (binary snapshot)
    │   └── audit.log     # Change audit log
    └── feature-branch/
        ├── kb.rdf
        └── audit.log
```

## Entity Types
- `req`: Requirement
- `scenario`: BDD scenario
- `test`: Unit/integration/e2e test
- `adr`: Architecture decision record
- `flag`: Feature flag
- `event`: Domain/system event
- `symbol`: Code symbol (function/class/module)
- `fact`: Atomic domain fact used by requirements and inference checks

## Relationship Types
- `depends_on(req, req)`
- `specified_by(req, scenario)`
- `verified_by(req, test)`
- `validates(test, req)`
- `implements(symbol, req)`
- `covered_by(symbol, test)`
- `constrained_by(symbol, adr)`
- `constrains(req, fact)`
- `requires_property(req, fact)`
- `guards(flag, symbol|event|req)`
- `publishes(symbol, event)`
- `consumes(symbol, event)`
- `supersedes(adr, adr)`
- `relates_to(a, b)`

## Example Entity (from test fixtures)
```yaml
---
id: REQ-001
title: Sample requirement REQ-001
status: open
created_at: 2026-02-17T13:00:00Z
updated_at: 2026-02-17T13:00:00Z
source: https://example.com/fixtures/requirements/REQ-001
tags:
  - sample
owner: product-team
priority: medium
links: []
---
Placeholder: This is a sample requirement used for tests.
```

## VS Code Extension
- Sidebar TreeView shows entity types
- Activates on workspace with `.kb/` directory
- MCP contribution for `kibi-mcp` server
- Minimal scaffolding; full features planned for future versions

## MCP Server Configuration
- Transport: stdio (JSON-RPC, newline-delimited)
- No embedded newlines in messages
- Server writes only valid MCP messages to stdout
- Branch-aware: every tool call accepts `branch` parameter

## Notes
- `.kb/` is repo-local, per-branch
- KBs are copied from `main` on new branch creation
- Content-based SHA256 IDs (or explicit `id:` in frontmatter)
- RDF persistence uses SWI-Prolog `library(semweb/rdf_persistency)`
- Git hooks automate KB sync on branch checkout/merge

## Troubleshooting
- Run `kibi doctor` for environment checks
- Run `kibi init --hooks` to reinstall hooks
- Check `.kb/config.json` for document path configuration

---
For architecture and schema details, see `architecture.md` and `entity-schema.md`.
