# MCP Server Reference

The Kibi Model Context Protocol (MCP) server is the primary interface for LLM agents. The server operates over `stdio` and receives JSON-RPC 2.0 requests.

## Public Tools

The public MCP surface is intentionally curated. Agents can call exact lookup, discovery/reporting, mutation, and validation tools through MCP.

### `kb_query`

Retrieve entities by `type`, `id`, `tags`, or `sourceFile`. Supports limit and offset pagination.

**Parameters:**
- `type` (optional): Entity type (`req`, `scenario`, `test`, `adr`, `flag`, `event`, `symbol`, `fact`)
- `id` (optional): Entity ID (exact match)
- `tags` (optional): Tag list for filtering
- `sourceFile` (optional): Source-file substring filter
- `limit` (optional): Maximum number of results
- `offset` (optional): Number of results to skip

**Returns:**
Array of matching entities with deterministic ordering.

### `kb_search`

Search entities by metadata and markdown body text for exploratory discovery.

**Parameters:**
- `query` (required): Free-text query
- `type` (optional): Entity type filter
- `limit` (optional): Maximum number of ranked results
- `offset` (optional): Number of results to skip

**Returns:**
Ranked results with match reasons and optional snippets.

### `kb_status`

Return branch, snapshot, and freshness metadata for the attached KB.

**Returns:**
Branch name, snapshot ID, sync state, dirty flag, and KB path metadata.

### `kb_find_gaps`

Run curated missing/present relationship analysis over KB entities.

**Parameters:**
- `type` (optional): Entity type filter
- `missingRelationships` (optional): Required-to-be-absent relationship types
- `presentRelationships` (optional): Required-to-be-present relationship types
- `tags` (optional): Tag filter
- `sourceFile` (optional): Source-file substring filter
- `limit` / `offset` (optional): Pagination controls

**Returns:**
Matching rows, relationship counts, and status metadata.

### `kb_coverage`

Generate curated coverage reports.

**Parameters:**
- `by` (optional): `req`, `symbol`, or `type`
- `tags` (optional): Tag filter
- `includePassing` (optional): Include fully covered rows in report contexts that support it
- `includeTransitive` (optional): Include transitive symbol coverage
- `limit` / `offset` (optional): Pagination controls

**Returns:**
Coverage summary rows and status metadata.

For requirement coverage, summaries distinguish evaluated must-priority requirements from rows marked `notApplicable`.

### `kb_graph`

Run bounded graph traversal from one or more seed IDs.

**Parameters:**
- `seedIds` (required): Starting IDs
- `relationships` (optional): Relationship filter
- `direction` (optional): `outgoing`, `incoming`, or `both`
- `depth` (optional): Maximum traversal depth
- `entityTypes` (optional): Filter returned nodes by type
- `maxNodes` / `maxEdges` (optional): Traversal bounds

**Returns:**
Nodes, edges, truncation flag, and status metadata.

### `kb_upsert`

Create or update a single entity and optional relationships in one call.

**Parameters:**
- `type`: Entity type enum
- `id`: Entity ID
- `properties`: Entity fields, including required `title` and `status` (status values depend on entity type; legacy values may still be accepted for compatibility)
- `relationships` (optional): Relationship rows with enum-backed `type`, `from`, and `to`

**Returns:**
Confirmation of entity creation/update and relationship creation counts.

### `kb_delete`

Delete one or more entities by ID. Deletion is blocked when dependents still reference the target.

**Parameters:**
- `ids`: Array of entity IDs to delete

**Returns:**
Confirmation of deletion, or an error describing blocked dependents.

### `kb_check`

Run KB validation rules after mutations.

**Parameters:**
- `rules` (optional): Validation rule subset (`must-priority-coverage`, `no-dangling-refs`, `no-cycles`, `required-fields`, `symbol-coverage`)

**Returns:**
Validation report with any violations found and suggested fixes.

## Discoverability

- MCP clients discover available tools through `tools/list`.
- Allowed static values are encoded directly in each tool's `inputSchema` enums.
- There are no separate runtime listing tools for entity or relationship types.

## Branch Behavior

- The server attaches to the active git branch automatically at startup.
- If the active branch KB does not exist, the server attempts to create it from an existing template branch KB (`develop` first, then `main`).
- Branch KBs are revalidated and updated automatically on branch change—no server restart is required for normal branch operations.
- You can override the branch selection by setting the `KIBI_BRANCH` environment variable before starting the server.
- Branch garbage collection is not part of the public MCP interface. Use `kibi gc` or automation hooks instead.

## Recommended Agent Workflow

1. **Gather Context**: Use `kb_search` for discovery and `kb_query` for exact follow-up.
2. **Inspect Freshness**: Use `kb_status` when branch or stale-state confidence matters.
3. **Analyze**: Use `kb_find_gaps`, `kb_coverage`, and `kb_graph` for curated reporting.
4. **Execute Changes**: Use `kb_upsert` to create/update entities and relationships.
5. **Validate**: Run `kb_check` after structural changes.
6. **Clean Up**: Use `kb_delete` only for intentional removals after validating dependencies.

## Error Handling

The MCP server returns structured errors for:
- Invalid parameters (missing required fields, invalid enum values)
- Referential integrity violations (attempting to delete entities with dependents)
- Branch KB startup/attach failures
- Validation failures

Always check error responses before proceeding with more mutations.

## Determinism Guarantees

- Query results are sorted and de-duplicated for consistency
- MCP responses use explicit field names and fixed shapes
- Validation output is stable across repeated runs on unchanged KB state
