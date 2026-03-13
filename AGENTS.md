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
- `kb_query` - Query entities by type, ID, tags, and source file
- `kb_upsert` - Insert or update entities
- `kb_delete` - Delete entities by ID
- `kb_check` - Validate KB integrity

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

### Rule 2: Git Workflow Rules

**Commit your work whenever a deliverable is ready, using industry-standard conventions.**

- **Conventional Commits**: Always use the [Conventional Commits](https://www.conventionalcommits.org/) format (e.g., `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`).
- **Commit on Ready**: Create a commit as soon as a feature, fix, or documentation update is complete.
- **Local Only**: Do **not** push your commits. Just perform the local commit.
- **Kibi Integration**: Commits trigger Kibi's git hooks to automatically sync and validate the knowledge base.

---

### Rule 3: Release Metadata and Publishing (npm Packages)

- **Release Metadata Required:** If you make changes to any package intended for npm publication (e.g., `kibi-core`, `kibi-cli`, `kibi-mcp`, `kibi-opencode`), you MUST create or update release metadata using [changesets](https://github.com/changesets/changesets). This ensures changelogs and versioning are tracked for all publishable packages.
- **Do NOT Publish Directly:** Agents and contributors must NOT publish npm packages directly. Actual publishing is performed by GitHub Actions after PR review and merge. Local/PR workflows should only prepare changesets and version bumps.
- **Release Workflow:** See the README for the full release workflow, including required commands and changelog policy.
- **Changelog Parity:** Maintain package changelogs consistently across all npm packages, including `packages/opencode/CHANGELOG.md` for `kibi-opencode`.
- **Commit Messages:** All release-related commits must follow Conventional Commits and clearly describe the scope and reason for the release metadata or version change.
- **defaultBranch Precedence:** When preparing releases, the default branch is resolved in this order: `.kb/config.json` `defaultBranch` → `origin/HEAD` → `main`.

---

## Documentation Workflow

### Creating a New Entity

1. Create a Markdown file in the appropriate directory (canonical location under documentation/):
   - Requirements: `documentation/requirements/REQ-XXX.md`
   - Scenarios: `documentation/scenarios/SCEN-XXX.md`
   - Tests: `documentation/tests/TEST-XXX.md`
   - ADRs: `documentation/adr/ADR-XXX.md`
   - Flags: `documentation/flags/FLAG-XXX.md`
   - Events: `documentation/events/EVT-XXX.md`
   - Facts: `documentation/facts/FACT-XXX.md`

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


## Staged Symbol Traceability (Agent Workflow)

Staged Symbol Traceability ensures that every new or modified code symbol (function, class, or module) is explicitly linked to at least one requirement before it can be committed. This is a powerful feature for agents to enforce traceability.

### Purpose

This feature enforces a discipline where every code change must reference a requirement (REQ-xxx). It prevents "orphan" code from being merged, ensuring that all new features, bug fixes, and refactors are traceable to a documented need. This is especially valuable for regulated projects, safety-critical systems, or any team that wants to avoid technical debt and improve auditability.

### Agent Workflow

When implementing code changes, an agent should:

1. **Add the `implements REQ-xxx` directive:**
   ```typescript
   export function myFunc() { } // implements REQ-001
   ```

   You can link to multiple requirements:
   ```typescript
   export class MyClass { } // implements REQ-001, REQ-002
   ```

2. **Verify traceability before committing:**
   ```bash
   kibi check --staged
   ```

   This command scans only files staged for commit and reports any new or modified symbols that do not have a requirement link.

3. **Handle violations:**
   If `kibi check --staged` reports violations, the agent must:
   - Add appropriate `implements REQ-xxx` directives
   - Or use `--dry-run` to understand what would be blocked


### CLI Flags for Staged Checking


- `--staged` – Only check staged files (not whole repo)
- `--min-links <N>` – Minimum number of requirement links per symbol (default: 1)
- `--kb-path <path>` – Path to KB directory (optional)
- `--rules <rule1,rule2>` – Comma-separated list of rules to run (optional)
- `--dry-run` – Show what would be blocked, but do not block commit


### Integration with Git Hooks


When `kibi init` is run (hooks are installed by default), a pre-commit hook is installed. This hook automatically runs `kibi check --staged` before every commit. If any staged code symbols are missing requirement links, commit will be blocked with a clear error message.

### Configuration


> **Note:** The `.kibi/traceability.json` configuration file is not yet implemented. Use CLI flags (`--min-links`) to customize enforcement.

The following schema is planned for a future release:

```json
{
  "minLinks": 1,
  "langs": ["ts", "tsx", "js", "jsx"]
}
```

---

*For user-facing CLI syntax and quick reference, see [CLI Reference](docs/cli-reference.md#staged-symbol-traceability)*
*For troubleshooting staged check issues, see [Troubleshooting](docs/troubleshooting.md)*
