# Kibi MCP Error Reference

Use this reference when an MCP mutation fails. Fix the payload instead of falling back to prose-only `links` or `text_ref`.

## `must NOT have additional properties`

**Likely cause:** The payload used fields not accepted by `kb_upsert.properties`, often camelCase semantic claim names.

**Common fixes:**

| Invalid | Valid |
| --- | --- |
| `subjectKey` | `subject_key` |
| `propertyKey` | `property_key` |
| `predicateName` | `predicate_name` |
| `predicateArgs` | `predicate_args` |
| `canonicalKey` | `canonical_key` |
| `closedWorld` | `closed_world` |
| `value: true` | `value_type: "bool"` and `value_bool: true` |

If starting from prose, call `kb_model_requirement` and apply its sequential `applyPlan` instead of guessing field names.

## Invalid `status`, `fact_kind`, `operator`, or `value_type`

Use the enum values shown in the MCP `inputSchema`. For property facts, common values are `fact_kind: "property_value"`, `operator: "eq"`, and `value_type: "bool" | "int" | "number" | "string"`.

## Incomplete `property_value` fact

`fact_kind: "property_value"` requires:

- `subject_key`
- `property_key`
- `operator`
- `value_type`
- exactly one of `value_string`, `value_int`, `value_number`, `value_bool`

## Incomplete `predicate` fact

`fact_kind: "predicate"` requires:

- `predicate_name`
- non-empty `predicate_args`
- `canonical_key`

Call `kb_suggest_predicates` before hand-writing ontology predicates.

## Incomplete logical claim provenance

`claim_key` and `claim_text` are an auditable pair. If either is present on a fact, supply both. Use the stable key returned by `kb_semantic_advisor` for that exact atomic clause; do not invent or reuse a key for different prose.

If `kb_check` reports `logic-coverage`, compare the requirement `logic_claims` manifest with its linked `property_value` and `predicate` facts. Ground every missing key, add any omitted linked key to the manifest, and keep ambiguity or ontology gaps explicitly unresolved rather than satisfying the check with an observation.

If validation reports `Logical Claim Provenance Mismatch`, the fact's `claim_key` was copied, invented, or derived from different text. Re-run `kb_semantic_advisor` for the exact atomic clause and preserve its returned `claim_key` and canonicalized `claim_text` together.

## Relationship source mismatch

Same-call relationship rows must start from the entity being upserted. To link `REQ-001 -> TEST-001`, create `TEST-001` first, then upsert `REQ-001` with `verified_by`.

## Invalid relationship tuple

`kb_validate_upsert` and `kb_upsert` reject relationship source/target type pairs that are not part of the relationship schema. For example, facts are not directly verified by tests: do not write `verified_by fact -> test` or `validates test -> fact`. Create or update a requirement, link the requirement to the fact with `constrains`, `requires_property`, or `requires_predicate`, and link the requirement or its scenario to the test with `verified_by` / `validates`.

## Strict-lane mismatch

- `constrains` targets `fact_kind: subject`.
- `requires_property` targets `fact_kind: property_value`.
- `requires_predicate` targets `fact_kind: predicate`.

Legacy prose facts may remain readable during migration, but they do not provide the same strict contradiction semantics.

## Contradiction detected

Create an append-only replacement requirement and add `supersedes`, or deprecate the conflicting requirement before writing the new one.

## Low-confidence `kb_model_requirement` downgrade

When confidence is below `0.70`, Kibi emits a non-blocking `fact_kind: observation`. If the prose is normative, retry with explicit `subjectKey`, `propertyKey`, `operator`, and `value` so the tool can produce strict facts.

## `kb_suggest_predicates` ontology gap

If no candidate meets `minScore`, Kibi emits a `review:ontology-gap` observation. Keep it as review evidence, or add a project-local `fact_kind: predicate_schema` when the language is recurring domain ontology.

## Advisory quality diagnostics are present but checks pass

Kibi has a two-lane check contract. Hard correctness failures appear in `violations[]` and fail checks. Auditability findings appear in `qualityDiagnostics[]`; `review`, `info`, and non-blocking `warning` diagnostics are intentionally advisory so they can guide agents without breaking otherwise valid KB operations.

Fix the underlying modeling issue when the diagnostic points to real drift, but do not move advisory findings into `links` or prose-only workarounds to silence them. Use the suggested MCP workflow instead: `kb_search` → `kb_query`, update narrower requirements/scenarios/tests/symbols/facts through `kb_upsert`, and rerun `kb_check`.
