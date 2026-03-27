# Kibi Discovery and Gap Analysis: Technical Proposal

> **Status:** Draft  
> **Date:** 2026-03-22  
> **Scope:** Public MCP read-only tools for discovery, graph traversal, gap analysis, and sync trust

---

## 1. Product Brief

### 1.1 Problem Statement

Kibi stores structured project knowledge well, but users still leave Kibi when they need exploratory analysis:

- "Which requirements lack scenarios?" → greps markdown
- "Show me REQ→SCEN links" → parses RDF manually  
- "What's the coverage status?" → builds spreadsheets
- "Is MCP current?" → guesses

Kibi wins on structured storage, but loses on discovery and trust.

### 1.2 Product Goal

Make Kibi the default surface for project understanding. Users should answer gap, graph, coverage, and freshness questions directly through Kibi, not fall back to files.

### 1.3 Success Criteria

| Criterion | How measured |
|-----------|--------------|
| One-call gap analysis | `kb_find_gaps` answers missing-link questions |
| One-call graph inspection | `kb_graph` returns bounded traversal |
| Built-in coverage | `kb_coverage` generates requirement/symbol reports |
| Explicit freshness | `kb_status` reports snapshot/dirty state |
| CLI/MCP parity | Same branch KB returns same snapshot ID |

### 1.4 Non-Goals (V1)

- Arbitrary Prolog exposure
- Unbounded graph queries  
- Changing write semantics
- Silently reading off-branch state

---

## 2. Recommended Surface

### 2.1 Current Tools (Unchanged)

| Tool | Job |
|------|-----|
| `kb_query` | Entity lookup by type/id/tags/source |
| `kb_upsert` | Create/update entities and relationships |
| `kb_delete` | Delete entities with dependency blocking |
| `kb_check` | Run validation rules |

### 2.2 New Read-Only Discovery Tools

| Tool | Job | User Question |
|------|-----|---------------|
| `kb_find_gaps` | Bulk absence/presence analysis | "Which requirements lack scenarios?" |
| `kb_graph` | Bounded graph traversal | "Show REQ→SCEN links from REQ-001" |
| `kb_coverage` | Opinionated coverage reports | "What's the requirement coverage status?" |
| `kb_status` | Sync freshness and metadata | "Is MCP reading the current snapshot?" |

---

## 3. Tool Specifications

### 3.1 `kb_find_gaps`

**Purpose:** Answer absence/presence questions over relationships in bulk.

**Examples:**
- "Which requirements lack scenarios?"
- "Which symbols have no direct implements link?"

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "type": {
      "type": "string",
      "enum": ["req", "scenario", "test", "adr", "flag", "event", "symbol", "fact"]
    },
    "missingRelationships": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Relationship types that must be absent for inclusion"
    },
    "presentRelationships": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Relationship types that must be present for inclusion"
    },
    "tags": { "type": "array", "items": { "type": "string" } },
    "sourceFile": { "type": "string" },
    "limit": { "type": "integer", "default": 100 },
    "offset": { "type": "integer", "default": 0 }
  }
}
```

**Output Schema:**

```json
{
  "rows": [
    {
      "id": "REQ-001",
      "type": "req",
      "title": "User authentication",
      "status": "open",
      "missingRelationships": ["specified_by"],
      "presentRelationships": ["verified_by"],
      "relationshipCounts": {
        "specified_by": 0,
        "verified_by": 2,
        "depends_on": 1
      },
      "source": "requirements/REQ-001.md"
    }
  ],
  "count": 1,
  "meta": {
    "branch": "feature/x",
    "snapshotId": "sha256:abc123...",
    "syncedAt": "2026-03-22T12:34:56Z",
    "dirty": false
  }
}
```

---

### 3.2 `kb_graph`

**Purpose:** Bulk relationship inspection and bounded traversal.

**Examples:**
- "Show all REQ→SCEN links"
- "Start from REQ-001 and traverse specified_by + verified_by depth 2"

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "seedIds": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Starting entity IDs"
    },
    "relationships": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Relationship types to follow (default: all)"
    },
    "direction": {
      "type": "string",
      "enum": ["outgoing", "incoming", "both"],
      "default": "outgoing"
    },
    "depth": {
      "type": "integer",
      "minimum": 1,
      "maximum": 5,
      "default": 1
    },
    "entityTypes": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Filter returned nodes to these types"
    },
    "maxNodes": { "type": "integer", "default": 200 },
    "maxEdges": { "type": "integer", "default": 500 }
  },
  "required": ["seedIds"]
}
```

