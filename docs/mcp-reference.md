# MCP Server Reference

The Kibi Model Context Protocol (MCP) server is a peer public interface alongside the CLI's 18 dedicated JSON routes. It serves MCP-capable agents over `stdio` and receives JSON-RPC 2.0 requests; operation schemas and executors are shared with the CLI.

## Public Tools

The public MCP surface is intentionally curated. Agents can call exact lookup, discovery/reporting, mutation, and validation tools through MCP, with equivalent operation access through `kibi <route> --input <file|->`.

### Host-visible tool names

The canonical MCP names in this reference use the `kb_*` form. Some hosts display tools with the configured MCP server name prefixed. In OpenCode, the same tools commonly appear as `kibi_kb_search`, `kibi_kb_query`, `kibi_kb_upsert`, `kibi_kb_check`, and `kibi_kb_autopilot_generate`. Use the host-visible prefixed name when an agent must reference an exact tool identifier; the semantics are identical to the canonical `kb_*` names documented here.

### Generic-agent onboarding

MCP-capable agents should use the standard `tools/list` capability discovery step, then follow Kibi's progressive-disclosure path instead of assuming that a package `skills/` directory is loaded by the host:

1. Call `kb_skills_list` to obtain the bundled skill manifests.
2. Call `kb_skills_load` with a returned ID, normally `kibi-usage` for general Kibi workflow guidance.
3. Call `kb_skills_read` only for resource paths declared by that manifest.

