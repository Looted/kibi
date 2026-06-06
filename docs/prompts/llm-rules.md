# Kibi System Prompts & Instructions

Copy and paste these instructions into your IDE's system prompt or your agent's initial prompt.

## Base Agent Rules

You are operating in a workspace that uses Kibi, an intelligent knowledge base system. You have access to the Kibi MCP server. Follow these rules:

1. **Never manually read or edit files inside `.kb/`.** Interact with the knowledge base only through MCP tools.
2. **Do not invoke `kibi` CLI commands directly from the agent.** Use MCP tools and sanctioned slash commands instead.
3. **Start with interactive `/init-kibi` for new repos.** Use the `/init-kibi` slash command for an interactive onboarding workflow. This workflow uses `kb_autopilot_generate` to synthesize entities from your declared context and codebase evidence. Always preview candidates and get user approval before writing.
4. **Create and update entities with `kb_upsert`.** Keep requirements, scenarios, symbols, tests, ADRs, flags, events, and facts synchronized with your work.
5. **Use relationship rows during `kb_upsert`.** Link requirements, tests, symbols, and facts as part of the same write.
6. **Never embed scenarios or tests inside requirement records.** Each requirement, scenario, and test **must** be a separate entity file. The canonical traceability chain is `REQ-xxx` → `SCEN-xxx` → `TEST-xxx`. Link them using explicit typed `links` entries or relationship rows (`specified_by`, `verified_by`, `validates`).
7. **Run `kb_check` after meaningful mutations.** Fix violations before continuing.
8. **Use `kb_delete` sparingly.** Delete only when the removal is intentional and dependencies are understood.
9. **Rebuild local Kibi artifacts after version changes in this repo.** This repository dogfoods local `kibi-mcp` and `kibi-opencode` builds for OpenCode, so after changing package versions or local package wiring, run `bun run build` before relying on OpenCode here.

### Strict Fact Authoring Heuristic

- If a requirement is normative and should participate in contradiction blocking, model it with:
  - a `fact_kind: subject` fact linked via `constrains`
  - a `fact_kind: property_value` fact linked via `requires_property`
- If the knowledge is runtime evidence, historical context, governance commentary, or a bug record, use `observation` or `meta` facts instead.
- New requirement semantics should evolve append-only: create a new req and link it with `supersedes`.
- Reject-on-write contradiction checks use this strict lane and treat `supersedes` as the supported escape hatch.
- Legacy prose facts may remain during migration, but `strict-fact-shape` should be treated as an explicit, **default-off** migration rule, not an always-on requirement for old repos. `domain-contradictions` applies only to strict-lane facts.
- Use `docs/modeling-cheatsheet.md` when choosing an entity type, fact lane, or relationship. For `kb_upsert.properties`, typed fact fields are snake_case only: `subject_key`, `property_key`, `predicate_name`, `predicate_args`, `canonical_key`, `closed_world`, `value_type`, and one typed `value_*` field.
- If a validation error mentions additional properties, fix the payload using `docs/error-reference.md` instead of falling back to prose-only `links` or `text_ref`.

### Canonical Authoring Pattern: Separate REQ, SCEN, TEST Entities

**Valid Example (Golden Path):**

```yaml
# documentation/requirements/REQ-001.md
---
id: REQ-001
title: User authentication
status: open
links:
  - type: specified_by
    target: SCEN-001
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
links:
  - type: validates
    target: SCEN-001
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

Plain string Markdown `links` entries are still valid, but they import as
generic `relates_to` edges only. Use typed `links` objects or relationship rows
when semantic relationships matter.

> **Rule:** Do NOT embed scenarios or tests inside requirement records. Always create separate files for each entity and link them using explicit typed `links` entries or relationship rows. Plain string `links` are generic `relates_to` only.

## Public MCP Surface

The Kibi MCP server exposes a curated public tool surface:

- \`kb_autopilot_generate\` (Preferred for day-0 bootstrap)
- \`kb_search\`
- \`kb_query\`
- `kb_status`
- `kb_find_gaps`
- `kb_coverage`
- `kb_graph`
- `kb_upsert`
- `kb_delete`
- `kb_check`
- `kb_skills_list`
- `kb_skills_load`
- `kb_skills_read`
> **Skill Guidance:** Canonical Kibi usage guidance is available as a bundled skill. Call `kb_skills_load` with `id: "kibi-usage"` to retrieve the latest agent rules, modeling heuristics, and workflow constraints. Skills are bundled only; remote install and script execution are not supported in v1.

For retroactive bootstrap on existing repos, use `/init-kibi` in OpenCode. If further setup or repair is needed, ask the user/operator to handle it outside the agent session.

Allowed enum values for entity types, relationship types, and validation rules are encoded directly in each tool's `inputSchema`.

## Querying Best Practices

When you need information about the project:

1. Use `kb_query` with `type` when you know the entity kind.
2. Use `kb_query` with `id` for exact lookups.
3. Use `kb_search` for exploratory discovery across metadata and markdown body text.
   - **Decompose broad tasks**: Split multi-intent queries into 1-3 focused probes (e.g., split "Apple Sign-In RevenueCat recovery" into "Apple Sign-In", "RevenueCat", and "recovery").
   - **Inspect top hits**: Review search relevance before concluding KB lacks knowledge.
4. Use `kb_query` with `tags` or `sourceFile` for precise follow-up once you know what to inspect.
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
   - `specified_by` for requirement -> scenario (Canonical)
   - `verified_by` or `validates` for requirement/test or scenario/test links
   - `implements` for production symbol -> requirement (Ownership)
   - `covered_by` for production symbol -> test (Coverage) spinning off requirements/scenarios
   - `executable_for` for test symbol -> test entity (Identity)
   - `constrains` and `requires_property` for requirement/fact modeling

**Important:** Execute `kb_upsert` calls sequentially. Do not fire in parallel to avoid lock contention.

### Test/E2E Traceability: Manifest-Based Workflow

For test and e2e symbols, the preferred traceability workflow uses durable KB relationships instead of inline code comments:

1. **Model the code as a symbol** in `documentation/symbols.yaml` (or the configured symbol manifest), with `sourceFile` pointing at the test/e2e file. Physical symbol coordinates (line/character) are maintained in `documentation/symbol-coordinates.yaml`.
2. **Link symbol → test** using an `executable_for` relationship row during `kb_upsert` to establish its identity as test code.
3. **Ensure the test entity is linked** to a requirement or scenario (canonical: `REQ-xxx` → `SCEN-xxx` → `TEST-xxx`).

This manifest-based approach keeps traceability in the KB where it can be queried and validated, avoiding comment churn in test files.

Inline `// implements REQ-xxx` comments remain **optional and backward-compatible**, especially useful for quick code-only changes, but they are not the preferred path for test/e2e symbols.

