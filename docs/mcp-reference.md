# MCP Server Reference

The Kibi Model Context Protocol (MCP) server is the primary interface for LLM agents. The server operates over `stdio` and receives JSON-RPC 2.0 requests.

## Public Tools

The public MCP surface is intentionally curated. Agents can call exact lookup, discovery/reporting, mutation, and validation tools through MCP.

### `kb_autopilot_generate`

Discover existing repository entities and bootstrap the KB via read-only candidate synthesis. Use this as the backend for the interactive `/init-kibi` onboarding workflow.

**Parameters:**
- `limit` (optional): Max results per entity type
- `include` (optional): Filter by file pattern

**Returns:**
Grouped candidate entities synthesized from declared context and codebase evidence. Candidates must be explicitly applied via `kb_upsert` after user preview and approval.

## Repository Ignore Policy

Kibi's discovery and autopilot generation honor repository-local Git ignore rules to avoid treating build artifacts, editor state, and tool caches as domain knowledge. During read-only discovery (for example `kb_autopilot_generate` and `kb_briefing_generate`) and other file-based inference, Kibi will exclude files and directories matched by the repository ignore policy:

- repository root `.gitignore` files and nested `.gitignore` files in subdirectories
- `.git/info/exclude`

In addition to these repository-configured ignores, Kibi hard-denies a set of common tool/runtime directories that are never inspected for candidates:

- `.sisyphus/**`
- `.opencode/**`
- `.kb/**`
- `.git/**`
- `node_modules/**`
- `vendor/**`
- `third_party/**`

Notes and v1 limitations:

- Global Git excludes (for example `~/.config/git/ignore`) are not read or honored in Kibi v1.
- Kibi v1 does not perform automatic cleanup or migration of existing KB entities that may have been created from files that are now ignored; removing previously-recorded entities is out of scope for this release.
- No new project configuration schema is introduced in v1 to alter this behavior. Future releases may expose finer-grained controls.

When using discovery tools, agents and operators should assume that ignored paths are not considered as evidence for candidate entities and that any candidates requiring approval will come from non-ignored sources only.

### `kb_briefing_generate`

Generate a deterministic, read-only, start-task briefing from task text, source files, and seed IDs.

**Parameters:**
- `taskText` (optional): Task description used to rank relevant cited entities
- `sourceFiles` (optional): Source-file paths used to gather cited entities
- `seedIds` (optional): Seed entity IDs used to anchor the briefing

At least one of `taskText`, `sourceFiles`, or `seedIds` must be non-empty.

**Returns:**
A structured briefing with `briefingState`, `activationState`, `activationReason`, `freshness`, `confidence`, `tldr`, `promptBlock`, `entities`, `constraints`, `regressionRisks`, `missingEvidence`, and `citations`.

When evidence is insufficient, the tool fails closed with `briefingState: "no_briefing"` and no speculative sections.

### `kb_model_requirement`

Model a normative requirement claim into a deterministic strict write-set for contradiction-ready KB persistence. Accepts an LLM-supplied semantic claim (or falls back to heuristic extraction from a plain statement) and returns a ready-to-apply plan of `req` + `fact` entities with typed `constrains`/`requires_property` relationships.

High-confidence claims (≥ 0.7) produce a strict write-set: one `req`, one `fact_kind: subject`, one `fact_kind: property_value`, and two typed relationships. Low-confidence claims (< 0.7) produce a single `fact_kind: observation` artifact that does not enter the contradiction lane.

**Parameters:**
- `statement` (required): Plain-language normative statement to model
- `claim` (optional): Explicit `SemanticClaim` object with `subjectKey`, `propertyKey`, `operator`, `value`, `confidence`, and `sourceRef` fields. When provided, heuristic extraction is skipped.

**Returns:**
A `writeSet` discriminated union:
- `isStrict: true` — includes `req`, `subjectFact`, `propertyFact`, `relationships`, and an `applyPlan` ready for sequential `kb_upsert` calls.
- `isStrict: false` — includes a single `observationFact` for non-normative or low-confidence input.

Also returns `migrationWarning` (non-null when the workspace KB schema is outdated) and `schemaVersionStatus` for pre-flight awareness.

Human approval is not required. The write-set is deterministic and idempotent — the same claim always produces the same stable entity IDs (SHA-256 of normalized source/subject/property/operator/value). Apply via sequential `kb_upsert` calls at any time.


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