These skill operations are local, read-only, and do not require Prolog. They return a human-readable `content` item plus structured data for clients that support structured tool results. Their MCP registrations advertise `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, and `openWorldHint: false` as client-facing behavior hints. Clients must treat annotations and skill text as untrusted guidance: authorization, schema validation, approval gates, and mutation sequencing remain enforced by the server and repository workflow.

The CLI is a peer surface with the same skill operations through structured JSON routes (select by what the host exposes):

```bash
printf '%s\n' '{}' | kibi skills-list --input -
printf '%s\n' '{"id":"kibi-usage"}' | kibi skills-load --input -
printf '%s\n' '{"id":"kibi-usage","resource":"resources/workflows.md"}' | kibi skills-read --input -
```

If neither a visible Kibi MCP surface nor a trusted local CLI is available, the agent must stop and ask the operator to enable one; it must not infer availability from configuration files or read `.kb/` directly.

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
- Symbol granularity migration marks existing coarse file/module links as `legacy-link`; new MCP `kb_upsert` calls must target the narrow behavioral symbol when one exists, or provide an explicit `granularity_reason`. Interfaces, type aliases, and enums are `type-shape` symbols and do not by themselves block a coarse behavioral link.

When using discovery tools, agents and operators should assume that ignored paths are not considered as evidence for candidate entities and that any candidates requiring approval will come from non-ignored sources only.

## Semantic Modeling Quick Path

When prose contains a machine-checkable rule, do not store it only in `text_ref` or freeform `links`. Use the concise decision tree in `docs/modeling-cheatsheet.md`.

1. Call `kb_semantic_advisor` with the complete body when starting from raw prose, or run `kb_validate_upsert` before `kb_upsert` for new or updated normative requirements. Verify the returned atomic clause inventory; supply `clauses` when automatic decomposition is incomplete.
2. For property/value requirements, call `kb_model_requirement` or create a `fact_kind: subject` fact plus a `fact_kind: property_value` fact. Link the requirement with `constrains` and `requires_property`.
3. Model every normative clause: use `kb_suggest_predicates` for approved ground ontology claims, strict facts for scalar claims, and `kb_model_requirement` with a validated `kibi.logic.v1` object for conditions, exceptions, modalities, quantifiers, cardinality, or bounded temporal rules. Preserve `claim_key` and `claim_text` on each ground fact/rule, merge every key into `logic_claims`, persist the complete `semantic_inventory`, and link with `requires_predicate`, `requires_property`, or `requires_rule`. An ambiguity or ontology-gap observation remains explicitly unresolved.
4. Use snake_case field names exactly as the MCP schema shows. `kb_upsert.properties` rejects camelCase aliases such as `subjectKey`, `propertyKey`, `predicateName`, and generic `value`.

Semantic advisor receipts are advisory. They identify atomic clauses and likely modeling lanes, but they do not prove that arbitrary prose was decomposed exhaustively or auto-create facts. `logic_coverage` reports the expected, declared, missing, and unresolved claim keys. Review every clause, apply the strict-property or predicate plans, and run `kb_check` with `logic-coverage` before treating the requirement as Prolog-checkable.

### `kb_model_requirement`

Model a normative requirement claim into a deterministic strict write-set or a validated `kibi.logic.v1` rule plan for contradiction-ready KB persistence. Accepts an LLM-supplied semantic claim (or a typed `logic` object) and returns a ready-to-apply sequence of `req`, `fact_kind: subject`, `fact_kind: property_value`, `rule_schema`, and `rule` entities with typed relationships. Raw Prolog is rejected.

High-confidence scalar claims (≥ 0.7) produce a strict write-set: one `req`, one `fact_kind: subject`, one `fact_kind: property_value`, and two typed relationships. A valid `logic` input produces a `rule_schema`, a `rule` with canonical JSON/full hash/semantic key, and `requires_rule`. Low-confidence claims (< 0.7) produce a single `fact_kind: observation` artifact that does not enter the contradiction lane, plus a warning explaining how to retry with explicit claim fields.

**Parameters:**
- `text` (required): One atomic plain-language normative clause to model.
- `source` / `sourceFiles` (optional): Provenance used for stable IDs and references.
- `confidence` (optional): Claim confidence; values below `0.70` produce observation review output.
- `subjectKey`, `propertyKey`, `operator`, and `value` (optional as a complete set): Explicit semantic claim fields. When all are supplied, heuristic extraction is skipped.
- `provenance` (optional): Exact source anchor for the clause.
- `existingLogicClaims` (optional): Existing requirement claim keys. The returned req update merges the new key rather than replacing previously modeled clauses.
- `logic` (optional): Typed `kibi.logic.v1` IR. Kibi validates range restriction, modalities, units, temporal bounds, closed-world negation, and resource-safe structure before returning a rule plan.

**Returns:**
A `writeSet` discriminated union:
- `isStrict: true` — includes `req`, `subjectFact`, `propertyFact`, `relationships`, and an `applyPlan` ready for sequential `kb_upsert` calls.
- `isStrict: false` — includes a single `observationFact` for non-normative or low-confidence input.

Also returns the stable `claimKey`, merged `logicClaims`, and `migrationWarning` when the workspace KB schema is outdated.

The modeling call is read-only. Applying its plan is a separate mutation and must follow the caller's authorization boundary. The write-set is deterministic and idempotent—the same claim produces the same stable entity IDs. Apply authorized writes through sequential `kb_upsert` calls.


### `kb_suggest_predicates`

Suggest ontology predicate candidates for a prose requirement before an agent writes freeform ontology notes. Agents should spell out the requirement claim, call this tool, then either apply a returned `fact_kind: predicate` plan linked with `requires_predicate` or record the returned `review:ontology-gap` observation when no predicate fits.

The tool ranks project-local `fact_kind: predicate_schema` facts when available and falls back to Kibi's built-in predicate catalog covering state, transitions, guards, exceptions, mutual exclusion, dependencies, ownership, retry policies, escalation rules, availability SLAs, notification routing, idempotency, data residency, audit logging, consent, lifecycle actions, conflict resolution, fallback behavior, batch operations, consistency rules, build constraints, environment safety rules, schema invariants, coding standards, migration boundaries, absence/removal requirements, offline behavior, release gates, platform consistency, preservation rules, abstraction boundaries, security configuration, ordered strategies, refresh policies, scoped authorization, documentation standards, warmup policies, visual layout rules, enforcement-location rules, reconciliation rules, throttling policies, persistence/save/discard behavior, accessibility, retention, resource constraints, feature gates, events, permissions, defaults, uniqueness, state memberships, temporal ordering, conditional behavior, rate limits, and acceptance outcomes. Built-in candidates include usage hints (`use_when` / `do_not_use_when`) so agents can choose precise predicates instead of matching keywords blindly.

**Parameters:**
- `text` (required): Prose requirement or claim to classify into ontology predicates.
- `requirementId` (optional): Existing requirement ID. When present, the response includes a `relationshipPlan` describing the `requires_predicate` link to attach after preserving existing requirement metadata.
- `source` (optional): Provenance/text reference for generated predicate facts or ontology-gap observations.
- `subjectHint` (optional): Canonical subject key to use as the first predicate argument.
- `maxCandidates` (optional): Maximum ranked predicate candidates to return.
- `minScore` (optional): Minimum candidate score; higher values make ontology-gap fallback more likely.
- `includeExistingSchemas` (optional): Include project-local predicate schema facts alongside built-ins.
- `existingLogicClaims` (optional): Existing requirement claim keys. Returned relationship guidance merges the new key rather than replacing earlier clauses.

**Returns:**
- `candidates`: Ranked predicate suggestions with schema signature, usage hints, ordered `predicate_args`, `canonical_key`, score, and rationale.
- `recommendedAction`: `apply_requires_predicate` when a candidate fits, otherwise `record_ontology_gap`.
- `structuredContent.applyPlan`: A ready-to-apply `kb_upsert` payload for the top predicate fact, or an explicit `fact_kind: observation` tagged `review:ontology-gap` and `needs_schema_extension`.
- `structuredContent.relationshipPlan`: When `requirementId` is supplied and a predicate fits, the req -> fact `requires_predicate` link plus the merged `logicClaims` manifest to apply after querying/preserving the existing requirement entity. This is separate from `applyPlan` so the tool never emits a foreign-source relationship that `kb_upsert` would reject.

**Example:**
```json
{
  "text": "When the user navigates away with unsaved annotation edits, the editor must auto-save the draft and return to idle mode.",
  "requirementId": "REQ-EDITOR-004",
  "source": "requirements/editor.md#L12",
  "subjectHint": "editor.annotation"
}
```


### `kb_semantic_advisor`

Analyze requirement prose without mutating the KB. Use this before constructing a `kb_upsert` payload when you have raw requirement text and want modeling suggestions.

**Parameters:**
- `text` (required): Requirement prose to inspect.
- `type` (optional): Entity type context. Currently `req` is supported.
- `id` (optional): Requirement ID used for draft relationship guidance.
- `title` (optional): Requirement title for draft apply plans.
- `source` (optional): Provenance for draft suggestions.
- `status` (optional): Requirement status for draft suggestions.
- `clauses` (optional): Caller-reviewed atomic proposition split. Use it when a sentence contains multiple obligations, conditions, exceptions, definitions, or qualifiers.
- `interpretations` (optional, maximum 3): Typed `kibi.logic.v1` alternatives with `claim_key`, `claim_text`, and `ir`. Kibi canonicalizes and structurally compares them; materially different valid alternatives remain unresolved and confidence never selects one.

**Returns:**
- `structuredContent.receipt`: Semantic advisor receipt with detected signals, a proposition ledger (`propositions[]`), typed interpretation results, deterministic shadow cues, modeling suggestions, candidate lane, payload hash, and suggested next tools.
- `structuredContent.warnings`: Non-blocking warning strings explaining why the prose is not yet contradiction-checkable.

The receipt returns stable provenance `claim_key` values, `claim_text`, exact UTF-8 byte spans, per-clause suggestion indexes, and a `logic_coverage` manifest comparison. Proposition statuses are `modeled`, `ambiguous`, `ontology_gap`, `nonlogical`, or `missing`; an assertive span is never silently dropped. Suggestion kinds include `strict_property`, `predicate`, `rule`, `ambiguity_observation`, and `ontology_gap`. Supported deterministic suggestions include multi-claim prose, cardinality, thresholds with units, retention/expiry durations, booleans, enum sets, permissions and prohibitions, defaults, uniqueness constraints, state memberships, state transitions, exception rules, mutual exclusion, dependency rules, ownership, retry policies, escalation, availability SLAs, notification routing, idempotency, data residency, audit logging, consent, lifecycle, conflict-resolution, fallback/degradation, batch constraints, cross-entity consistency, conditional behavior, temporal ordering, comparative numeric constraints, rate limits, and ambiguity observations.

For exact predicate suggestions, the receipt `candidate_lane` and `suggested_next_tools` follow the generated suggestion rather than the weaker signal heuristic. For example, a lifecycle rule containing a number still routes to `kb_suggest_predicates`, not `kb_model_requirement`, when the advisor can ground it as a predicate fact.

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

The visible text includes the skill's declared resources so agents can discover follow-up `kb_skills_read` calls without guessing resource paths.
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

### `kb_sparql_remote`

Run an opt-in SPARQL `SELECT` query against an external HTTP(S) SPARQL endpoint. This tool is remote-only: it does not query Kibi's local RDF store directly, does not start a local SPARQL endpoint, and does not store credentials.

**Parameters:**
- `endpoint` (required): Remote SPARQL endpoint URL. Must start with `http://` or `https://`; local file paths are rejected.
- `query` (required): SPARQL `SELECT` query text.
- `timeoutMs` (optional): Positive timeout in milliseconds for the remote request.

