# UI / Visual Requirement Modeling

Optional, per-project lane for recording what the screen should look like so UI edits cannot
silently drift from the spec. Non-UI projects skip it entirely. Without the experimental
`kibi-plugin-ui` no check rule requires it; with that plugin active, `kb_check` blocks
components that lack a design requirement (`policy-ownership`) and implementations that
lose their pattern markers (`policy-markers`).

## Three layers

1. **Prose `req`** — the full on-screen description lives in the requirement body as the
   searchable anchor agents discover with `kb_search` / `kb_query`.
2. **Strict facts** — checkable visual invariants as `fact_kind: subject` (`subject_key`,
   linked `constrains`) plus `fact_kind: property_value` (`property_key`, `operator`, typed
   `value_*`, linked `requires_property`). Incompatible values on the same subject/property
   from two current requirements are rejected on write unless `supersedes`.
3. **Relational predicates** — ground `fact_kind: predicate` linked with `requires_predicate`.
   The built-in `visual_layout_rule(subject, relation, target)` covers "X must remain visually
   aligned with Y" (relation `aligned_with`); `ui_pattern`, `same_pattern` and
   `pattern_marker` cover patterns (below); `ui_container(subject, size, overflow)` covers
   "a half-page panel that scrolls". Other relational layout claims need a project-local
   `predicate_schema` when the task authorizes ontology extension.

Kibi enforces stated facts and links, not pixels. Freeform spatial prose is stored and
searchable but is not machine-checked.

## Patterns and variants

Name the visual pattern a concept uses, and which variants must share it, so a rewrite to a
different pattern (a line-and-dots timeline redone as cards) is a visible contradiction
instead of a silent drift. All three predicates are built in:

- `ui_pattern(subject, pattern)`: `ui_pattern(activity_feed, line_dots_timeline)`.
- `same_pattern(subject, variant, other_variant)`: `same_pattern(activity_feed, editor_view, read_only_view)`.
- `pattern_marker(pattern, marker)`: `pattern_marker(line_dots_timeline, timeline_dot)`; the
  marker is a literal class name or test id every implementation of the pattern contains.

Link the first two from the requirement with `requires_predicate`. Marker facts belong to
the pattern, not to one requirement, so link them from the requirement that introduced the
pattern or leave them standalone. With `kibi-plugin-ui` active, every component that
implements a requirement naming a `ui_pattern` must contain each marker of that pattern in
its source or its `.html` template. A component with no design constraint (a
layout-free wrapper) carries the tag `review:ui-unconstrained` instead of a requirement.

A requirement grounded only in `ui_pattern`, `same_pattern` and `pattern_marker` is proved
by component tests: a test with `verification_scope: unit` or `integration` and a fresh
passing receipt satisfies its scenarios. Write one component test per variant named in
`same_pattern`; that is what catches a divergent branch inside one template, which the
static marker check cannot see. Adding any other fact (`ui_container`, a property) brings
back the end-to-end requirement.

### Capturing the inventory

When the plugin is first enabled on an existing UI, list the patterns the code already
uses per screen, ask the human which is intended wherever two variants of one concept
differ, and record each answer as a requirement. Record a divergence the human has not
decided as an `observation` fact tagged `review:ui-divergence`, citing both files, rather
than guessing which variant is right. Colours, spacing and component-library choices
(which scrollbar component to use) belong in a linter, not here.

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

1. `kb_model` (`mode: "analyze"`) on the full description; audit or supply `clauses`.
2. Relational clauses: `kb_model` (`mode: "predicates"`), apply the predicate plan and
   `requires_predicate`.
3. Scalar placement/alignment/order clauses: `kb_model` (`mode: "requirement"`), apply the strict
   subject/property plan and `constrains` / `requires_property`.
4. Preserve `claim_key` / `claim_text`; merge every key into the requirement
   `logic_claims` manifest.
5. `kb_upsert` with `dryRun: true`, create endpoints first, then sequential `kb_upsert`.
6. `kb_check` with `logic-coverage`, `predicate-verifiability`, `domain-contradictions`,
   then a final unfiltered `kb_check`.

Non-UI projects: declare `has_ui: false` during bootstrap and no UI entities are proposed.
