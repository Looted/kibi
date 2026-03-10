# Inference Rules (Phase 1)

Kibi includes deterministic derived predicates for internal analysis and automation. These predicates are no longer part of the public four-tool MCP surface.

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

These predicates remain useful for product features, automation, and future internal services. Public MCP agents should use the public four-tool interface instead:

- `kb_query`
- `kb_upsert`
- `kb_delete`
- `kb_check`

If deeper inference needs to be re-exposed in the future, it should be documented explicitly as a separate product decision rather than silently expanding the public MCP surface.
