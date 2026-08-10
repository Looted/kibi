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
- `predicate_schema(FactId, Namespace, Name, Arity, ArgumentNames, ArgumentTypes)`
- `predicate_fact(FactId, Namespace, Name, Args, Polarity)`
- `logic_rule_from_props(Props, Rule)`
- `logic_rule_safety(Props, Errors)`
- `logic_derive(Goal, Proof)` (bounded, data-driven closure)
- `logic_rule_conflict(RuleA, RuleB, Status)`

## Symbol coverage semantics

**Scenario-aware coverage**: When a requirement has `specified_by(Req,Scenario)`, direct `verified_by(Req,Test)` or `validates(Test,Req)` does NOT satisfy symbol-coverage. The canonical path requires `verified_by(Scenario,Test)` or `validates(Test,Scenario)`.

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
- **Semantic advisor receipts:** MCP preflight/write responses may warn that prose looks machine-checkable but unmodeled and may include draft strict-property, predicate, ambiguity-observation, or ontology-gap suggestions. These suggestions are advisory in v1 and do not add contradiction semantics unless the requirement is linked to strict facts or predicate facts.
- **Automation:** The modeling pipeline is fully automated and does not require human approval for high-confidence (>= 0.7) claims.

## Predicate ontology semantics

The ontology lane is an alpha extension for project-local domain predicates:

- `fact_kind=predicate_schema` defines an allowed predicate signature and its argument names/types.
- `fact_kind=predicate` stores one ground predicate claim with `predicate_args` and optional `polarity` (`assert` or `deny`).
- Requirements link to ground predicate facts with `requires_predicate`.
- `predicate_schema/6` and `predicate_fact/5` are read-only helpers for querying stored ontology data.

Stored `rule` facts use the versioned `kibi.logic.v1` JSON IR. The interpreter decodes only allowlisted terms and evaluates finite closure under resource bounds; it never calls `consult/1`, `assertz/1`, or source-string evaluation. Negation-as-failure requires an explicit closed-world atom and stratified dependencies. Opposing modalities are checked extensionally over known facts and conservatively symbolically: `contradiction`, `disjoint`, or `unresolved` are distinct outcomes, and incomplete analysis is never treated as consistency. Proof consumers should preserve the rule IDs, claim spans, normalized formula, substitutions, and contributing fact chain.

The proposition ledger is the completeness boundary: `semantic-completeness` rejects silently missing assertive spans, while `ambiguous`, `ontology_gap`, and `nonlogical` entries remain visible without pretending to prove a rule.

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

## Ignored Files and Inference

Files and directories that match the repository ignore policy are excluded from Kibi's inference pipeline. Ignored files are not read for candidate synthesis and will not be inferred into KB entities by `kb_autopilot_generate` or other discovery-oriented tools. See the MCP repository ignore policy in `docs/mcp-reference.md` for the full list of honored ignore sources and hard-denied directories.

This behavior prevents editor state, tooling caches, and build outputs from polluting the knowledge base with transient or irrelevant artifacts. Note that v1 limits apply: global Git excludes (user-level `core.excludesFile`) are not read, and Kibi does not automatically remove or migrate any existing KB entities that may have been created previously from now-ignored files.