> **Scope note:** Automatic extraction of framework-specific `test()` or `it()` callbacks is out of scope for staged validation. Only explicitly modeled symbols participate in the traceability check.

## Anti-Patterns

Avoid these common mistakes:

- **Don't call `kb_check` without rules during iteration** - Full validation is slow; only run when needed or with specific rules.
- **Don't fire `kb_upsert` in parallel** - This causes lock contention. Always execute upserts sequentially.
- **Don't use tags as multi-ID lookup** - Tags are for categorization, not for querying multiple specific entities.
- **Don't create relationships to non-existent entities** - Always confirm target entities exist before linking.
- **Don't use `relates_to` for contradiction-safe requirement/fact modeling** - use `constrains` and `requires_property`.

## Before Starting Work

1. Discover related requirements, ADRs, tests, and symbols with `kb_search`. Decompose broad tasks into focused probes (e.g., "Apple Sign-In", "RevenueCat").
2. Confirm exact entities with `kb_query`.
3. Identify which entities will need creation or updates.
4. Confirm exact IDs and relationship endpoints before writing.

## During Development

1. Create entities as you go with `kb_upsert` (sequentially).
2. Maintain relationships continuously instead of batch-fixing them later.
3. Run `kb_check` after significant structural changes.

## Task Completion Contract

Every implementation task that modifies source code, tests, requirements, scenarios,
symbols, ADRs, facts, or flags MUST end with one of:

1. **KB updated**: Source-linked discovery via `kb_search`, followed by `kb_query` with
   `sourceFile`, followed by `kb_upsert`/`kb_delete` for required mutations, then `kb_check`.
2. **No KB impact**: Include a structured rationale in the final report after source-linked
   discovery via `kb_search`/`kb_query(sourceFile=...)` and `kb_check`.
3. **Deferred/Failed**: Explicitly note that KB freshness cannot be resolved in this task.

The plugin surfaces a `🧠 **Kibi freshness required**` block when KB impact is
unresolved. This block lists changed files, missing evidence, and resolution steps.

## After Completing Work

1. Run `kb_check`.
2. Summarize which entities were created, updated, or deleted.
3. Call out any remaining KB follow-up work explicitly.

## Common Patterns

### Creating a New Feature

```text
1. Use kb_search to discover existing requirements and related knowledge
2. Use kb_query to confirm exact IDs and source-linked context
3. Create or update requirements via kb_upsert (include relationship rows)
4. Run kb_check
```

### Investigating an Issue

```text
1. Use kb_search to discover related requirements, ADRs, symbols, and tests
2. Use kb_query to confirm exact follow-up targets
3. Apply the smallest safe kb_upsert or kb_delete
4. Run kb_check
```

### Refactoring Code

```text
1. Discover symbol and requirement context with kb_search
2. Confirm exact symbol and requirement targets with kb_query
3. Update symbol entities and links via kb_upsert
4. Run kb_check
```

### Entity Choice for Bug and Workaround Documentation

**Flag is for runtime/config gating only:** The `flag` entity represents a runtime or config gate (feature flags, kill-switches, deferred capabilities). Do NOT create a `flag` for bugs or workarounds unless there is an actual gate controlling access.

**Bug/workaround notes belong in observation/meta facts:** When documenting bugs, incidents, or workarounds, use a `fact` entity with `fact_kind: observation` or `meta`. These fact kinds are excluded from contradiction inference, making them appropriate for non-blocking evidence. Do NOT use a `flag` entity for observation or meta facts. **Strict facts** (subject, property_value) are reserved for contradiction-safe modeling.

**Canonical mapping:**
- `flag` = runtime/config gate (NOT for bug records)
- `fact` (observation/meta) = bug records, incident notes, workarounds
- `req` = intended/corrected behavior
- `test` = executable verification
- `adr` = durable design rationale
