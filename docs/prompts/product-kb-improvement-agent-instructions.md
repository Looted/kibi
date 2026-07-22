# Product KB Improvement Agent Instructions

Use this prompt for agents improving a product Kibi KB or converting prose requirements into strict facts or ontology predicates.

## Mission

Improve a product KB from a traceability-heavy graph into a semantic, queryable project memory. Preserve REQ → SCEN → TEST → SYM traceability, but add typed facts for machine-checkable claims.

## Hard Rules

1. Use visible Kibi MCP tools or the trusted project-local CLI's dedicated JSON routes (`kibi <route> --input <file|->`); never edit `.kb/` manually. If neither peer surface is available, stop and ask the operator to provide one.
2. Start with `kb_search`, then exact `kb_query`.
3. Create relationship endpoints before linking them.
4. Run `kb_upsert` sequentially.
5. For `kb_upsert.properties`, use snake_case only: `subject_key`, `property_key`, `predicate_name`, `predicate_args`, `canonical_key`, `closed_world`, `value_type`, and one `value_*`.
6. Treat active RDF/tool query results as operational truth; authored Markdown is evidence, not proof of active KB state.

## Decision Guide

| Claim type | Model as | Relationship |
| --- | --- | --- |
| Measurable normative property | `fact_kind: subject` + `fact_kind: property_value` | `constrains` + `requires_property` |
| Domain invariant/behavior predicate | `fact_kind: predicate` | `requires_predicate` |
| Bug, workaround, mutation-testing evidence | `fact_kind: observation` | usually `relates_to` |
| Process/governance note | `fact_kind: meta` | usually `relates_to` |
| Runtime/config gate | `flag` | `guards` |

## Example: annotation timeKey precision

```json
{
  "type": "fact",
  "id": "FACT-ANNOTATION-TIMEKEY-SLOT-PRECISION",
  "properties": {
    "title": "Annotation timeKey slot precision",
    "status": "active",
    "source": "docs/facts/FACT-ANNOTATION-TIMEKEY-SLOT-PRECISION.md",
    "fact_kind": "property_value",
    "subject_key": "annotation.timeKey",
    "property_key": "slot_precision",
    "operator": "eq",
    "value_type": "int",
    "value_int": 1,
    "unit": "decisecond",
    "canonical_key": "annotation.timeKey.slot_precision.eq.1_decisecond"
  }
}
```

## Example: annotation uniqueness predicate

```json
{
  "type": "fact",
  "id": "FACT-ANNOTATION-TIMEKEY-UNIQUENESS",
  "properties": {
    "title": "Annotation timeKey uniqueness predicate",
    "status": "active",
    "source": "docs/facts/FACT-ANNOTATION-TIMEKEY-UNIQUENESS.md",
    "fact_kind": "predicate",
    "predicate_name": "unique_annotation_slot",
    "predicate_args": ["analysis_id", "timeKey"],
    "polarity": "assert",
    "closed_world": true,
    "canonical_key": "unique_annotation_slot.analysis_id.timeKey"
  }
}
```

Link predicates from requirements with `requires_predicate`, and property facts with `requires_property`.

## Source/RDF Reconciliation Checklist

- Query exact fact IDs after writing.
- Confirm `fact_kind`, `predicate_name` or `property_key`, and `canonical_key` appear through Kibi tools.
- Graph from the requirement with `requires_predicate` and `requires_property`.
- If Markdown has predicate fields but Kibi queries do not, report a sync/import issue before creating duplicates.
