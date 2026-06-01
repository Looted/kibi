# MCP Server Reference

The Kibi Model Context Protocol (MCP) server is the primary interface for LLM agents. The server operates over `stdio` and receives JSON-RPC 2.0 requests.

## Public Tools

The public MCP surface is intentionally curated. Agents can call exact lookup, discovery/reporting, mutation, and validation tools through MCP.

### Host-visible tool names

The canonical MCP names in this reference use the `kb_*` form. Some hosts display tools with the configured MCP server name prefixed. In OpenCode, the same tools commonly appear as `kibi_kb_search`, `kibi_kb_query`, `kibi_kb_upsert`, `kibi_kb_check`, and `kibi_kb_autopilot_generate`. Use the host-visible prefixed name when an agent must reference an exact tool identifier; the semantics are identical to the canonical `kb_*` names documented here.

### `kb_autopilot_generate`

Discover existing repository entities and bootstrap the KB via read-only candidate synthesis. Use this as the backend for the interactive `/init-kibi` onboarding workflow.

**Parameters:**
- `includeGenericMarkdown` (optional): Include generic Markdown content as candidate evidence.
- `minConfidence` (optional): Minimum confidence threshold for generated candidates.
- `maxCandidates` (optional): Maximum number of candidates to return.
- `entityTypes` (optional): Limit generation to selected entity types.
- `bootstrapContext` (optional): Declared project summary, source-of-truth paths/notes, priority roots, and verification anchors.

**Returns:**
Grouped candidate entities synthesized from declared context and codebase evidence, plus `structuredContent.applyPlan`: the exact sequential `kb_upsert` payloads for those candidates. Candidates must be explicitly previewed and approved by the user before applying the plan.

## Repository Ignore Policy

During read-only discovery (for example `kb_autopilot_generate`) and other file-based inference, Kibi will exclude files and directories matched by the repository ignore policy:

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

Notes and migration limitations:

- Global Git excludes (for example `~/.config/git/ignore`) are not read or honored.
- When MCP tools return a non-null migration warning, run `kibi migrate --dry-run`, then `kibi migrate --yes` before relying on strict checks or automated writes.
- Symbol granularity migration marks existing coarse file/module links as `legacy-link`; new MCP `kb_upsert` calls must target the narrow function, class method (`ClassName.methodName`), class, interface, type, or enum symbol, or provide an explicit `granularity_reason`.

When using discovery tools, agents and operators should assume that ignored paths are not considered as evidence for candidate entities and that any candidates requiring approval will come from non-ignored sources only.

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


### `kb_suggest_predicates`

Suggest ontology predicate candidates for a prose requirement before an agent writes freeform ontology notes. Agents should spell out the requirement claim, call this tool, then either apply a returned `fact_kind: predicate` plan linked with `requires_predicate` or record the returned `review:ontology-gap` observation when no predicate fits.

The tool ranks project-local `fact_kind: predicate_schema` facts when available and falls back to Kibi's built-in predicate catalog covering state transitions, guards, persistence/save/discard behavior, accessibility, retention, resource constraints, feature gates, and events.

**Parameters:**
- `text` (required): Prose requirement or claim to classify into ontology predicates.
- `requirementId` (optional): Existing requirement ID. When present, the response includes a `relationshipPlan` describing the `requires_predicate` link to attach after preserving existing requirement metadata.
- `source` (optional): Provenance/text reference for generated predicate facts or ontology-gap observations.
- `subjectHint` (optional): Canonical subject key to use as the first predicate argument.
- `maxCandidates` (optional): Maximum ranked predicate candidates to return.
- `minScore` (optional): Minimum candidate score; higher values make ontology-gap fallback more likely.
- `includeExistingSchemas` (optional): Include project-local predicate schema facts alongside built-ins.

**Returns:**
- `candidates`: Ranked predicate suggestions with schema signature, ordered `predicate_args`, `canonical_key`, score, and rationale.
- `recommendedAction`: `apply_requires_predicate` when a candidate fits, otherwise `record_ontology_gap`.
- `structuredContent.applyPlan`: A ready-to-apply `kb_upsert` payload for the top predicate fact, or an explicit `fact_kind: observation` tagged `review:ontology-gap` and `needs_schema_extension`.
- `structuredContent.relationshipPlan`: When `requirementId` is supplied and a predicate fits, the req -> fact `requires_predicate` link to attach after querying/preserving the existing requirement entity. This is separate from `applyPlan` so the tool never emits a foreign-source relationship that `kb_upsert` would reject.

**Example:**
```json
{
  "text": "When the user navigates away with unsaved annotation edits, the editor must auto-save the draft and return to idle mode.",
  "requirementId": "REQ-EDITOR-004",
  "source": "requirements/editor.md#L12",
  "subjectHint": "editor.annotation"
}
```


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

MK|### `kb_skills_list`
XZ|
PW|List bundled Kibi agent skills available for progressive disclosure. Read-only; does not mutate the KB or require Prolog.
QW|
RH|**Parameters:**
ZJ|- None
QW|
KQ|**Returns:**
JP|Array of skill manifests with `id`, `name`, `version`, `description`, and declared `resources`.
MS|
TH|**Example:**
YP|```json
TT|{}
TV|```
NJ|
BN|### `kb_skills_load`
HT|
YK|Load a bundled Kibi agent skill by ID, returning its manifest metadata, Markdown body, declared resources, content hash, and source type. Read-only; does not execute scripts or require Prolog.
YQ|
RH|**Parameters:**
ZV|- `id` (required): Bundled skill ID to load. Example: `'kibi-usage'`.
XY|
KQ|**Returns:**
SB|Skill bundle with `manifest`, `body`, `resources`, `hash`, and `sourceType`.
BQ|
TH|**Example:**
YP|```json
TY|{
RN|  "id": "kibi-usage"
MJ|}
HP|```
SH|
WV|### `kb_skills_read`
VH|
YX|Read a declared resource from a bundled Kibi agent skill. Resource paths are restricted to the skill manifest; arbitrary file paths are not exposed. Read-only; does not require Prolog.
PX|
RH|**Parameters:**
VZ|- `id` (required): Bundled skill ID. Example: `'kibi-usage'`.
KQ|- `resource` (required): Manifest-declared resource path to read. Example: `'resources/fact-lanes.md'`.
YY|
KQ|**Returns:**
VZ|Resource contents as text.
BM|
TH|**Example:**
YP|```json
TT|{
TV|  "id": "kibi-usage",
BQ|  "resource": "resources/fact-lanes.md"
SZ|}
YN|
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
- `properties`: Entity fields, including required `title` and `status` (status values depend on entity type; legacy values may still be accepted for compatibility). For `fact` entities this includes typed fact fields such as `fact_kind`, `subject_key`, `property_key`, `operator`, `value_type`, and one matching `value_*` field.
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

## Branch Behavior

- The server attaches to the active git branch automatically at startup.
- If the active branch KB does not exist, the server copies from the previously active branch KB when available; otherwise it creates an empty branch KB.
- Branch KBs are revalidated and updated automatically on branch change—no server restart is required for normal branch operations.
- You can override the branch selection by setting the `KIBI_BRANCH` environment variable before starting the server.
- Branch garbage collection is not part of the public MCP interface. Use `kibi gc` or automation hooks instead.

## Recommended Agent Workflow

1. **Interactive Bootstrap**: Start with the `/init-kibi` workflow to gather declared context and synthesize entities. Always preview candidates for user approval before applying.
2. **Gather Context**: Use `kb_search` for discovery (decomposing broad tasks into focused probes) and `kb_query` for exact follow-up.
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
