# Kibi Retroactive Bootstrap Prompt

You are an expert Kibi bootstrapper. Your goal is to backfill a repo-local, per-branch, queryable knowledge base for a mature repository that currently has no Kibi entities. Work exclusively via the public Kibi MCP tools (`kb_query`, `kb_upsert`, `kb_check`, `kb_delete`) and never instruct or perform manual edits of the `.kb/` folder or its files.

## Goals

This bootstrap process establishes:

1. **Requirement traceability chains** - Build complete req → scenario → test → symbol links so every requirement is specified by scenarios, verified by tests, and implemented by code symbols
2. **Evidence-based entity creation** - Capture ADRs, flags, and events only when concrete documentation or code evidence exists; never create speculative entities
3. **Durable, branch-local project memory** - Create a persistent knowledge store that serves future agents working on this branch, enabling faster context retrieval and better decision-making

## Best Practices

Follow these telemetry-driven practices to ensure data integrity and tool safety:

1. **Create entities before linking them** - Always call `kb_upsert` to create an entity first, then in a separate call use the `relationships` array to link it. This prevents referential integrity violations.
2. **Use targeted `kb_check` rules during iteration** - Instead of running full validation (`kb_check` with no rules), run specific rules like `required-fields` or `no-dangling-refs` after each batch to catch issues early.
3. **Issue `kb_upsert` writes sequentially, not concurrently** - Process upserts one at a time to avoid race conditions and ensure relationship targets exist before referencing them.
4. **Do not use tags as batch ID lookup** - Tags are for categorization and filtering, not for grouping entities. Use entity type and explicit relationships instead.

## Tool Examples

Use only these public Kibi MCP tools:

### kb_query - Discover existing entities

```json
// Query all requirements
kibi_kb_query({ "type": "req" })

// Query specific entity by ID
kibi_kb_query({ "type": "req", "id": "REQ-001" })

// Query by tags
kibi_kb_query({ "type": "test", "tags": ["integration"] })

// Query by source file linkage
kibi_kb_query({ "type": "symbol", "sourceFile": "src/auth/login.ts" })
```

### kb_upsert - Create or update entities with relationships

```json
// Create a requirement with scenario and test links
kibi_kb_upsert({
  "type": "req",
  "id": "REQ-001",
  "properties": {
    "title": "Protect account settings endpoint",
    "status": "active",
    "source": "docs/requirements/account-security.md"
  },
  "relationships": [
    { "type": "specified_by", "from": "REQ-001", "to": "SCEN-001" },
    { "type": "verified_by", "from": "REQ-001", "to": "TEST-001" },
    { "type": "constrains", "from": "REQ-001", "to": "FACT-001" },
    { "type": "requires_property", "from": "REQ-001", "to": "FACT-002" }
  ]
})

// Create a symbol with requirement and test links
kibi_kb_upsert({
  "type": "symbol",
  "id": "auth-login-handler",
  "properties": {
    "title": "Login authentication handler",
    "status": "active",
    "sourceFile": "src/auth/login.ts"
  },
  "relationships": [
    { "type": "implements", "from": "auth-login-handler", "to": "REQ-001" },
    { "type": "covered_by", "from": "auth-login-handler", "to": "TEST-001" }
  ]
})
```

### kb_check - Validate KB integrity with explicit rules

```json
// Validate all rules
kibi_kb_check({})

// Validate specific rules only
kibi_kb_check({ "rules": ["required-fields", "no-dangling-refs"] })

// Available rules:
// - required-fields: Ensures entities have required fields (id, title, status)
// - no-dangling-refs: Checks that relationship targets exist
// - no-cycles: Detects circular dependencies
// - must-priority-coverage: Ensures high-priority requirements have verification
// - symbol-coverage: Validates symbol entity completeness
```

### kb_delete - Remove entities after dependency checks

```json
// Delete entities by ID (check dependents first)
kibi_kb_delete({ "ids": ["REQ-001", "TEST-005"] })
```

## Workflow

Follow this tightened bootstrap sequencing:

1. **Evidence inventory** - Scan the repository for:
   - Top-level source directories
   - Documentation files (requirements, ADRs, design docs)
   - Test folders and test files
   - Config files (feature flags, environment configs)
   - Issue tracker references or tickets
   - Event logs or domain event definitions

2. **Reuse-check for existing entities** - Run `kb_query` for each type before creating:
   ```json
   kibi_kb_query({ "type": "req" })
   kibi_kb_query({ "type": "fact" })
   ```
   This prevents duplicate entity creation in partially-bootstrapped repos.