**Returns:**
Rows returned by the remote endpoint, serialized as structured MCP content. Network availability, endpoint rate limits, and remote endpoint authentication requirements are outside Kibi's control.

**Example:**
```json
{
  "endpoint": "https://query.wikidata.org/sparql",
  "query": "SELECT ?item WHERE { ?item wdt:P31 wd:Q146 . } LIMIT 5",
  "timeoutMs": 15000
}
```

## Internal Prolog Implementation Notes

Kibi's Prolog core may use maintained SWI-Prolog libraries such as `library(aggregate)` for count/reporting helpers and `library(chr)` for isolated derived-fact pilots. These are internal implementation details and do not change public KB semantics, MCP response shapes, or the canonical validation rules unless a future release explicitly documents such a change.

### `kb_upsert`

Create or update a single entity and optional relationships in one call.

**Parameters:**
- `type`: Entity type enum
- `id`: Entity ID
- `properties`: Entity fields, including required `title` and `status` (status values depend on entity type; legacy values may still be accepted for compatibility). For `symbol` entities this may include `sourceFile`, `symbol_role`, and `granularity_reason`; for `fact` entities this includes typed fact fields such as `fact_kind`, `subject_key`, `property_key`, `operator`, `value_type`, and one matching `value_*` field.
- `relationships` (optional): Relationship rows with enum-backed `type`, `from`, and `to`

