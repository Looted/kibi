# UI / Visual Requirement Modeling

Optional, per-project lane for recording what the screen should look like so UI edits cannot
silently drift from the spec. Non-UI projects skip it entirely; no check rule requires it.

## Three layers

1. **Prose `req`** — the full on-screen description lives in the requirement body as the
   searchable anchor agents discover with `kb_search` / `kb_query`.
2. **Strict facts** — checkable visual invariants as `fact_kind: subject` (`subject_key`,
   linked `constrains`) plus `fact_kind: property_value` (`property_key`, `operator`, typed
   `value_*`, linked `requires_property`). Incompatible values on the same subject/property
   from two current requirements are rejected on write unless `supersedes`.
3. **Relational predicates** — ground `fact_kind: predicate` linked with `requires_predicate`.
   The built-in `visual_layout_rule(subject, relation, target)` covers "X must remain visually
   aligned with Y" (relation `aligned_with`). Other relational layout claims need a
   project-local `predicate_schema` when the task authorizes ontology extension.

Kibi enforces stated facts and links, not pixels. Freeform spatial prose is stored and
searchable but is not machine-checked.

## Button position

```yaml
id: FACT-UI-SUBMIT-REGION
fact_kind: subject
subject_key: settings.screen.submit_button
```

```yaml
id: FACT-UI-SUBMIT-POSITION
fact_kind: property_value
subject_key: settings.screen.submit_button
property_key: position
operator: eq
value_type: string
value_string: bottom_right
canonical_key: settings.screen.submit_button.position.eq.bottom_right
```

Link both facts from the requirement:

```yaml
id: REQ-UI-SETTINGS
relationships:
  - type: constrains
    from: REQ-UI-SETTINGS
    to: FACT-UI-SUBMIT-REGION
  - type: requires_property
    from: REQ-UI-SETTINGS
    to: FACT-UI-SUBMIT-POSITION
```

A later requirement writing `position: top_left` on the same subject is rejected on write.

## Header item order

Use one indexed `property_key` per slot against the same subject region:
`nav_order_1: home`, `nav_order_2: search`, `nav_order_3: profile`, each as a separate
`property_value` fact linked with `requires_property`. This makes each slot independently
contradiction-checkable.

## Relational alignment

```yaml
id: FACT-UI-NAV-ALIGN
fact_kind: predicate
predicate_name: visual_layout_rule
predicate_args: [navigation_rail, aligned_with, header]
polarity: assert
canonical_key: visual_layout_rule(navigation_rail,aligned_with,header)
```

Link with `requires_predicate`. An `assert`/`deny` pair over the same predicate namespace,
name, and ordered arguments is a blocking `domain-contradictions` conflict.

## UI component traceability

Model the component as a `symbol` with `sourceFile` and `symbol_role: behavioral`, linked
`implements` to the requirement, so component edits surface the visual spec in impact
diagnostics (`symbol_semantic_review_needed`).

## Workflow

1. `kb_semantic_advisor` on the full description; audit or supply `clauses`.
2. Relational clauses: `kb_suggest_predicates`, apply the predicate plan and
   `requires_predicate`.
3. Scalar placement/alignment/order clauses: `kb_model_requirement`, apply the strict
   subject/property plan and `constrains` / `requires_property`.
4. Preserve `claim_key` / `claim_text`; merge every key into the requirement
   `logic_claims` manifest.
5. `kb_validate_upsert`, create endpoints first, then sequential `kb_upsert`.
6. `kb_check` with `logic-coverage`, `predicate-verifiability`, `domain-contradictions`,
   then a final unfiltered `kb_check`.

Non-UI projects: declare `has_ui: false` during bootstrap and no UI entities are proposed.