**Output Schema:**

```json
{
  "nodes": [
    {
      "id": "REQ-001",
      "type": "req",
      "title": "User authentication",
      "status": "open"
    },
    {
      "id": "SCEN-001",
      "type": "scenario",
      "title": "Login flow",
      "status": "active"
    }
  ],
  "edges": [
    { "type": "specified_by", "from": "REQ-001", "to": "SCEN-001" }
  ],
  "truncated": false,
  "meta": {
    "branch": "feature/x",
    "snapshotId": "sha256:abc123...",
    "syncedAt": "2026-03-22T12:34:56Z",
    "dirty": false
  }
}
```

---

### 3.3 `kb_coverage`

**Purpose:** Opinionated coverage reports.

**Examples:**
- "Show requirement coverage"
- "Show symbol traceability coverage"

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "by": {
      "type": "string",
      "enum": ["req", "symbol", "type"],
      "default": "req"
    },
    "tags": {
      "type": "array",
      "items": { "type": "string" }
    },
    "includePassing": {
      "type": "boolean",
      "default": false
    },
    "includeTransitive": {
      "type": "boolean",
      "default": true
    },
    "limit": { "type": "integer", "default": 100 },
    "offset": { "type": "integer", "default": 0 }
  }
}
```

**Output Schema:**

```json
{
  "summary": {
    "total": 10,
    "fullyCovered": 6,
    "missingScenario": 2,
    "missingTest": 1,
    "missingScenarioAndTest": 1
  },
  "rows": [
    {
      "id": "REQ-001",
      "title": "User authentication",
      "status": "open",
      "scenarioCount": 1,
      "testCount": 0,
      "directSymbolCount": 2,
      "transitiveSymbolCount": 3,
      "gaps": ["missing_test"]
    }
  ],
  "meta": {
    "branch": "feature/x",
    "snapshotId": "sha256:abc123...",
    "syncedAt": "2026-03-22T12:34:56Z",
    "dirty": false
  }
}
```

---

### 3.4 `kb_status`

**Purpose:** Explicit sync freshness and metadata.

**Examples:**
- "Is MCP reading the current synced snapshot?"
- "What branch/snapshot is this result from?"

**Input Schema:**

```json
{
  "type": "object",
  "properties": {}
}
```

**Output Schema:**

```json
{
  "branch": "feature/x",
  "snapshotId": "sha256:abc123...",
  "syncedAt": "2026-03-22T12:34:56Z",
  "dirty": true,
  "syncState": "stale",
  "lastSyncSource": "manual",
  "kbPath": ".kb/branches/feature-x"
}
```

**States:**

| State | Meaning |
|-------|---------|
| `fresh` | KB matches file state at syncedAt |
| `stale` | Files changed since last sync |
| `unknown` | Cannot determine freshness |

---

## 4. CLI Parity

New commands matching MCP tools:

```bash
# Gap analysis
kibi gaps req --missing-rel specified_by
kibi gaps symbol --missing-rel implements --tag core

# Graph traversal
kibi graph --from REQ-001 --traverse specified_by,verified_by --depth 2
kibi graph --from REQ-001,REQ-002 --relationships depends_on --direction both

# Coverage reports
kibi coverage --by req --tag security
kibi coverage --by symbol --include-transitive

# Status/trust
kibi status
```

**Note:** Keep `kibi query --relationships` for compatibility, but position `kibi graph` as primary for relationship/graph operations.

---

## 5. Architecture

### 5.1 Reuse Existing Intelligence

- **Traversal/inference:** Already in `packages/core/src/kb.pl:484` (`transitively_implements`, `affected_symbols`, etc.)
- **Coverage logic:** Already in `packages/core/src/checks.pl:59` (`coverage_gap`, `check_symbol_coverage`)
- **Pattern:** Follow `packages/cli/src/commands/aggregated-checks.ts:22` — heavy work in Prolog, JSON once, minimize round-trips

### 5.2 New Prolog Modules

```
packages/core/src/
├── discovery.pl    # Gap predicates, graph expansion, coverage reports
└── status.pl       # Snapshot/freshness metadata predicates
```

**discovery.pl predicates:**
- `find_gaps/7` — bulk missing/present relationship filter
- `graph_expand/7` — bounded traversal with node/edge limits
- `coverage_report/5` — requirement/symbol coverage summaries
- `relationship_counts/3` — counts per entity

**status.pl predicates:**
- `kb_snapshot_metadata/1` — returns snapshot dict
- `kb_freshness_state/1` — fresh/stale/unknown
- `kb_snapshot_id/1` — deterministic ID for current KB state

### 5.3 TypeScript Layer

**New files:**

```
packages/mcp/src/tools/
├── find-gaps.ts
├── graph.ts
├── coverage.ts
└── status.ts

