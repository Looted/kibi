# Kibi Modeling Cheatsheet

Use this one-page guide when deciding how to model knowledge through MCP tools.

## Decision Tree

1. **Runtime/config gate?** Use `flag`, then link with `guards`.
2. **Bug, incident, workaround, audit note, or migration evidence?** Use `fact` with `fact_kind: observation` or `fact_kind: meta`.
3. **Normative property/value/limit?** Use a requirement plus strict facts:
   - `fact_kind: subject` with `subject_key`, linked from the requirement by `constrains`.
   - `fact_kind: property_value` with `subject_key`, `property_key`, `operator`, `value_type`, and exactly one `value_*`, linked by `requires_property`.
   - Prefer `kb_model_requirement` when starting from prose.
4. **Reusable domain predicate?** Call `kb_suggest_predicates`, then write `fact_kind: predicate` with `predicate_name`, `predicate_args`, and `canonical_key`, linked by `requires_predicate`.
5. **BDD behavior?** Use `scenario`, linked with `specified_by`.
6. **Executable evidence?** Use `test`, linked with `verified_by` or `validates`.
7. **Code ownership or coverage?** Use `symbol`, linked with `implements`, `covered_by`, or `executable_for`.

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