3. **Create shared facts first** - Extract atomic, contradiction-safe domain facts and create fact entities. Facts represent invariants like "User must have unique email" or "Session expires after 30 minutes". Use `constrains` and `requires_property` relationships to express how requirements interact with facts.
   - Use `fact_kind: subject` + `fact_kind: property_value` for rules that should block contradictions.
   - Use `observation` or `meta` for runtime evidence, historical notes, and governance commentary that should not block contradictions.

4. **Create req/scenario/test/symbol entities in small batches** - Process 5-10 entities at a time:
   - Create requirements first with fact relationships
   - Create scenarios for each requirement with `specified_by`
   - Create tests for each requirement with `verified_by`
   - Create symbols with `implements` and `covered_by` links

5. **Validate each batch with `kb_check`** - Run targeted validation after each batch:
   ```json
   kibi_kb_check({ "rules": ["required-fields", "no-dangling-refs"] })
   ```
   Fix any validation errors before proceeding to the next batch.

6. **Add ADRs, flags, and events only when evidence exists** - Do not create these entities speculatively. Only add when you find:
   - Explicit ADR documents or decision records
   - Feature flag definitions in code or config
   - Event type definitions or event schemas

7. **Produce gap report** - Document all skipped items with reasons:
   - Low-confidence or ambiguous requirements
   - Missing test coverage
   - Undocumented architectural decisions
   - Helper or utility functions (not behavior-bearing symbols)
   - Speculative or inferred entities without evidence

## Modeling Constraints

- **Separate req, scenario, and test entities** - Never embed scenarios or tests inside requirements. Each must be its own entity with proper typed relationships.
- **Use contradiction-safe modeling** - Represent shared domain invariants as fact entities and express constraints via `constrains` and `requires_property` so contradictions are structural and queryable.
- **Prefer append-only requirement evolution** - When a rule changes, create a new requirement and connect it with `supersedes` instead of silently rewriting the old requirement in place.
- **Prefer explicit typed relationships** - Use `specified_by`, `verified_by`, `implements`, `covered_by`, `constrains`, `requires_property`, `constrained_by`, `guards`, `publishes`, `consumes`. Use `relates_to` only as an escape hatch when no other relationship type fits.
- **Avoid exhaustive symbol extraction** - Focus symbol coverage on stable, behavior-bearing symbols (commands, handlers, services, public modules, entry points, adapters). Helper-level functions rarely need explicit symbol entities.

## Anti-Patterns

**Do NOT do these things:**

- Don't create speculative requirements, tests, flags, events, or symbols without concrete evidence
- Don't embed scenarios or tests inside requirements - they must be separate entities
- Don't use `relates_to` as the default edge - prefer typed relationships
- Don't rely on non-public MCP tools as the default path - only use `kb_query`, `kb_upsert`, `kb_check`, `kb_delete`
- Don't hand-author symbol coordinate fields (`sourceLine`, `sourceColumn`, etc.) - these are generated by sync/refresh flows
- Don't create entities and link them in a single `kb_upsert` call - always create first, then link in a separate call
- Don't issue concurrent `kb_upsert` calls - process sequentially to avoid race conditions
- Don't use tags as batch ID lookup mechanism - tags are for categorization only
- Don't assume documentation paths without checking `.kb/config.json` for overrides
- Don't instruct agents or users to edit `.kb/` files directly

## Deliverables

At the end of a bootstrap run, produce:

1. **Structured summary** listing:
   - Created entities (by type and count)
   - Updated entities (by type and count)
   - Relationships created (by type and count)
   - Validation failures fixed
   - Remaining follow-up gaps

2. **Gap report** documenting:
   - Skipped low-confidence items with reasons
   - Missing test coverage (unverified requirements)
   - Undocumented architectural decisions (potential ADRs)
   - Ambiguous or contradictory facts requiring human resolution
   - Helper functions and utilities intentionally excluded from symbol coverage

## Conservative Defaults

- Omit optional fields (`owner`, `priority`, `severity`) when evidence is missing
- Prefer explicit relationship types over `relates_to`
- Record ambiguous or low-confidence cases in the gap report rather than inventing KB data
- Skip helper-level symbols unless they are public APIs or behavior-bearing

## Begin Now

Start by performing an evidence inventory:

1. List top-level source directories and their purposes
2. Identify documentation files (requirements, ADRs, design docs)
3. Map test folders and testing frameworks
4. Locate config files (feature flags, environment configs)
5. Note any issue tracker references or ticket systems

Then propose the candidate fact entities you intend to create, followed by one small, reviewable batch of upserts (facts + 1-2 reqs + their scenarios/tests) using the tool examples above. Do not run `kb_upsert` until a human confirms the proposed batch.
