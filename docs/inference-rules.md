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

`contradicting_reqs/3` uses strict requirement semantics only for current requirements and **strict domain facts**.

- `current_req/1` excludes deprecated and superseded requirements.
- A contradiction requires both requirements to:
  - `constrains` the same `fact_kind=subject` fact (matched by `subject_key`) in the **strict lane**
  - `requires_property` a `fact_kind=property_value` fact for that same subject in the **strict lane**
- **Non-blocking lane:** `observation` and `meta` facts are explicitly excluded from contradiction inference. They serve as non-blocking notes for bugs, workarounds, and historical context.
- Conflict classes currently covered:
  - exact-value conflicts like `eq pending` vs `eq granted`
  - numeric range gaps like `lte 2` vs `gte 3`
  - polarity conflicts like `require` vs `forbid` on the same normalized tuple
- Scope and validity windows only conflict when they intersect.
- **Readiness Levels:** Requirements must pass strict readiness checks (e.g., valid `subject_key`, matching `property_key`, valid operator) before participating in contradiction checks.
- **V1 Limits:** Contradiction detection is bounded to exact-value, boolean/enum, numeric range, and polarity conflicts. Prose-only requirements without strict fact modeling are not checked for contradictions.
- **Automation:** The modeling pipeline is fully automated and does not require human approval for high-confidence (>= 0.7) claims.

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
  - ignores legacy prose facts without `fact_kind` (migration-safe)
  - is intended for migration auditing and is **disabled by default** while older repos are being normalized
  - can be opted into explicitly through CLI/MCP rule selection when a repo is ready to inspect or enforce strict fact shape

- `domain-contradictions`
  - checks for logical conflicts between requirements based on shared strict facts
  - **strict-lane only:** does not promise contradiction detection over all facts; only those explicitly modeled as `subject` + `property_value` participation rules
  - is **enabled by default** for immediate value on normalized data

### Bug and Workaround Documentation (Non-Blocking Lane)

Bug records, incident notes, and workaround documentation should use `observation` or `meta` facts rather than strict fact modeling. Since `observation` and `meta` facts are excluded from contradiction inference, they are appropriate for non-blocking evidence.

**Rule:** Use `observation` or `meta` fact_kind for bug/workaround notes. Do NOT create a `flag` entity for bugs unless there is an actual runtime/config gate.
