# Inference Rules (Phase 1)

Kibi v0.5 introduces deterministic derived predicates exposed via MCP.

## Core Predicates (`packages/core/src/kb.pl`)

- `transitively_implements(Symbol, Req)`
  - Direct: `implements(Symbol, Req)`
  - Derived: `covered_by(Symbol, Test)` + `validates(Test, Req)`
  - Derived: `covered_by(Symbol, Test)` + `verified_by(Req, Test)`

- `transitively_depends(Req1, Req2)`
  - Recursive closure over `depends_on/3`
  - Cycle-safe via visited set

- `impacted_by_change(Entity, Changed)`
  - Undirected graph traversal over all relationship edges
  - `Entity=Changed` included by definition

- `affected_symbols(Req, Symbols)`
  - Returns sorted symbols implementing `Req`
  - Includes symbols implementing requirements that transitively depend on `Req`

- `coverage_gap(Req, Reason)`
  - Evaluates only MUST requirements (`priority` contains `must`)
  - `Reason` is one of:
    - `missing_scenario_and_test`
    - `missing_scenario`
    - `missing_test`

- `untested_symbols(Symbols)`
  - Returns sorted symbols without `covered_by` links

- `stale(Entity, MaxAgeDays)`
  - True when `updated_at` age is older than `MaxAgeDays`

- `orphaned(Symbol)`
  - Symbol with no `implements`, `covered_by`, or `constrained_by` links

- `conflicting(Adr1, Adr2)`
  - ADR pair constraining the same symbol
  - Sorted pair output (`Adr1 @< Adr2`)

- `deprecated_still_used(Adr, Symbols)`
  - ADR status in `archived|deprecated|rejected`
  - Returns symbols still constrained by that ADR

- `current_adr(Id)`
  - True when Id is an ADR not superseded by any other ADR
  - Returns all currently active/architectural decisions

- `superseded_by(OldId, NewId)`
  - Direct supersession relationship
  - OldId is superseded by NewId

- `adr_chain(AnyId, Chain)`
  - Full ordered chain from AnyId to the current ADR (newest last)
  - Cycle-safe via visited accumulator
  - Returns complete decision history for a topic

## MCP Tools

### `kb_derive`

Generic inference endpoint.

Input:

```json
{
  "rule": "coverage_gap",
  "params": { "req": "REQ-042" }
}
```

Output:

```json
{
  "structuredContent": {
    "rule": "coverage_gap",
    "params": { "req": "REQ-042" },
    "count": 1,
    "rows": [{ "req": "REQ-042", "reason": "missing_test" }],
    "provenance": { "predicate": "coverage_gap", "deterministic": true }
  }
}
```

Supported rules:

- `transitively_implements`
- `transitively_depends`
- `impacted_by_change`
- `affected_symbols`
- `coverage_gap`
- `untested_symbols`
- `stale`
- `orphaned`
- `conflicting`
- `deprecated_still_used`
- `current_adr`
- `adr_chain`
- `superseded_by`

### `kb_impact`

Shorthand for impact analysis.

Input:

```json
{ "entity": "REQ-042" }
```

Output fields:

- `entity`: changed entity
- `impacted`: sorted list of `{id, type}`
- `count`
- `provenance`

### `kb_coverage_report`

Aggregate coverage rollup.

Input:

```json
{ "type": "req" }
```

`type` is optional (`req`, `symbol`, or all).

Output fields:

- `coverage.requirements`: totals and gap reasons
- `coverage.symbols`: totals and untested symbol IDs
- `provenance.predicates`: predicates used for derivation

### Additional MCP Tools

#### kb_current_adr

Returns all current (non-superseded) ADRs.

Input: No params

Output:
```json
{
  "content": [{"type": "text", "text": "Derived X row(s) for rule 'current_adr'."}],
  "structuredContent": {
    "rule": "current_adr",
    "params": {},
    "count": N,
    "rows": [
      {"id": "ADR-001", "title": "Use SWI-Prolog..."},
      {"id": "ADR-002", "title": "Use Bun/Node.js..."}
    ],
    "provenance": {
      "predicate": "current_adr",
      "deterministic": true
    }
  }
}
```

#### kb_adr_chain

Returns full temporal chain from a starting ADR to the current one.

Input:
```json
{
  "adr": "ADR-005"
}
```

Output:
```json
{
  "content": [{"type": "text", "text": "Derived 3 row(s) for rule 'adr_chain'."}],
  "structuredContent": {
    "rule": "adr_chain",
    "params": {"adr": "ADR-005"},
    "count": 3,
    "rows": [
      {"id": "ADR-005", "title": "...", "status": "superseded"},
      {"id": "ADR-008", "title": "...", "status": "active"},
      {"id": "ADR-010", "title": "...", "status": "accepted"}
    ],
    "provenance": {
      "predicate": "adr_chain",
      "deterministic": true
    }
  }
}
```

#### kb_superseded_by

Returns direct successor for an ADR.

Input:
```json
{
  "adr": "ADR-005"
}
```

Output:
```json
{
  "content": [{"type": "text", "text": "Derived 1 row(s) for rule 'superseded_by'."}],
  "structuredContent": {
    "rule": "superseded_by",
    "params": {"adr": "ADR-005"},
    "count": 1,
    "rows": [
      {
        "adr": "ADR-005",
        "successor_id": "ADR-008",
        "successor_title": "AST-derived symbol coordinates..."
      }
    ],
    "provenance": {
      "predicate": "superseded_by",
      "deterministic": true
    }
  }
}
```

## Determinism Guarantees

- Prolog queries use `setof/3` where possible for stable ordering and de-duplication.
- MCP responses include explicit field names and fixed shapes.
- Aggregate/report outputs are sorted before returning.