packages/cli/src/commands/
├── gaps.ts
├── graph.ts
├── coverage.ts
└── status.ts
```

**Modified files:**

```
packages/mcp/src/tools-config.ts          # Add 4 new tool configs
packages/mcp/src/server/tools.ts          # Register 4 new handlers
packages/cli/src/index.ts                 # Add 4 new commands
```

### 5.4 Data Flow

```
CLI/MCP Request
    ↓
TypeScript handler (thin adapter)
    ↓
Prolog discovery/status predicates
    ↓
Existing kb.pl predicates
    ↓
RDF triple store (per-branch)
    ↓
JSON response with metadata
```

---

## 6. Sync Consistency Contract

### 6.1 New Contract

- **Every successful sync** produces a new `snapshotId`
- **All discovery tools** return that `snapshotId` in `meta`
- **CLI and MCP** must return the same `snapshotId` for same branch KB
- **Dirty detection:** If files changed after last sync, report `dirty: true` and `syncState: stale`
- **Branch mismatch:** Must remain explicit per ADR-011

### 6.2 Product Promise

> After a successful sync, MCP reflects the exact persisted KB snapshot. If the workspace moved ahead, Kibi says so clearly.

### 6.3 Implementation

```prolog
% In status.pl
kb_snapshot_metadata(Metadata) :-
    kb_branch(Branch),
    kb_snapshot_id(SnapshotId),
    kb_synced_at(SyncedAt),
    kb_freshness_state(State),
    kb_dirty(Dirty),
    Metadata = _{
        branch: Branch,
        snapshotId: SnapshotId,
        syncedAt: SyncedAt,
        syncState: State,
        dirty: Dirty
    }.
