# Agent Guidelines for Kibi Project

This document provides guidelines for AI agents working on the kibi codebase.

## Project Overview

**Kibi** is a repo-local, per-branch, queryable long-term memory for software projects. It stores requirements, BDD scenarios, tests, architecture decisions (ADRs), feature flags, events, code symbols, and facts—along with typed relationships between them.

The KB is accessible via:
- **CLI**: `kibi` command-line tool for humans/operators and automation
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
| `flag` | Feature flag / runtime config gate | FLAG-XXX | active, inactive, deprecated |
| `event` | Domain event | EVT-XXX | active, deprecated |
| `symbol` | Code symbol (function, class, module) | SYM-XXX | active, deprecated |
| `fact` | Atomic domain fact; use observation/meta for bug and workaround notes | FACT-XXX | active, deprecated |

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
| `supersedes` | adr → adr, req → req | ADR or requirement supersedes prior one |
| `relates_to` | any → any | Generic relationship |

---

## Querying Kibi

### MCP Tool Queries (Preferred)

Agents should use MCP tools for all KB interactions. For initial repository setup, use the `/init-kibi` slash command in OpenCode.

Available MCP tools:
- `kb_query` - Query entities by type, ID, tags, and source file
- `kb_upsert` - Insert or update entities
- `kb_delete` - Delete entities by ID
- `kb_check` - Validate KB integrity

If the KB needs setup or repair beyond what `/init-kibi` provides, ask the user/operator to handle it outside the agent session.

---

## Rules for Agents

### Rule 1: Kibi-First Documentation (VERY IMPORTANT)

**All work must be documented using kibi.**

When you encounter code that is not obvious about its intent on first sight:

1. **Query Kibi first** with `kb_query` instead of grepping the project
2. If `kb_query` returns nothing:
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
- **Dogfood Rebuild Rule:** This repo's OpenCode setup uses local built `kibi-mcp` and `kibi-opencode` artifacts via `opencode.json` and `.opencode/plugins/kibi.ts`. After changing any Kibi package version or local package wiring used by that setup, run `bun run build` before testing or using OpenCode here.

---

## Kibi MCP Best Practices

### Query First
Always call kb_query before mutations to confirm current state.

*Rationale:* Prevents duplicate entities and ensures you're updating existing records rather than creating conflicts.

### Create Before Link
Relationship endpoints must exist before creating the relationship.

*Rationale:* Referential integrity requires target entities to be defined; otherwise, the relationship will fail validation.

### Prefer Targeted Checks
Use kb_check with explicit rules during iteration, not the full check.

*Rationale:* Targeted checks are faster and provide focused feedback, speeding up the iteration cycle.

### Sequential Writes
Issue kb_upsert calls sequentially, never in parallel (avoid mutex contention).

*Rationale:* Kibi uses file-based storage with mutex locks; parallel writes can cause contention errors and data corruption.

### Tags Are Not IDs
The tags parameter filters by metadata tags, not entity IDs.

*Rationale:* Tags are categorization labels, not identifiers; filtering by ID requires the id parameter, not tags.

### Small Batches
Upsert in small reviewable batches, validate after each.

*Rationale:* Smaller batches make errors easier to isolate and recover from, and ensure each batch is correct before moving on.

### Gap Reports
Record uncertainty in gap reports, not speculative entities.

*Rationale:* The KB should contain verified knowledge, not guesses; speculative entries introduce noise and reduce trust in the system.

### Strict Fact Modeling for Normative Requirements
Use the strict fact lane when a requirement should participate in contradiction blocking: link the req to a `fact_kind=subject` fact via `constrains` and to a `fact_kind=property_value` fact via `requires_property`. Use `observation` and `meta` for non-blocking evidence and governance notes.

### Prefer Append-Only Requirement Evolution
When requirement semantics change, create a new requirement and link the old one with `supersedes` rather than assuming a plain upsert replaces earlier strict-fact semantics.

### Entity Choice for Bug and Workaround Documentation

When documenting bugs, incidents, or workarounds:
  - Create a `fact` entity with `fact_kind: observation` or `fact_kind: meta`
  - Do NOT create a `flag` entity unless there is an actual runtime/config gate
  - Use `relates_to` to link the fact to related requirements, tests, or ADRs

When a bug is temporarily mitigated by a feature gate:
  - Create TWO records: `fact` (describes the issue/workaround) + `flag` (the gate)
  - Link them with `relates_to` since no typed relationship exists for this case

**Canonical mapping:**
  - `flag` = runtime/config gate (includes kill-switches, deferred capabilities)
  - `fact` (observation/meta) = bug records, incident notes, workarounds
  - `req` = intended/corrected behavior
  - `test` = executable verification/reproduction
  - `adr` = durable design rationale

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

> **Entity Choice Decision**: Use `flag` only for actual runtime gates. For bug/workaround documentation, use `fact` with `fact_kind: observation` or `meta` instead.

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

3. The entity will be synced to the KB by git hooks or operator-initiated sync.

### Updating an Entity

1. Edit the Markdown file
2. Update `updated_at` timestamp
3. The changes will be synced by git hooks or operator-initiated sync.

### Linking Entities

Use the `links` field in frontmatter to declare relationships:
```yaml
links:
  - REQ-001  # This entity relates to REQ-001
  - ADR-005  # This entity relates to ADR-005
```

Plain string `links` import as generic `relates_to` edges only. When contradiction-safe semantics matter, prefer typed links such as:

```yaml
links:
  - type: constrains
    target: FACT-SESSION
  - type: requires_property
    target: FACT-SESSION-MAX-AGE-30-MINUTES
```

---

## Quick Reference for Agents

### MCP Tools

```text
kb_query(type, id, tags, sourceFile, limit, offset)
kb_upsert(type, id, properties, relationships)
kb_delete(ids)
kb_check(rules)
```

### Slash Commands (OpenCode)

- `/init-kibi` - Bootstrap Kibi in the current repository

### Setup/Repair Escalation

If the KB needs initialization, repair, or configuration beyond `/init-kibi`:
1. Ask the user/operator to run the appropriate CLI commands
2. Do not attempt to run `kibi` CLI commands yourself

### Entity Choice Quick Reference

- `flag` — Runtime/config gate (NOT for bug records)
- `fact` — Domain facts; use `observation`/`meta` for bugs/workarounds
- `req` — Intended behavior
- `test` — Executable verification
- `adr` — Durable design decisions

**Rule**: Bug mitigated by a gate? Create both: `fact` (issue) + `flag` (gate).

---

## Notes

- `.kb/` is repo-local and per-branch
- KBs are copied from `main` on new branch creation
- Git hooks automate KB sync on branch checkout/merge
- If you encounter KB setup issues, ask the user/operator to run the appropriate Kibi diagnostics outside the agent session


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
   export class MyClass() { } // implements REQ-001, REQ-002
   ```

2. **Git hooks enforce traceability automatically:**
   When Kibi is initialized with hooks, a pre-commit hook automatically validates that staged code symbols have requirement links. This happens automatically on commit - you do not need to run validation manually.

3. **Handle violations:**
   If commit is blocked due to missing requirement links:
   - Add appropriate `implements REQ-xxx` directives to your code
   - Or ask the user/operator to review if the traceability rules need adjustment



### Configuration

> **Note:** The `.kibi/traceability.json` configuration file is not yet implemented. Traceability enforcement is handled automatically by git hooks.

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