`symbol_role` values are `behavioral`, `structural`, `type-shape`, `config`, `module`, and `unknown`. Use `behavioral` for manual anchors when behavior is hidden inside factory/expression composition and the extractor cannot create a narrower symbol.

**Returns:**
Confirmation of entity creation/update and relationship creation counts. Successful responses may also include `structuredContent.semanticAdvisor` and `structuredContent.warnings`. The advisor receipt can contain draft strict-property, predicate, ambiguity-observation, or ontology-gap suggestions with apply plans. These suggestions are non-blocking in v1, but agents should review and repair them before considering prose-heavy requirements contradiction-checkable.

### `kb_validate_upsert`

Validate a `kb_upsert` payload without mutating the KB. This read-only preflight returns `valid`, `errors`, `warnings`, `semanticAdvisor`, and `normalizedPreview` so agents can fix schema issues and semantic modeling gaps before calling `kb_upsert`.

`semanticAdvisor` includes a version, payload hash, logic readiness, candidate lane, detected signals, ambiguity witnesses, modeling suggestions, and suggested next tools. Use the receipt as proof that the payload was inspected, not as proof that the prose is logically enforced.

When invoked through MCP, `kb_validate_upsert` also attaches to Prolog and validates live relationship endpoint types before mutation. Invalid tuples such as `verified_by fact -> test` are rejected in preflight with the same relationship guidance `kb_upsert` would return.

