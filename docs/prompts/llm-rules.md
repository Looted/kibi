# Kibi System Prompts & Instructions

Copy and paste these instructions into your IDE's system prompt or your agent's initial prompt.

## Base Agent Rules

You are operating in a workspace that uses Kibi, an intelligent knowledge base system. You have access to the Kibi MCP server. Follow these rules:

1. **Never manually read or edit files inside `.kb/`.** Interact with the knowledge base only through MCP tools.
2. **Start with `kb_query`.** Read current requirements, ADRs, tests, symbols, or source-linked entities before making assumptions.
3. **Create and update entities with `kb_upsert`.** Keep requirements, scenarios, symbols, tests, ADRs, flags, events, and facts synchronized with your work.
4. **Use relationship rows during `kb_upsert`.** Link requirements, tests, symbols, and facts as part of the same write.
5. **Run `kb_check` after meaningful mutations.** Fix violations before continuing.
6. **Use `kb_delete` sparingly.** Delete only when the removal is intentional and dependencies are understood.

## Public MCP Surface

The Kibi MCP server exposes exactly four public tools:

- `kb_query`
- `kb_upsert`
- `kb_delete`
- `kb_check`

Allowed enum values for entity types, relationship types, and validation rules are encoded directly in each tool's `inputSchema`.

## Querying Best Practices

When you need information about the project:

1. Use `kb_query` with `type` when you know the entity kind.
2. Use `kb_query` with `id` for an exact lookup.
3. Use `kb_query` with `tags` to find related areas.
4. Use `kb_query` with `sourceFile` to find KB entities linked to a specific file.
5. Use small `limit` values first, then paginate with `offset` if needed.

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

## Retroactive Initialization Prompt

Use this prompt to have an LLM bootstrap an existing project into Kibi:

```text
Please scan this project and populate the Kibi knowledge base.

1. Use `kb_query` to inspect existing entities and avoid collisions.
2. Use `kb_upsert` in small batches to create requirements, ADRs, symbols, tests, scenarios, flags, events, and facts.
3. Add relationship rows during each upsert so traceability is explicit.
4. Run `kb_check` after each batch and fix violations before continuing.
5. Use `kb_delete` only if a mistaken entity or relationship needs to be removed deliberately.
```

## Before Starting Work

1. Query for related requirements, ADRs, tests, and symbols with `kb_query`.
2. Identify which entities will need creation or updates.
3. Confirm exact IDs and relationship endpoints before writing.

## During Development

1. Create entities as you go with `kb_upsert`.
2. Maintain relationships continuously instead of batch-fixing them later.
3. Run `kb_check` after significant structural changes.

## After Completing Work

1. Run `kb_check`.
2. Summarize which entities were created, updated, or deleted.
3. Call out any remaining KB follow-up work explicitly.

## Common Patterns

### Creating a New Feature

```text
1. Query existing requirements in the feature area with `kb_query`
2. Create or update requirements via `kb_upsert`
3. Create scenarios, symbols, and tests with `kb_upsert`
4. Link them using relationship rows in the same call when possible
5. Run `kb_check`
```

### Investigating an Issue

```text
1. Use `kb_query` to find related requirements, ADRs, symbols, and tests
2. Determine which entities need updates
3. Apply the smallest safe `kb_upsert` or `kb_delete`
4. Run `kb_check`
```

### Refactoring Code

```text
1. Query existing symbol and requirement context with `kb_query`
2. Update symbol entities and links via `kb_upsert`
3. Remove stale entities only if necessary using `kb_delete`
4. Run `kb_check`
```
