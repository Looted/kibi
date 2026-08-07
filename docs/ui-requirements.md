# UI / Visual Requirement Modeling

Use this guide when a project must record **what the screen should look like** so that
agents building or editing a UI can discover the expectation and cannot silently drift
from it. This lane is entirely optional: it applies only to projects with a UI, and no
validation rule requires it. A non-UI project simply never models UI subjects, and its
bootstrap context can declare `has_ui: false` so no UI entities are proposed.

## What this lane stores

Kibi models UI expectations in three layers. Store the whole screen as prose, decompose
every checkable fact into the strict or predicate lanes, and keep UI components linked as
symbols:

1. **Prose layer** — a `req` whose markdown body carries the full on-screen description
   (positions, regions, header contents, spacing, visual hierarchy). This is the durable,
   searchable record agents discover with `kb_search` / `kb_query` before touching a file.
2. **Strict atomic layer** — `property_value` facts for checkable visual invariants such as
   position, alignment, visibility, and ordering. These are linked from the requirement with
   `constrains` (subject fact) and `requires_property` (property fact). Only this layer
   participates in reject-on-write contradiction blocking.
3. **Relational predicate layer** — ground `predicate` facts for relational layout rules
   ("X must remain visually aligned with Y"), linked with `requires_predicate`. Use the
   built-in `visual_layout_rule` or a project-local `predicate_schema`.

Agents that only "remember" general requirements still make small, unintended visual
changes. The prose layer makes the expectation discoverable; the strict and predicate
layers make a *stated* conflict fail at write time; symbol traceability makes a component
edit surface the requirement for review. Kibi does **not** render pixels: it enforces stated
facts and links, not visual regression.

## Layer 1 — Prose requirement (the anchor)

Create one requirement per screen, region, or component contract. Keep the full visual
description readable in the requirement body. Link every screen region subject to it.

```markdown
---
id: REQ-UI-SETTINGS
title: Settings screen layout
status: open
tags: [ui, layout]
---

The settings screen shows a header with the items Home, Search, and Profile in that
order. Page content is centered. A submit button sits anchored to the bottom-right of
the viewport, and the navigation rail must remain visually aligned with the header.
```

The prose is not machine-enforced. Every checkable sentence in it must be decomposed into
strict or predicate facts for the requirement to participate in contradiction checks.

## Layer 2 — Strict atomic facts (the enforcement lane)

Turn each checkable visual property into a `fact_kind: subject` fact (the region) plus one
`fact_kind: property_value` fact per invariant. Use `subject_key` / `property_key` in
snake_case, an `operator` (`eq` for enum placements), and a typed value
(`value_type: string` with `value_string` for named regions and orderings).

`kb_upsert` rejects a write when a new current requirement constrains the same
`subject_key` and `property_key` with an incompatible value while another current
requirement already does so (`domain-contradictions` / reject-on-write). To change a value
intentionally, create a new requirement and link it with `supersedes` instead of editing a
current one.

### Button position

```json
{
  "type": "fact",
  "id": "FACT-UI-SUBMIT-REGION",
  "properties": {
    "title": "Settings submit button region",
    "status": "active",
    "fact_kind": "subject",
    "subject_key": "settings.screen.submit_button"
  }
}
```

```json
{
  "type": "fact",
  "id": "FACT-UI-SUBMIT-POSITION",
  "properties": {
    "title": "Submit button anchored bottom-right",
    "status": "active",
    "fact_kind": "property_value",
    "subject_key": "settings.screen.submit_button",
    "property_key": "position",
    "operator": "eq",
    "value_type": "string",
    "value_string": "bottom_right",
    "canonical_key": "settings.screen.submit_button.position.eq.bottom_right"
  }
}
```

Link the requirement to both facts in one `kb_upsert`:

```json
{
  "type": "req",
  "id": "REQ-UI-SETTINGS",
  "properties": {
    "title": "Settings screen layout",
    "status": "open"
  },
  "relationships": [
    { "type": "constrains", "from": "REQ-UI-SETTINGS", "to": "FACT-UI-SUBMIT-REGION" },
    { "type": "requires_property", "from": "REQ-UI-SETTINGS", "to": "FACT-UI-SUBMIT-POSITION" }
  ]
}
```

### Centered content

```json
{
  "type": "fact",
  "id": "FACT-UI-CONTENT-REGION",
  "properties": {
    "title": "Settings content region",
    "status": "active",
    "fact_kind": "subject",
    "subject_key": "settings.screen.content"
  }
}
```

```json
{
  "type": "fact",
  "id": "FACT-UI-CONTENT-ALIGNMENT",
  "properties": {
    "title": "Settings content centered",
    "status": "active",
    "fact_kind": "property_value",
    "subject_key": "settings.screen.content",
    "property_key": "alignment",
    "operator": "eq",
    "value_type": "string",
    "value_string": "center",
    "canonical_key": "settings.screen.content.alignment.eq.center"
  }
}
```

### Header item order