### `kb_delete`

Delete one or more entities by ID. Deletion is blocked when dependents still reference the target.

**Parameters:**
- `ids`: Array of entity IDs to delete

**Returns:**
Confirmation of deletion, or an error describing blocked dependents.

### `kb_check`

Run KB validation rules after mutations. Agents can also opt into read-only changed-file impact diagnostics for source edits while the edit context is still fresh. The MCP tool and CLI JSON route are peer interactive gates; CLI staged checks and git hooks remain the commit-time enforcement gate.

**Parameters:**
- `rules` (optional): Validation rule subset (`must-priority-coverage`, `symbol-coverage`, `symbol-traceability`, `no-dangling-refs`, `no-cycles`, `required-fields`, `deprecated-adr-no-successor`, `domain-contradictions`, `strict-fact-shape`, `strict-req-fact-pairing`, `predicate-verifiability`, `logic-coverage`, `query-plan-safety`). `strict-fact-shape`, `strict-req-fact-pairing`, and `predicate-verifiability` are migration/semantic-audit checks and are disabled by default. `logic-coverage` is enabled by default, validates explicitly declared requirement manifests against linked ground facts, and leaves requirements without a manifest as gradual-backfill debt reported by quality diagnostics. `domain-contradictions` compares strict property constraints and exact opposite predicate polarities over the same namespace, predicate name, and ordered arguments. It does not infer arbitrary equivalence between differently shaped predicates.
- `sourceFiles` (optional): Repo-relative source paths to inspect for changed-file impact diagnostics.
- `staged` (optional): Inspect staged source changes when building impact diagnostics.
- `includeWorkingTreeDiff` (optional): Include unstaged working-tree content/diffs for the supplied `sourceFiles`.
- `includeImpactDiagnostics` (optional): Include changed-file diagnostics such as `symbol_granularity_violation` and `symbol_semantic_review_needed` in structured output.
- `maxDiagnostics` (optional): Cap returned impact diagnostics. Graph validation violations are not capped by this value.
- `workspaceRoot` (optional): Workspace root for impact diagnostics and `.kb/config.json` lookup. Defaults to the MCP server workspace.

**Returns:**
Validation report with any hard violations found and suggested fixes. `structuredContent.violations[]` is the blocking correctness lane: graph, schema, contradiction, query-plan, and staged enforcement failures live there and continue to drive `count` and failure status. `structuredContent.qualityDiagnostics[]` is the additive audit-quality lane for non-blocking modeling, coverage-depth, symbol fanout, duplicate-coordinate, broad-requirement, status, and strict-fact review signals.

Rule filtering affects the audit-quality lane. When `rules` is omitted, MCP runs the normal full validation profile and also performs the full-KB audit-quality scan that populates `qualityDiagnostics[]`. When `rules` is supplied, MCP preserves the requested scoped validation and skips that full-KB advisory scan so iteration stays fast and predictable. Source impact diagnostics are independent: pass `includeImpactDiagnostics: true` with `sourceFiles` or `staged: true` when you need changed-file review during a filtered check.

Quality diagnostics use explicit `severity` and `blocking` fields. `severity: "review"` and `severity: "info"` are advisory and do not fail checks by default; `severity: "warning"` is still non-blocking unless `blocking: true`; `severity: "error"` or `blocking: true` is a hard failure signal. Existing hard violations remain in `violations[]` rather than being downgraded into the advisory lane.