**Example:**
```json
{
  "type": "req",
  "sourceFile": "src/auth/login.ts",
  "limit": 20
}
```

### `kb_search`

Search entities by metadata and markdown body text for exploratory discovery.

**Parameters:**
- `query` (required): Free-text query
- `type` (optional): Entity type filter
- `limit` (optional): Maximum number of ranked results
- `offset` (optional): Number of results to skip

**Returns:**
Ranked results with match reasons and optional snippets.

**Example:**
```json
{
  "query": "login flow",
  "type": "req",
  "limit": 10
}
```

### `kb_status`

Return branch, snapshot, and freshness metadata for the attached KB.

**Returns:**
Branch name, snapshot ID, sync state, dirty flag, and KB path metadata.

**Example:**
```json
{}
```

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

**Example:**
```json
{
  "type": "req",
  "missingRelationships": ["specified_by", "verified_by"],
  "sourceFile": "src/auth"
}
```

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

**Example:**
```json
{
  "by": "req",
  "includePassing": false,
  "includeTransitive": true
}
```

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

**Example:**
```json
{
  "seedIds": ["REQ-001"],
  "direction": "both",
  "depth": 2,
  "maxNodes": 100,
  "maxEdges": 200
}
```

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
- `rules` (optional): Validation rule subset (`must-priority-coverage`, `symbol-coverage`, `symbol-traceability`, `no-dangling-refs`, `no-cycles`, `required-fields`, `deprecated-adr-no-successor`, `domain-contradictions`, `strict-fact-shape`, `strict-req-fact-pairing`). Note: `strict-fact-shape` and `strict-req-fact-pairing` are migration checks and are disabled by default. `domain-contradictions` applies only to strict-lane facts.

**Returns:**
Validation report with any violations found and suggested fixes.

## Discoverability

- MCP clients discover available tools through `tools/list`.
- MCP clients discover available prompts through `prompts/list` and `prompts/get`.
- Allowed static values are encoded directly in each tool's `inputSchema` enums.
- There are no separate runtime listing tools for entity or relationship types.

## Public Prompts

### `/init-kibi`

Interactive onboarding workflow for day-0 KB activation. It guides agents to ask at most 4 bounded questions to gather declared context, call `kb_autopilot_generate` for read-only synthesis, present a preview for user approval, and perform sequential `kb_upsert` followed by `kb_check`.

### `/brief-kibi`

Use this prompt at task start when you need a briefing grounded in current KB evidence. It instructs agents to call `kb_briefing_generate`, inspect `briefingState`, and use only cited output. If the result is `no_briefing`, the prompt tells agents not to invent briefing claims.

## Branch Behavior

- The server attaches to the active git branch automatically at startup.
- If the active branch KB does not exist, the server copies from the previously active branch KB when available; otherwise it creates an empty branch KB.
- Branch KBs are revalidated and updated automatically on branch change—no server restart is required for normal branch operations.
- You can override the branch selection by setting the `KIBI_BRANCH` environment variable before starting the server.
- Branch garbage collection is not part of the public MCP interface. Use `kibi gc` or automation hooks instead.

## Recommended Agent Workflow

1. **Interactive Bootstrap**: Start with the `/init-kibi` workflow to gather declared context and synthesize entities. Always preview candidates for user approval before applying.
2. **Start-task Briefing**: Use `kb_briefing_generate` or `/brief-kibi` when you need a citation-backed briefing before risky work.
3. **Gather Context**: Use `kb_search` for discovery (decomposing broad tasks into focused probes) and `kb_query` for exact follow-up.
4. **Inspect Freshness**: Use `kb_status` when branch or stale-state confidence matters.
5. **Analyze**: Use `kb_find_gaps`, `kb_coverage`, and `kb_graph` for curated reporting.
6. **Execute Changes**: Use `kb_upsert` to create/update entities and relationships.
7. **Validate**: Run `kb_check` after structural changes.
8. **Clean Up**: Use `kb_delete` only for intentional removals after validating dependencies.

**Modeling note:** Use `flag` for runtime/config gates. Bug and workaround notes belong in `fact` entities, usually with `fact_kind: observation` or `meta`. **Strict facts** drive contradiction checks; observation/meta are non-blocking notes.
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
