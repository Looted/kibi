# Discovery Bundle Design

## Goal

Implement the full curated discovery surface for Kibi in one branch: free-text search, snapshot/status inspection, gap analysis, coverage reporting, and bounded graph traversal across both MCP and CLI, while keeping `kb_query` precise and deterministic.

## Product Shape

The new read-only surface is:

- MCP: `kb_search`, `kb_status`, `kb_find_gaps`, `kb_coverage`, `kb_graph`
- CLI: `kibi search`, `kibi status`, `kibi gaps`, `kibi coverage`, `kibi graph`

The old CRUD-and-validation core remains intact. `kb_query` continues to do exact retrieval by ID, type, tags, and source linkage. The new tools are explicitly curated discovery/reporting tools rather than a raw inference escape hatch.

## Architecture

### Shared principle

Keep the public surface small but stop encoding that policy as an exact tool count. Requirements and guidance should describe a curated public MCP surface with exact lookup, mutation, validation, and discovery/reporting capabilities.

### MCP split

- `kb_search` stays mostly in TypeScript, built on the same entity-loading path as `kb_query`
- `kb_status`, `kb_find_gaps`, `kb_coverage`, and `kb_graph` use curated Prolog predicates with thin TypeScript adapters
- `kb_check` keeps its structured response stable, but its human-readable text becomes grouped and actionable
- diagnostic logging stays additive and server-derived so usage analysis works even when clients omit telemetry

### CLI split

- CLI commands should mirror MCP semantics and output-compatible shapes where practical
- CLI command handlers should reuse the same Prolog predicates or shared service helpers rather than re-implementing discovery logic ad hoc

### Search v1 constraints

- Search metadata plus markdown body text only
- Do not search raw `.ts`, `.js`, `.py`, or other code file bodies
- Normalize anchored markdown sources like `file.md#section` before reading
- Provide deterministic ranking and short match reasons/snippets

### Status contract

`kb_status` must report the currently attached branch and a deterministic snapshot identity. It should also report whether the persisted KB snapshot looks stale relative to the workspace and whether the server is serving the active branch. The contract should be explicit rather than inferred by clients.

## Data Flow

### Search

1. Load candidate entities through shared MCP entity retrieval
2. Score metadata matches in TypeScript
3. If the entity source resolves to a repo-local markdown file, load the body without frontmatter and score body matches
4. Sort by score and stable tie-breakers
5. Return reasons, snippets, and total counts

### Discovery/status tools

1. Thin MCP/CLI handler validates args
2. Prolog predicate computes rows/nodes/edges/metadata
3. TypeScript formats human text plus structured content / JSON output

## Testing Strategy

### MCP unit/integration

- Tool handler tests for each new tool
- `tools/list` regression coverage
- `kb_check` readable text regression tests
- diagnostic `usage.log` field coverage

### CLI

- Command tests for `search`, `status`, `gaps`, `coverage`, `graph`
- parity-oriented assertions where MCP and CLI should match on the same fixture KB

### E2E

Add a discovery-focused packed E2E suite that covers:

- MCP search on markdown-backed entities
- MCP and CLI parity for gaps/coverage/status
- graph traversal bounds and truncation behavior
- diagnostic mode usage logging
- stale/fresh status transitions after sync vs workspace edits

## Risks

- Search can become slow if it loads every entity and every markdown file indiscriminately; keep candidate loading scoped and markdown reads lazy
- Snapshot/freshness semantics can become misleading if implemented heuristically; expose exact metadata and conservative stale states
- Graph traversal can drift toward raw inference exposure; keep depth, node, and edge bounds explicit

## Non-goals

- Raw code-content search
- Unbounded inference queries
- Silent off-branch or stale-state behavior
- Turning `kb_query` into fuzzy search
