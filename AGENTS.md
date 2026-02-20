# Agent Guidelines for Kibi Project

This document provides guidelines for AI agents working on the kibi codebase.

## Project Overview

**Kibi** is a repo-local, per-branch, queryable long-term memory for software projects. It stores requirements, BDD scenarios, tests, architecture decisions (ADRs), feature flags, events, code symbols, and facts—along with typed relationships between them.

The KB is accessible via:
- **CLI**: `kibi` command-line tool
- **MCP Server**: For LLM agent integration via stdio (JSON-RPC)

---

## Entity Types

Kibi supports 8 entity types:

| Type | Description | ID Prefix | Status Values |
|------|-------------|-----------|---------------|
| `req` | Requirement | REQ-XXX | open, in_progress, closed, deprecated |
| `scenario` | BDD behavior | SCEN-XXX | draft, active, deprecated |
| `test` | Unit/integration/e2e test | TEST-XXX | passing, failing, skipped, pending |
| `adr` | Architecture Decision Record | ADR-XXX | proposed, accepted, deprecated, superseded |
| `flag` | Feature flag | FLAG-XXX | active, inactive, deprecated |
| `event` | Domain/system event | EVT-XXX | active, deprecated |
| `symbol` | Code symbol (function/class/module) | Varies | active, deprecated, removed |
| `fact` | Atomic domain fact | FACT-XXX | active, deprecated |

---

## Relationship Types

| Relationship | Source → Target | Description |
|--------------|-----------------|-------------|
| `depends_on` | req → req | Requirement depends on another |
| `specified_by` | req → scenario | Requirement specified by scenario |
| `verified_by` | req → test | Requirement verified by test |
| `validates` | test → req | Test validates requirement |
| `implements` | symbol → req | Symbol implements requirement |
| `covered_by` | symbol → test | Symbol covered by test |
| `constrained_by` | symbol → adr | Symbol constrained by ADR |
| `constrains` | req → fact | Requirement constrains domain fact |
| `requires_property` | req → fact | Requirement requires property/value fact |
| `guards` | flag → symbol/event/req | Flag guards entity |
| `publishes` | symbol → event | Symbol publishes event |
| `consumes` | symbol → event | Symbol consumes event |
| `supersedes` | adr → adr | ADR supersedes prior ADR |
| `relates_to` | any → any | Generic relationship |

---

## Querying Kibi

### CLI Queries

```bash
# List all requirements
kibi query req --format table

# Query specific entity by ID
kibi query req --id REQ-001

# Query by tag
kibi query test --tag sample

# List all scenarios
kibi query scenario

# JSON output (default)
kibi query adr --format json
```

### MCP Tool Queries

Available MCP tools:
- `kb_query` - Query entities by type, ID, tags, relationships
- `kb_query_relationships` - Query relationships between entities
- `kb_upsert` - Insert or update entities
- `kb_delete` - Delete entities by ID
- `kb_check` - Validate KB integrity
- `kb_branch_ensure` - Ensure branch KB exists
- `kb_branch_gc` - Garbage collect merged branch KBs

---

## Rules for Agents

### Rule 1: Kibi-First Documentation (VERY IMPORTANT)

**All work must be documented using kibi.**

When you encounter code that is not obvious about its intent on first sight:

1. **Query kibi first** instead of grepping the project
2. If kibi query returns nothing:
   - **a)** Do the research yourself (read code, understand context)
   - **Update kibi** with your findings (create/update entities, relationships)
   - **b)** If the query mechanism itself is lacking, **report it to the user** so kibi can be improved

This ensures the knowledge base grows with each investigation, making future work easier for both humans and agents.

### Rule 2: Commit Your Work

**Make commits for your work following standard conventions.**

- Follow conventional commit format when appropriate (e.g., `feat:`, `fix:`, `docs:`, `refactor:`)
- The key is that commits happen so kibi hooks can run their checks
- Kibi's git hooks (`post-checkout`, `post-merge`) automatically sync and validate the KB

---

## Documentation Workflow

### Creating a New Entity

1. Create a Markdown file in the appropriate directory:
   - Requirements: `requirements/REQ-XXX.md`
   - Scenarios: `scenarios/SCEN-XXX.md`
   - Tests: `tests/TEST-XXX.md`
   - ADRs: `adr/ADR-XXX.md`
   - Flags: `flags/FLAG-XXX.md`
   - Events: `events/EVT-XXX.md`
   - Facts: `facts/FACT-XXX.md`

2. Include frontmatter with required fields:
   ```yaml
   ---
   id: REQ-XXX
   title: Short summary
   status: open
   created_at: 2026-02-20T10:00:00Z
   updated_at: 2026-02-20T10:00:00Z
   source: path/to/source
   tags:
     - relevant-tag
   ---
   ```

3. Run `kibi sync` to import the entity into the KB

### Updating an Entity

1. Edit the Markdown file
2. Update `updated_at` timestamp
3. Run `kibi sync` to sync changes

### Linking Entities

Use the `links` field in frontmatter to declare relationships:
```yaml
links:
  - REQ-001  # This entity relates to REQ-001
  - ADR-005  # This entity relates to ADR-005
```

---

## Quick Reference

```bash
# Initialize KB with hooks
kibi init --hooks

# Verify environment
kibi doctor

# Sync entities from documents
kibi sync

# Query entities
kibi query <type> [--id ID] [--tag TAG] [--format json|table]

# Validate KB
kibi check

# List branch KBs
kibi branch --list

# Clean up stale branch KBs
kibi gc --dry-run
kibi gc --force
```

---

## Notes

- `.kb/` is repo-local and per-branch
- KBs are copied from `main` on new branch creation
- Git hooks automate KB sync on branch checkout/merge
- Run `kibi doctor` if you encounter environment issues
