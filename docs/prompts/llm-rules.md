# Kibi System Prompts & Instructions

Copy and paste these instructions into your IDE's system prompt (e.g., Cursor Rules) or your agent's initial prompt.

## Base Agent Rules

You are operating in a workspace that uses Kibi, an intelligent knowledge base system. You have access to the Kibi MCP server. Follow these strict rules:

1. **NEVER manually read or edit files inside the `.kb/` folder.** All interactions with the knowledge base must go through MCP tools.

2. **When answering architectural or requirement queries, always call `kb_query` first.** Use the existing knowledge base to understand context before making assumptions.

3. **If I ask you to create a new requirement, ADR, or test, define the entity via `kb_upsert`** to ensure the project graph remains in sync with your work.

4. **Always link new implementations or tests back to requirements using relationships** like `implements` or `validates` during your `kb_upsert` call. This maintains traceability across the project.

5. **After doing any structural changes, always call `kb_check`** to ensure you haven't broken the knowledge base validation rules.

## Querying Best Practices

When you need information about the project:

1. **Start with `kb_query`** to retrieve relevant entities:
   - Use `type` parameter to filter by entity type (`req`, `adr`, `scenario`, `test`, `symbol`)
   - Use `tag` parameter to find entities with specific tags
   - Use `id` parameter for exact entity lookup

2. **Use `kb_query_relationships`** to understand how entities connect:
   - Query `from` and `to` to trace dependencies
   - Use `type` to filter by relationship kind

3. **Leverage inference tools** for deeper insights:
   - `kb_impact` to see what would be affected by a change
   - `kb_coverage_report` to check requirement coverage
   - `kb_current_adr` to get active architecture decisions

## Creating and Updating Entities

When creating or updating entities:

1. **Always include required fields:**
   - `id`: Unique identifier (use consistent naming like `REQ-XXX`, `ADR-XXX`)
   - `title`: Clear, descriptive summary
   - `status`: Current status (entity-specific values)
   - `created_at`: ISO 8601 timestamp (can be omitted for auto-generation)
   - `updated_at`: ISO 8601 timestamp (can be omitted for auto-generation)
   - `source`: Where this entity came from (file path, URL, or reference)

2. **Use appropriate optional fields:**
   - `tags`: Array of relevant tags for filtering
   - `owner`: Person or team responsible
   - `priority`: Priority level for requirements
   - `links`: Array of related URLs

3. **Define relationships during upsert:**
   - Link requirements to scenarios using `specified_by`
   - Link tests to requirements using `validates`
   - Link symbols to requirements using `implements`
   - Link symbols to tests using `covered_by`

## Retroactive Initialization Prompt

Use this prompt to have an LLM bootstrap an existing project into Kibi:

```
Please scan this project and retroactively populate the Kibi knowledge base.

1. Analyze any existing markdown docs, tests, and core components to understand the project structure.

2. Iteratively call `kb_upsert` to create:
   - `req` entities for requirements (from docs, tickets, or implicit needs)
   - `adr` entities for architectural decisions (from design docs, architecture docs, or commit history)
   - `symbol` entities for core components (functions, classes, modules)
   - `test` entities for test files

3. Create relationships between these entities:
   - Link test files to the requirements they cover using `validates`
   - Link implementations to requirements using `implements`
   - Link requirements to each other using `depends_on` where appropriate

4. Keep batches small. After each batch, run `kb_check` to ensure no validation errors.

5. Once you have populated the baseline graph, run:
   - `kb_coverage_report` to check requirement coverage
   - `kb_check` to identify any dangling references or missing fields
   - Fix any issues found before completing the initialization.
```

## Before Starting Work

Before starting any development work:

1. **Query context**: Use `kb_query` to find related requirements, ADRs, and existing implementations.

2. **Check constraints**: Use `kb_query_relationships` to understand any `constrained_by` relationships from ADRs.

3. **Review existing patterns**: Look at similar `symbol` entities to understand established patterns.

4. **Plan updates**: Identify which entities you'll need to create or update.

## During Development

While working:

1. **Create entities as you go**: Don't wait until the end—use `kb_upsert` to create entities as you implement features.

2. **Maintain relationships**: Always link new work to requirements and tests.

3. **Validate frequently**: Run `kb_check` after significant changes to catch issues early.

## After Completing Work

When you're done:

1. **Run `kb_check`**: Ensure no validation errors.

2. **Run `kb_coverage_report`**: Verify test coverage is adequate.

3. **Check `kb_impact`**: See what entities are affected by your changes.

4. **Report status**: Summarize entities created/updated and relationships added.

## Common Patterns

### Creating a New Feature

```
1. Query existing requirements in the feature area: `kb_query` with `type=req` and appropriate `tag`
2. If no requirement exists, create one with `kb_upsert`
3. Create scenario(s) with `kb_upsert`, link to requirement using `specified_by`
4. Implement code and create symbol entities with `kb_upsert`, link using `implements`
5. Create tests and link them with `kb_upsert`, use `validates` relationship
6. Run `kb_check` to validate
```

### Investigating an Issue

```
1. Use `kb_query` to find related requirements and ADRs
2. Use `kb_query_relationships` to trace dependencies
3. Use `kb_impact` to see what would be affected by changes
4. Identify root cause through the knowledge graph
5. Create ADR if architectural change is needed
6. Update affected entities and relationships
7. Run `kb_check` to validate
```

### Refactoring Code

```
1. Query symbols to understand current structure: `kb_query` with `type=symbol`
2. Check `implements` and `covered_by` relationships
3. Plan refactor changes
4. Update symbol entities with new structure via `kb_upsert`
5. Ensure tests still cover new structure (check `validates` relationships)
6. Run `kb_check` to validate
7. Run `kb_coverage_report` to ensure no coverage lost
```

## Entity Status Values

Use appropriate status values for each entity type:

- **req**: `open`, `in_progress`, `closed`, `deprecated`
- **scenario**: `draft`, `active`, `deprecated`
- **test**: `passing`, `failing`, `skipped`, `pending`
- **adr**: `proposed`, `accepted`, `deprecated`, `superseded`
- **flag**: `active`, `inactive`, `deprecated`
- **event**: `active`, `deprecated`
- **symbol**: `active`, `deprecated`, `removed`
- **fact**: `active`, `deprecated`

## Relationship Guidelines

Use the correct relationship type:

- **`depends_on`**: Between requirements when one depends on another
- **`specified_by`**: Requirement → Scenario (BDD scenario specifies requirement)
- **`verified_by`**: Requirement → Test (test verifies requirement)
- **`validates`**: Test → Requirement (inverse of verified_by, use this when linking from test side)
- **`implements`**: Symbol → Requirement (code implements requirement)
- **`covered_by`**: Symbol → Test (test covers symbol)
- **`constrained_by`**: Symbol → ADR (ADR constrains symbol)
- **`constrains`**: Requirement → Fact (requirement constrains domain fact)
- **`requires_property`**: Requirement → Fact (requirement requires property fact)
- **`guards`**: Flag → Symbol/Event/Requirement (feature flag guards entity)
- **`publishes`**: Symbol → Event (symbol publishes event)
- **`consumes`**: Symbol → Event (symbol consumes event)
- **`supersedes`**: ADR → ADR (newer ADR supersedes older one)
- **`relates_to`**: Generic relationship between any entities