```

---

## 7. Contract and Documentation Changes

### 7.1 Requirements to Update

| ID | Current | Change |
|----|---------|--------|
| REQ-002 | "4 tools" | Expand to 8 tools (4 core + 4 discovery) |
| REQ-013 | "inference outside public surface" | Keep true; discovery tools are curated read-only, not raw inference |

### 7.2 Documentation to Update

| File | Change |
|------|--------|
| `docs/mcp-reference.md` | Add 4 new tools |
| `docs/cli-reference.md` | Add `gaps`, `graph`, `coverage`, `status` commands |
| `docs/inference-rules.md` | Note discovery tools as curated inference surface |

### 7.3 ADR Needed

**ADR-NNN: Discovery Tools as Public Read Surface**

- Expands MCP public surface from 4 to 8 tools
- Adds read-only discovery without exposing raw Prolog
- Preserves write-tool minimalism
- Keeps inference intelligence internal, but exposes curated results

### 7.4 Tests to Update

| File | Change |
|------|--------|
| `packages/mcp/tests/server.test.ts:244` | Update tool count from 4 to 8 |
| `packages/opencode/tests/prompt.test.ts:52` | May need to mention new tools |
| `packages/opencode/tests/agent-surface-policy.test.ts:16` | Keep MCP-only policy; add new tools to allowed set |

---

## 8. Rollout Plan

### Phase 1: Foundation — Snapshot Trust
- [ ] Add `status.pl` with snapshot metadata predicates
- [ ] Add `kb_status` MCP tool
- [ ] Add `kibi status` CLI command
- [ ] Add CLI/MCP parity tests on snapshot IDs
- [ ] Add stale-read regressions

### Phase 2: Gap Analysis — `kb_find_gaps`
- [ ] Add `discovery.pl` with gap predicates
- [ ] Add `kb_find_gaps` MCP tool
- [ ] Add `kibi gaps` CLI command
- [ ] Add tests for missing/present relationship filters

### Phase 3: Graph Traversal — `kb_graph`
- [ ] Add graph expansion predicates to `discovery.pl`
- [ ] Add `kb_graph` MCP tool
- [ ] Add `kibi graph` CLI command
- [ ] Add bounded traversal tests

### Phase 4: Coverage Reports — `kb_coverage`
- [ ] Add coverage report predicates to `discovery.pl`
- [ ] Add `kb_coverage` MCP tool
- [ ] Add `kibi coverage` CLI command
- [ ] Add coverage summary tests

### Phase 5: Documentation and Policy
- [ ] Write ADR-NNN
- [ ] Update REQ-002 and REQ-013 (or create successors)
- [ ] Update MCP reference docs
- [ ] Update CLI reference docs
- [ ] Update agent-facing guidance
- [ ] Update test expectations for 8-tool surface

---

## 9. Testing Strategy

### 9.1 Prolog Tests

```
packages/core/tests/discovery.test.pl
packages/core/tests/status.test.pl
```

Cover:
- Gap predicate edge cases (empty KB, all matching, none matching)
- Graph expansion bounds (depth limits, maxNodes, maxEdges)
- Coverage summary correctness
- Snapshot ID stability/determinism

### 9.2 MCP Tests

```
packages/mcp/tests/tools/find-gaps.test.ts
packages/mcp/tests/tools/graph.test.ts
packages/mcp/tests/tools/coverage.test.ts
packages/mcp/tests/tools/status.test.ts
```

Cover:
- Each tool schema validation
- Response shape compliance
- Metadata presence
- Error handling for invalid inputs

### 9.3 CLI Tests

```
packages/cli/tests/commands/gaps.test.ts
packages/cli/tests/commands/graph.test.ts
packages/cli/tests/commands/coverage.test.ts
packages/cli/tests/commands/status.test.ts
```

Cover:
- Command-line argument parsing
- Output format consistency with MCP
- Exit codes

### 9.4 Parity Tests

```
packages/cli/tests/parity/mcp-cli-parity.test.ts
```

Cover:
- Same fixture → same snapshot ID from CLI and MCP
- Same query → same results from both surfaces
- Sync → both surfaces see new snapshot

### 9.5 Consistency Regressions

- Sync → query → same snapshot
- Edit without sync → `dirty: true`
- Branch change → new branch metadata
- Concurrent edits → deterministic winner

---

## 10. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `kb_query` feels redundant | Medium | Keep for simple lookup; discovery tools for analysis; document clear split |
| Large repos make traversal expensive | High | Bounded depth (max 5), maxNodes/maxEdges limits, Prolog-side aggregation |
| Coverage semantics confuse users | Medium | Explicit field names (`directSymbolCount` vs `transitiveSymbolCount`), clear gap taxonomy |
| Snapshot trust still fails | High | Make snapshot ID generation part of sync transaction; add explicit parity tests |
| Agent guidance fragmentation | Medium | Update prompt/policy tests to include new tools in allowed set |

---

## 11. Recommendation

Ship the read-only discovery bundle:

1. `kb_status` — establishes trust first
2. `kb_find_gaps` — highest user value, lowest complexity
3. `kb_graph` — bounded traversal for structure questions
4. `kb_coverage` — opinionated reporting

Keep `kb_query` narrow and fast. The clean split between lookup and analysis makes both surfaces easier to document, test, and reason about.

---

## Appendix: Quick Reference

### Tool Summary

| Tool | Core Question | Key Params |
|------|---------------|------------|
| `kb_find_gaps` | "What's missing?" | `missingRelationships`, `presentRelationships` |
| `kb_graph` | "What's connected?" | `seedIds`, `relationships`, `depth` |
| `kb_coverage` | "How complete is it?" | `by`, `includeTransitive` |
| `kb_status` | "Is this current?" | (none) |

### CLI Quick Reference

```bash
kibi status                          # Check freshness
kibi gaps req --missing-rel specified_by
kibi graph --from REQ-001 --depth 2
kibi coverage --by req
```

### Files to Create

```
packages/core/src/discovery.pl
packages/core/src/status.pl
packages/mcp/src/tools/find-gaps.ts
packages/mcp/src/tools/graph.ts
packages/mcp/src/tools/coverage.ts
packages/mcp/src/tools/status.ts
packages/cli/src/commands/gaps.ts
packages/cli/src/commands/graph.ts
packages/cli/src/commands/coverage.ts
packages/cli/src/commands/status.ts
```

### Files to Modify

```
packages/mcp/src/tools-config.ts
packages/mcp/src/server/tools.ts
packages/cli/src/index.ts
docs/mcp-reference.md
docs/cli-reference.md
documentation/requirements/REQ-002.md
documentation/requirements/REQ-013.md
packages/mcp/tests/server.test.ts
packages/opencode/tests/prompt.test.ts
packages/opencode/tests/agent-surface-policy.test.ts
```

### New ADR

```
documentation/adr/ADR-NNN-discovery-tools.md
```
