# Inference Rules (Phase 1)

Kibi includes deterministic derived predicates for internal analysis and automation. These predicates are not exposed as a raw public inference surface.

## Core Predicates (`packages/core/src/kb.pl`)

- `transitively_implements(Symbol, Req)`
- `transitively_depends(Req1, Req2)`
- `impacted_by_change(Entity, Changed)`
- `affected_symbols(Req, Symbols)`
- `coverage_gap(Req, Reason)`
- `untested_symbols(Symbols)`
- `stale(Entity, MaxAgeDays)`
- `orphaned(Symbol)`
- `conflicting(Adr1, Adr2)`
- `deprecated_still_used(Adr, Symbols)`
- `current_adr(Id)`
- `superseded_by(OldId, NewId)`
- `adr_chain(AnyId, Chain)`
- `contradicting_reqs(ReqA, ReqB, Reason)`

## Requirement contradiction semantics

`contradicting_reqs/3` uses strict requirement semantics only for current requirements.

- `current_req/1` excludes deprecated and superseded requirements.
- A contradiction requires both requirements to:
  - `constrains` the same `fact_kind=subject` fact (matched by `subject_key`)
  - `requires_property` a `fact_kind=property_value` fact for that same subject
- `observation` and `meta` facts are excluded from contradiction inference.
- Conflict classes currently covered:
  - exact-value conflicts like `eq pending` vs `eq granted`
  - numeric range gaps like `lte 2` vs `gte 3`
  - polarity conflicts like `require` vs `forbid` on the same normalized tuple
- Scope and validity windows only conflict when they intersect.

These predicates remain useful for product features, automation, and future internal services. Public MCP agents should use the curated public surface instead:

- `kb_search`
- `kb_query`
- `kb_status`
- `kb_find_gaps`
- `kb_coverage`
- `kb_graph`
- `kb_upsert`
- `kb_delete`
- `kb_check`

## Migration-oriented validation rule

- `strict-fact-shape`
  - checks only facts that already declare `fact_kind`
  - ignores legacy prose facts without `fact_kind`
  - is intended for migration auditing and is safe to keep disabled by default while older repos are being normalized
  - can be opted into explicitly through CLI/MCP rule selection when a repo is ready to inspect or enforce strict fact shape

If deeper inference needs to be re-exposed in the future, it should be documented explicitly as a separate product decision rather than silently expanding the curated public surface.

### Bug and Workaround Documentation

Bug records, incident notes, and workaround documentation should use `observation` or `meta` facts rather than strict fact modeling. Since `observation` and `meta` facts are excluded from contradiction inference, they are appropriate for non-blocking evidence like bugs and temporary workarounds.

**Rule:** Use `observation` or `meta` fact_kind for bug/workaround notes. Do NOT create a `flag` entity for bugs unless there is an actual runtime/config gate.
