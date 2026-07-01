# Kibi Modeling Cheatsheet

Use this one-page guide when deciding how to model knowledge through MCP tools.

## Decision Tree

1. **Starting from raw normative prose?** Call `kb_semantic_advisor` for draft modeling suggestions before constructing writes.
2. **About to write/update a normative requirement?** Run `kb_validate_upsert` first and inspect `semanticAdvisor`. If it reports `needs_modeling`, repair the payload before treating the requirement as Prolog-checkable.
3. **Runtime/config gate?** Use `flag`, then link with `guards`.
4. **Bug, incident, workaround, audit note, or migration evidence?** Use `fact` with `fact_kind: observation` or `fact_kind: meta`.
5. **Normative property/value/limit?** Use a requirement plus strict facts:
   - `fact_kind: subject` with `subject_key`, linked from the requirement by `constrains`.
   - `fact_kind: property_value` with `subject_key`, `property_key`, `operator`, `value_type`, and exactly one `value_*`, linked by `requires_property`.
   - Prefer `kb_model_requirement` when starting from prose.
6. **Reusable domain predicate?** Call `kb_suggest_predicates`, then write `fact_kind: predicate` with `predicate_name`, `predicate_args`, and `canonical_key`, linked by `requires_predicate`.
7. **BDD behavior?** Use `scenario`, linked with `specified_by`.
8. **Executable evidence?** Use `test`, linked with `verified_by` or `validates`.
   - When the requirement has a `scenario`, this link must target the scenario: use `verified_by(Scenario, Test)` or `validates(Test, Scenario)`. Directly linking `verified_by(Req, Test)` and `validates(Test, Req)` does not satisfy scenario-aware symbol-coverage.
9. **Code ownership or coverage?** Use `symbol`, linked with `implements`, `covered_by`, or `executable_for`.

## Strict property example

```json
{
  "type": "fact",
  "id": "FACT-SESSION-TIMEOUT",
  "properties": {
    "title": "Session timeout limit",
    "status": "active",
    "source": "docs/facts/session.md",
    "fact_kind": "property_value",
    "subject_key": "user.session",
    "property_key": "timeout_minutes",
    "operator": "lte",
    "value_type": "int",
    "value_int": 30,
    "canonical_key": "user.session.timeout_minutes.lte.30"
  }
}
```

## Predicate example

```json
{
  "type": "fact",
  "id": "FACT-EDITOR-DRAFT-AUTOSAVE",
  "properties": {
    "title": "Editor drafts autosave on navigation",
    "status": "active",
    "source": "docs/facts/editor.md",
    "fact_kind": "predicate",
    "predicate_name": "commit_action",
    "predicate_args": ["editor.annotation", "navigation", "draft"],
    "polarity": "assert",
    "canonical_key": "commit_action(editor.annotation,navigation,draft)"
  }
}
```

## Observation example

```json
{
  "type": "fact",
  "id": "FACT-LOGIN-INCIDENT-001",
  "properties": {
    "title": "Login redirect incident evidence",
    "status": "active",
    "source": "docs/facts/login-incident.md",
    "fact_kind": "observation",
    "text_ref": "docs/incidents/login.md#L12"
  }
}
```

## Common field-name mistakes

`kb_model_requirement` accepts semantic claim inputs such as `subjectKey` and `propertyKey`. `kb_upsert.properties` does not. For `kb_upsert`, use snake_case only: `subject_key`, `property_key`, `predicate_name`, `predicate_args`, `canonical_key`, `closed_world`, `value_type`, and one typed `value_*` field.

## Semantic advisor receipts

`kb_validate_upsert` and successful `kb_upsert` responses may include semantic advisor receipts for requirements. A receipt with `logic_readiness: needs_modeling` means Kibi detected machine-checkable prose but no strict or predicate fact link yet. Inspect `suggestions` for one of four reviewable paths:

- `strict_property` — draft subject/property facts plus requirement relationships.
- `predicate` — draft ontology predicate fact and relationship guidance.
- `ambiguity_observation` — observation artifact when prose has competing interpretations.
- `ontology_gap` — observation artifact plus a recommended predicate schema when the claim is logical but unsupported.

Suggestions are non-blocking and must be reviewed before applying; they are not enforcement receipts. Current deterministic coverage includes:

- **Strict property suggestions:** multi-claim prose, cardinality, thresholds with units, retention/expiry durations, booleans, enum sets, and comparative numeric constraints.
- **Ontology predicate suggestions:** permissions and prohibitions, defaults, uniqueness constraints, state memberships, state transitions, conditional behavior, temporal ordering, rate limits, exception rules, mutual exclusion, dependency rules, ownership, retry policies, escalation rules, availability SLAs, notification routing, idempotency, data residency, audit logging, consent prerequisites, lifecycle archive/delete/expiry rules, conflict-resolution strategies, fallback/degradation behavior, batch operations, cross-entity consistency/reference requirements, build constraints, environment-safety rules, schema invariants, coding standards, migration boundaries, absence/removal requirements, offline behavior, release gates, platform consistency, preservation rules, abstraction boundaries, security configuration, ordered strategies, refresh policies, scoped authorization, documentation standards, warmup policies, visual layout rules, enforcement-location rules, reconciliation rules, and throttling policies.
- **Review artifacts:** ambiguity observations and ontology-gap observations when a claim is logical but not safely grounded by the current deterministic catalog.

When an exact predicate suggestion exists, prefer its `applyPlan` and `requires_predicate` relationship guidance over generic prose notes. The receipt-level `candidate_lane` and `suggested_next_tools` are aligned to exact suggestions, so numeric-looking predicate claims such as lifecycle or batching rules can still correctly route to `kb_suggest_predicates`.

## Quality diagnostics lane

`kibi check`, MCP `kb_check`, staged impact checks, coverage reports, and OpenCode scheduled checks can surface non-blocking `qualityDiagnostics[]` alongside hard `violations[]`. Treat `violations[]` as correctness failures to fix before handoff. Treat `qualityDiagnostics[]` as audit review guidance unless `blocking: true` or `severity: "error"` is present.

Common review diagnostics map to modeling actions:

- Broad requirement or multi-requirement symbol: split the requirement/symbol into one observable behavior per anchor, or document a valid umbrella/module rationale.
- Strict fact modeling review: use `kb_model_requirement` or `kb_suggest_predicates` before hand-writing facts.
- Coverage-depth review: add typed `verification_scope` / `verification_perspective` fields to test entities and prefer direct/scenario e2e evidence when the behavior crosses an external boundary.
- Duplicate coordinate review: refresh symbol coordinates through the CLI sync workflow and keep modeled symbol IDs distinct enough to identify the behavioral anchor.
