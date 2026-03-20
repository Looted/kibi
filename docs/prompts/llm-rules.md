# Kibi System Prompts & Instructions

Copy and paste these instructions into your IDE's system prompt or your agent's initial prompt.

## Base Agent Rules

You are operating in a workspace that uses Kibi, an intelligent knowledge base system. You have access to the Kibi MCP server. Follow these rules:

1. **Never manually read or edit files inside `.kb/`.** Interact with the knowledge base only through MCP tools.
2. **Start with `kb_query`.** Read current requirements, ADRs, tests, symbols, or source-linked entities before making assumptions.
3. **Create and update entities with `kb_upsert`.** Keep requirements, scenarios, symbols, tests, ADRs, flags, events, and facts synchronized with your work.
4. **Use relationship rows during `kb_upsert`.** Link requirements, tests, symbols, and facts as part of the same write.
5. **Never embed scenarios or tests inside requirement records.** Each requirement, scenario, and test **must** be a separate entity file. Link them using the `links` field and relationship rows (`specified_by`, `verified_by`).
6. **Run `kb_check` after meaningful mutations.** Fix violations before continuing.
7. **Use `kb_delete` sparingly.** Delete only when the removal is intentional and dependencies are understood.
8. **Rebuild local Kibi artifacts after version changes in this repo.** This repository dogfoods local `kibi-mcp` and `kibi-opencode` builds for OpenCode, so after changing package versions or local package wiring, run `bun run build` before relying on OpenCode here.

### Canonical Authoring Pattern: Separate REQ, SCEN, TEST Entities

**Valid Example (Golden Path):**

```yaml
# documentation/requirements/REQ-001.md
---
id: REQ-001
title: User authentication
status: open
links:
  - SCEN-001
  - TEST-001
---

# documentation/scenarios/SCEN-001.md
---
id: SCEN-001
title: Login with valid credentials
status: active
---

# documentation/tests/TEST-001.md
---
id: TEST-001
title: Verify login flow
status: passing
---
```

**Invalid Example (Prohibited):**

```yaml
# WRONG - embedded scenario
---
id: REQ-001
title: User authentication
scenarios:
  - given: user is on login page
    when: they enter valid credentials
    then: they are logged in
---
```

> **Rule:** Do NOT embed scenarios or tests inside requirement records. Always create separate files for each entity and link them using the `links` field and relationship rows.

## Public MCP Surface

The Kibi MCP server exposes exactly four public tools:

- `kb_query`
- `kb_upsert`
- `kb_delete`
- `kb_check`

For retroactive bootstrap on existing repos, use `/init-kibi` in OpenCode.

Allowed enum values for entity types, relationship types, and validation rules are encoded directly in each tool's `inputSchema`.

## Querying Best Practices

When you need information about the project:

1. Use `kb_query` with `type` when you know the entity kind.
2. Use `kb_query` with `id` for exact lookups.
3. Use `kb_query` with `tags` or `sourceFile` for discovery.
4. Paginate with `limit` and `offset` for large result sets.

## Creating and Updating Entities

When creating or updating entities:

1. Include required fields in `properties`:
   - `title`
   - `status`
2. Add useful optional fields when available:
   - `source`
   - `tags`
   - `owner`
   - `priority`
   - `severity`
   - `links`
   - `text_ref`
3. Create relationships during the same `kb_upsert` when possible:
   - `specified_by` for requirement -> scenario
   - `verified_by` or `validates` for requirement/test links
   - `implements` for symbol -> requirement
   - `covered_by` for symbol -> test
   - `constrains` and `requires_property` for requirement/fact modeling

**Important:** Execute `kb_upsert` calls sequentially. Do not fire in parallel to avoid lock contention.

## Anti-Patterns

Avoid these common mistakes:

- **Don't call `kb_check` without rules during iteration** - Full validation is slow; only run when needed or with specific rules.
- **Don't fire `kb_upsert` in parallel** - This causes lock contention. Always execute upserts sequentially.
- **Don't use tags as multi-ID lookup** - Tags are for categorization, not for querying multiple specific entities.
- **Don't create relationships to non-existent entities** - Always confirm target entities exist before linking.

## Before Starting Work

1. Query for related requirements, ADRs, tests, and symbols with `kb_query`.
2. Identify which entities will need creation or updates.
3. Confirm exact IDs and relationship endpoints before writing.

## During Development

1. Create entities as you go with `kb_upsert` (sequentially).
2. Maintain relationships continuously instead of batch-fixing them later.
3. Run `kb_check` after significant structural changes.

## After Completing Work

1. Run `kb_check`.
2. Summarize which entities were created, updated, or deleted.
3. Call out any remaining KB follow-up work explicitly.

## Common Patterns

### Creating a New Feature

```text
1. Query existing requirements in the feature area with kb_query
2. Create or update requirements via kb_upsert (include relationship rows)
3. Run kb_check
```

### Investigating an Issue

```text
1. Use kb_query to find related requirements, ADRs, symbols, and tests
2. Apply the smallest safe kb_upsert or kb_delete
3. Run kb_check
```

### Refactoring Code

```text
1. Query existing symbol and requirement context with kb_query
2. Update symbol entities and links via kb_upsert
3. Run kb_check
```
