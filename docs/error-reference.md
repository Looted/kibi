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

If `kb_coverage.repairPlan.status` is `partial`, do not execute it as a complete migration. Its `scope.excludedByPagination` count identifies omitted actionable requirements; rerun requirement coverage with `offset: 0` and a large enough `limit`. Apply only `ready` batches, never infer that `blocked` means safe to skip, and rerun coverage after each validated sequential batch because new downstream gaps can become visible as prerequisites are repaired.

## Unsafe or unverifiable rule fact

`fact_kind: rule` requires a `kibi.logic.v1` `rule_ir`, a deterministic full `rule_hash`, a `semantic_key`, a `rule_schema_id`, and `rule_name`. Submit the typed object through `kb_model_requirement`; do not provide Prolog source. `rule-safety` rejects function symbols, raw goals, cuts, meta-calls, dynamic predicates, I/O, unsafe/unbound variables, existential rule heads, unstratified negation, incompatible units, and unbounded aggregation. `rule-verifiability` requires `requires_rule` to target a real `rule_schema` and a safe rule fact. Analysis that is timed out or resource-limited is `unresolved`, not proof of consistency.

If validation reports `Logical Claim Provenance Mismatch`, the fact's `claim_key` was copied, invented, or derived from different text. Re-run `kb_semantic_advisor` for the exact atomic clause and preserve its returned `claim_key` and canonicalized `claim_text` together.

## Relationship source mismatch

Same-call relationship rows must start from the entity being upserted. To link `REQ-001 -> TEST-001`, create `TEST-001` first, then upsert `REQ-001` with `verified_by`.

## Invalid relationship tuple

`kb_validate_upsert` and `kb_upsert` reject relationship source/target type pairs that are not part of the relationship schema. For example, facts are not directly verified by tests: do not write `verified_by fact -> test` or `validates test -> fact`. Create or update a requirement, link the requirement to the fact with `constrains`, `requires_property`, or `requires_predicate`, and link the requirement or its scenario to the test with `verified_by` / `validates`.

## Strict-lane mismatch

- `constrains` targets `fact_kind: subject`.
- `requires_property` targets `fact_kind: property_value`.
- `requires_predicate` targets `fact_kind: predicate`.
- `requires_rule` targets `fact_kind: rule` whose `rule_schema_id` points to `fact_kind: rule_schema`.

Legacy prose facts may remain readable during migration, but they do not provide the same strict contradiction semantics.

## Contradiction detected

Create an append-only replacement requirement and add `supersedes`, or deprecate the conflicting requirement before writing the new one.

## Audit journal or snapshot lock

`Audit journal is locked by another Kibi runtime; restart the stale MCP/CLI session before retrying` means an older engine still owns the branch's journal lock. Kibi does not terminate unrelated sessions; use `kibi engine status`/`kibi engine stop` for the current workspace, or restart the stale MCP/CLI process, then retry the validated upsert.

`KB snapshot is stale; reattach or refresh the runtime before retrying` means another current runtime published the branch after this process attached. Reattach the branch (or restart the runtime) and rerun the read/preflight/mutation sequence.

Timeout diagnostics include `stage=<name>` and the child PID. The stage is one of the bounded commit markers (`runtime`, `lock`, `rdf_mutation`, `contradiction_check`, `entity_audit`, `relationship_audit`, `snapshot_save`, or `audit_sync`); use it to distinguish a stale lock from a filesystem or Prolog failure without relying on entity payload logging.

## Low-confidence `kb_model_requirement` downgrade

When confidence is below `0.70`, Kibi emits a non-blocking `fact_kind: observation`. If the prose is normative, retry with explicit `subjectKey`, `propertyKey`, `operator`, and `value` so the tool can produce strict facts.

## `kb_suggest_predicates` ontology gap

If no candidate meets `minScore`, Kibi emits a `review:ontology-gap` observation. Keep it as review evidence, or add a project-local `fact_kind: predicate_schema` when the language is recurring domain ontology.

If a candidate exists but returns `binding_status: incomplete`, this is not an ontology gap and its `applyPlan` is intentionally empty. Review the declared argument roles and call the tool again with exact `argumentBindings` for every name in `unbound_arguments`; do not persist the literal marker `unknown`.

If lexical ranking prefers a reviewed false positive, retry with the exact candidate `schema.id` as `schemaId`. Use `polarityHint` only when the prose's surface negation is not denial of the selected predicate. An unavailable `schemaId` returns `resolve_schema_reference` and no write plan; refresh or correct the schema reference rather than recording a false ontology gap.

## Inspecting domain contradiction evidence

`domain-contradictions` violations may include `evidence.witnesses`. Strict-property and ground-predicate witnesses identify both requirements, both source-bound fact claims, and the exact normalized terms. Rule witnesses also include source spans, rule hashes/IR, and a symbolic comparison. A rule witness with `status: unresolved` means overlap could not be proven or excluded; it keeps requirement proof at `analysis_incomplete` and must not be reported as consistency.

## Advisory quality diagnostics are present but checks pass

Kibi has a two-lane check contract. Hard correctness failures appear in `violations[]` and fail checks. Auditability findings appear in `qualityDiagnostics[]`; `review`, `info`, and non-blocking `warning` diagnostics are intentionally advisory so they can guide agents without breaking otherwise valid KB operations.

Fix the underlying modeling issue when the diagnostic points to real drift, but do not move advisory findings into `links` or prose-only workarounds to silence them. Use the suggested MCP workflow instead: `kb_search` → `kb_query`, update narrower requirements/scenarios/tests/symbols/facts through `kb_upsert`, and rerun `kb_check`.

Telemetry diagnostics are also advisory in `kb_check`, but `kibi usage-metrics --require-acceptance` converts their versioned report into an explicit process gate. Common IDs and repairs are:

- `repeated_mutation_failures`: stop retrying, query endpoints, validate a reduced exact payload, repair runtime health, and retry once.
- `mutation_validation_bypassed`: run `kb_validate_upsert` for the exact payload within one hour before sequential `kb_upsert`.
- `semantic_advisor_bypassed`: rerun `kb_semantic_advisor` for the same requirement and current source hash before writing it.
- `e2e_receipt_freshness_low`: execute scenario-backed E2E tests against the live snapshot and append fresh receipts.
- `proof_gap_recovery_stalled`: apply reviewed ready repair batches and demonstrate a lower complete-scope gap count.
- `source_lookup_zero_result_rate_high`: inspect and refresh the cited source links before repeating focused lookups.
- `telemetry_completeness_low`, `telemetry_evidence_stale`, or `telemetry_acceptance_incomplete`: capture current complete diagnostic events; do not waive missing evidence as success.