When impact diagnostics are enabled, `structuredContent` also includes `impactDiagnostics`, `sourceFiles`, `extractedSymbols`, `linkedEntities`, and `nextActions`. Impact diagnostics follow the same blocking convention: advisory unless their severity is `error` or `blocking` is true. `symbol_granularity_violation` means a changed behavioral symbol has only coarse ownership when a narrower anchor is available and remains blocking. `symbol_semantic_review_needed` can fire even when graph coverage already exists; it tells the agent to inspect whether linked requirements, scenarios, and tests actually cover the changed behavior or UI copy. Kibi reports the linked entities and suggested MCP calls, but it does not prove prose semantics.

**Example:**
```json
{
  "sourceFiles": ["src/app/pages/upload/upload-page.component.ts"],
  "includeImpactDiagnostics": true,
  "includeWorkingTreeDiff": true
}
```

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

### KB Auto-Refresh

For same-branch workflows, MCP validates the attached branch KB against filesystem stat metadata before attach-sensitive operations.
When MCP detects a KB replacement for the same branch, it triggers a controlled re-attach flow.

- The session stores an `attachedBranchStamp` at attachment time.
- MCP recomputes the latest branch stamp with `readBranchKbStamp` and compares it with `sameBranchKbStamp`.
- If stale, MCP runs a full `refreshAttachedBranchKb` attempt.
- For transient refresh failures, MCP retries through `refreshAttachedBranchKbWithRetry`.
- If recovery fails, MCP returns a `KbRefreshError` and the operation fails closed.

This behavior is important after external branch operations such as `kibi sync --rebuild`, where the branch KB snapshot can be replaced while the MCP process stays running.

## Recommended Agent Workflow

1. **Interactive Bootstrap**: Start with the `/init-kibi` workflow to gather declared context and synthesize entities. Always preview candidates for user approval before applying.
2. **Gather Context**: Use `kb_search` for discovery (decomposing broad tasks into focused probes) and `kb_query` for exact follow-up.
3. **Inspect Freshness**: Use `kb_status` when branch or stale-state confidence matters.
4. **Analyze**: Use `kb_find_gaps`, `kb_coverage`, and `kb_graph` for curated reporting.
5. **Check Source Impact**: After meaningful source edits, run `kb_check` with `sourceFiles`, `includeImpactDiagnostics: true`, and `includeWorkingTreeDiff: true` before deciding whether requirements/tests/symbol links need updates.
6. **Execute Changes**: Use `kb_upsert` to create/update entities and relationships.
7. **Validate**: Run `kb_check` after structural changes. Use explicit `rules` during iteration for scoped validation; run an unfiltered `kb_check` before completion to include the full-KB `qualityDiagnostics[]` audit scan.
8. **Clean Up**: Use `kb_delete` only for intentional removals after validating dependencies.

**Modeling note:** Use `flag` for runtime/config gates. Bug and workaround notes belong in `fact` entities, usually with `fact_kind: observation` or `meta`. **Strict facts** drive contradiction checks; observation/meta are non-blocking notes.
## Error Handling

The MCP server returns structured errors for:
- Invalid parameters (missing required fields, invalid enum values)
- Referential integrity violations (attempting to delete entities with dependents)
- Branch KB startup/attach failures
- Validation failures

Always check error responses before proceeding with more mutations. For common validation failures and recovery payloads, see `docs/error-reference.md`. In particular, strict fact writes must use `subject_key`, `property_key`, `value_type`, and exactly one typed `value_*` field; do not use `subjectKey`, `propertyKey`, or generic `value` in `kb_upsert.properties`.

## Determinism Guarantees

- Query results are sorted and de-duplicated for consistency
- MCP responses use explicit field names and fixed shapes
- Validation output is stable across repeated runs on unchanged KB state
