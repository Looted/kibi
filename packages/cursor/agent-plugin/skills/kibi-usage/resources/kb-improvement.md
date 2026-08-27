# Existing Product KB Improvement

Use this resource when an existing product KB already has REQ → SCEN → TEST →
symbol traceability and the task is to add typed facts so normative claims are
queryable and contradiction-checkable.

Keep the original requirement prose readable. Facts add semantics; they do not
replace the requirement body. Lane choice, field names, and predicate routing
are in `resources/fact-lanes.md` and the Predicate-First workflow in
`resources/workflows.md`.

## Claim routing

| Claim type | Model as | Relationship |
| --- | --- | --- |
| Measurable normative property | `subject` + `property_value` | `constrains` + `requires_property` |
| Domain invariant or behavior relation | `predicate` | `requires_predicate` |
| Bug, workaround, or observed evidence | `observation` | usually `relates_to` |
| Process or governance note | `meta` | usually `relates_to` |
| Runtime or config gate | `flag` | `guards` |

Call `kb_semantic_advisor` on the complete requirement body before encoding a
clause. Apply a predicate only when a returned schema fits; otherwise leave an
ontology-gap observation.

## Source and RDF reconciliation

After each approved write:

1. Query the exact fact IDs.
2. Confirm `fact_kind`, `predicate_name` or `property_key`, and `canonical_key`
   appear through Kibi tools, not only in authored Markdown.
3. Graph from the requirement with `requires_predicate` and `requires_property`.
4. If Markdown has predicate or property fields but queries do not, report a
   sync or import issue before creating duplicates.

Treat active tool query results as operational truth. Authored Markdown is
evidence of intent, not proof of active KB state.
