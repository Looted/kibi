# MCP Server Reference

The Kibi Model Context Protocol (MCP) server is the primary interface for LLM agents. The server operates over `stdio` and receives JSON-RPC 2.0 requests.

## Core Tools

### `kb_query`

Retrieve entities by `type`, `id`, or `tags`. Supports limit and offset pagination.

**Parameters:**
- `branch` (optional): Branch name for branch-aware operations
- `type` (optional): Entity type (`req`, `scenario`, `test`, `adr`, `flag`, `event`, `symbol`, `fact`)
- `id` (optional): Entity ID (exact match)
- `tag` (optional): Tag for filtering
- `limit` (optional): Maximum number of results
- `offset` (optional): Number of results to skip

**Returns:**
Array of entities matching the query criteria.

### `kb_upsert`

Create or update an entity and simultaneously assert relationships. The LLM should provide the full `properties` map (auto-filling timestamps if omitted).

**Parameters:**
- `branch` (optional): Branch name for branch-aware operations
- `entity`: Entity object with required fields (`id`, `title`, `status`, `created_at`, `updated_at`, `source`) and optional fields (`tags`, `owner`, `priority`, `severity`, `links`, `text_ref`)
- `relationships` (optional): Array of relationship objects with `type`, `source`, `target`, `created_at`, `created_by`, `source`

**Returns:**
Confirmation of the upsert operation.

### `kb_delete`

Deletes an entity. This tool prevents deletion if an entity has dependents (referential integrity check).

**Parameters:**
- `branch` (optional): Branch name for branch-aware operations
- `id`: Entity ID to delete

**Returns:**
Confirmation of the delete operation, or error if entity has dependents.

### `kb_check`

Runs all internal validation rules (`must-priority-coverage`, `no-dangling-refs`, `no-cycles`, `required-fields`). The LLM should always run this after large upserts.

**Parameters:**
- `branch` (optional): Branch name for branch-aware operations

**Returns:**
Validation report with any violations found and suggestions for fixing them.

### `kb_query_relationships`

Allows searching specifically for relationships by `from`, `to`, or `type`.

**Parameters:**
- `branch` (optional): Branch name for branch-aware operations
- `from` (optional): Source entity ID
- `to` (optional): Target entity ID
- `type` (optional): Relationship type
- `limit` (optional): Maximum number of results

**Returns:**
Array of relationships matching the query criteria.

### `kb_branch_ensure`

Ensure a branch KB exists. If the branch is new, creates a snapshot from `main`.

**Parameters:**
- `branch`: Branch name to ensure

**Returns:**
Confirmation that the branch KB exists.

### `kb_branch_gc`

Garbage collect branch KBs that have been merged or deleted in git.

**Parameters:**
- `dry_run` (optional): If true, only list stale branches without deleting
- `branch` (optional): Specific branch to check

**Returns:**
List of branches that would be garbage collected, or confirmation of deletion.

## Inference Tools

### `kb_derive`

Generic inference endpoint for running derived predicates.

**Parameters:**
- `branch` (optional): Branch name for branch-aware operations
- `rule`: Rule name to run (see supported rules below)
- `params`: Rule-specific parameters

**Supported Rules:**
- `transitively_implements`: Returns symbols transitively implementing a requirement
- `transitively_depends`: Returns requirements transitively depending on another
- `impacted_by_change`: Returns entities impacted by a change to another entity
- `affected_symbols`: Returns symbols implementing a requirement (including transitive dependencies)
- `coverage_gap`: Evaluates coverage gaps for MUST requirements
- `untested_symbols`: Returns symbols without test coverage
- `stale`: Returns entities not updated recently
- `orphaned`: Returns symbols with no implementation or test links
- `conflicting`: Returns ADR pairs constraining the same symbol
- `deprecated_still_used`: Returns deprecated ADRs still constraining symbols
- `current_adr`: Returns all currently active ADRs
- `adr_chain`: Returns full temporal chain from an ADR to current
- `superseded_by`: Returns direct successor for an ADR
- `domain_contradictions`: Returns contradictory requirements

**Returns:**
Structured content with rule results, including count, rows, and provenance.

### `kb_impact`

Shorthand for impact analysis. Returns all entities impacted by a change to a specific entity.

**Parameters:**
- `branch` (optional): Branch name for branch-aware operations
- `entity`: Entity ID to analyze impact for

**Returns:**
Impact report with `entity`, `impacted` (sorted list of `{id, type}`), `count`, and `provenance`.

### `kb_coverage_report`

Aggregate coverage rollup for requirements or symbols.

**Parameters:**
- `branch` (optional): Branch name for branch-aware operations
- `type` (optional): Entity type (`req`, `symbol`, or all)

**Returns:**
Coverage report with totals, gap reasons, untested symbol IDs, and provenance predicates.

### `kb_current_adr`

Returns all current (non-superseded) ADRs.

**Parameters:**
- `branch` (optional): Branch name for branch-aware operations

**Returns:**
List of current ADRs with `id`, `title`, and other metadata.

### `kb_adr_chain`

Returns full temporal chain from a starting ADR to the current one.

**Parameters:**
- `branch` (optional): Branch name for branch-aware operations
- `adr`: ADR ID to start chain from

**Returns:**
Ordered chain of ADRs from the starting ADR to the current one, with statuses.

### `kb_superseded_by`

Returns direct successor for an ADR.

**Parameters:**
- `branch` (optional): Branch name for branch-aware operations
- `adr`: ADR ID to find successor for

**Returns:**
Successor ADR information with `successor_id` and `successor_title`.

## Recommended Agent Workflow

1. **Gather Context**: Use `kb_query` to read existing Requirements (`req`) or architectural decisions (`adr`) related to the user's task.
2. **Execute Changes**: Write new code or documentation, and call `kb_upsert` to register new `symbol` or `test` entities.
3. **Validate**: Call `kb_check` to ensure the new entities don't introduce cycle dependencies or dangling references.

## Branch-Aware Operations

All MCP tools support a `branch` parameter for branch-aware operations. If not provided, the server defaults to the current git branch.

To force a specific branch, set the `branch` parameter:
```json
{
  "branch": "feature-x",
  "type": "req"
}
```

Or set the `KIBI_BRANCH` environment variable when starting the `kibi-mcp` server:
```bash
KIBI_BRANCH=feature-x kibi-mcp
```

## Error Handling

The MCP server returns structured errors for:
- Invalid parameters (missing required fields, invalid types)
- Referential integrity violations (attempting to delete entities with dependents)
- Branch not found errors
- Validation failures

Always check error responses and handle them gracefully before proceeding with operations.

## Determinism Guarantees

- All query results are sorted and de-duplicated for consistency
- MCP responses include explicit field names and fixed shapes
- Aggregate and report outputs are sorted before returning
- The LLM can rely on stable ordering across repeated calls