Model ordering as one indexed `property_key` per slot so each position is independently
checkable against the same subject:

```json
{
  "type": "fact",
  "id": "FACT-UI-HEADER-REGION",
  "properties": {
    "title": "Settings header region",
    "status": "active",
    "fact_kind": "subject",
    "subject_key": "settings.screen.header"
  }
}
```

```json
{
  "type": "fact",
  "id": "FACT-UI-HEADER-SLOT-1",
  "properties": {
    "title": "First header item is Home",
    "status": "active",
    "fact_kind": "property_value",
    "subject_key": "settings.screen.header",
    "property_key": "nav_order_1",
    "operator": "eq",
    "value_type": "string",
    "value_string": "home"
  }
}
```

Repeat `nav_order_2: search`, `nav_order_3: profile` with sibling facts, and link each from
the requirement with `requires_property`. A conflicting requirement writing
`nav_order_1: profile` is rejected at write time.

## Layer 3 — Relational predicates

Kibi ships a built-in `visual_layout_rule(subject, relation, target)` schema for UI/visual
alignment claims (`relation` is typically `aligned_with`). Its inference covers the sentence
shape "X must remain visually aligned with Y" only; for other relational layout claims, use
a project-local `fact_kind: predicate_schema` when the task authorizes ontology extension.

### Built-in visual layout predicate

```json
{
  "type": "fact",
  "id": "FACT-UI-NAV-ALIGN",
  "properties": {
    "title": "Navigation rail aligned with header",
    "status": "active",
    "fact_kind": "predicate",
    "predicate_name": "visual_layout_rule",
    "predicate_args": ["navigation_rail", "aligned_with", "header"],
    "polarity": "assert",
    "canonical_key": "visual_layout_rule(navigation_rail,aligned_with,header)"
  }
}
```

Link with `requires_predicate`:

```json
{
  "type": "req",
  "id": "REQ-UI-SETTINGS",
  "properties": { "title": "Settings screen layout", "status": "open" },
  "relationships": [
    { "type": "requires_predicate", "from": "REQ-UI-SETTINGS", "to": "FACT-UI-NAV-ALIGN" }
  ]
}
```

An `assert` and `deny` requirement over the same predicate namespace, name, and ordered
arguments is a blocking `domain-contradictions` conflict, so equivalent layout claims must
reuse the same canonical schema and argument vocabulary.

### Project-local layout schema

When no built-in predicate fits (for example a placement rule like "button in the
bottom-right region"), define a stable schema only when the task explicitly authorizes
ontology extension:

```json
{
  "type": "fact",
  "id": "FACT-SCHEMA-UI-PLACEMENT",
  "properties": {
    "title": "UI placement rule schema",
    "status": "active",
    "fact_kind": "predicate_schema",
    "predicate_name": "ui_placement_rule",
    "predicate_arity": 3,
    "argument_names": ["subject", "region", "anchor"],
    "argument_types": ["ui_entity", "region", "ui_entity"],
    "examples": ["ui_placement_rule(submit_button, bottom_right, viewport)"]
  }
}
```

Ground claims then use `fact_kind: predicate` with that `predicate_name`, `predicate_args`,
and `requires_predicate` linking, exactly like the built-in example above. Otherwise record
a `fact_kind: observation` with `review: ontology-gap`.

## Symbol traceability for UI components

Model each UI component as a `symbol` with `sourceFile` and `symbol_role: behavioral`, then
link it to the requirement with `implements`. When that component file changes, impact
diagnostics can surface the linked requirement (`symbol_semantic_review_needed`) so the
visual spec is reviewed before the edit is considered complete.

```yaml
symbol:
  id: SYM-submit-button
  title: Settings submit button
  status: active
  sourceFile: src/components/SettingsSubmitButton.tsx
  symbol_role: behavioral
relationships:
  - type: implements
    from: SYM-submit-button
    to: REQ-UI-SETTINGS
```

## Workflow

1. `kb_semantic_advisor` on the full screen description; audit the atomic clause list and
   supply `clauses` when automatic decomposition misses an obligation.
2. For each relational layout clause, call `kb_suggest_predicates` and apply the returned
   predicate `applyPlan` + `requires_predicate` link.
3. For each scalar placement/alignment/order clause, call `kb_model_requirement` and apply
   the strict subject/property plan + `constrains` / `requires_property` links.
4. Preserve `claim_key` / `claim_text` on every ground fact and merge every key into the
   requirement `logic_claims` manifest.
5. `kb_validate_upsert` every payload, create endpoints first, then `kb_upsert` sequentially.
6. Run `kb_check` with `logic-coverage`, `predicate-verifiability`, and
   `domain-contradictions` during iteration, then a final unfiltered `kb_check`.

## Non-UI projects

Nothing here is required when a project has no UI. No check rule demands `visual_layout_rule`
or UI subject facts; they exist only if the project creates them. Declare the project as
non-UI during bootstrap (`has_ui: false`) and no UI entities are proposed.
