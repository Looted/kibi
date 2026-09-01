# Workflows

## Closeout contract

End every task with these five independent fields (not a single inferred
success flag):

```text
taskOutcome: complete | interim | blocked
kbState: clean_fresh | stale | dirty | legacy_compat | not_evaluated
verificationState: fresh | dirty | unavailable | not_evaluated
proofState: proven | mixed | unresolved | not_evaluated
limitationDisposition: none | accepted | unaccepted | not_applicable
```

`taskOutcome` describes whether the requested objective was completed. The
other fields describe observed system state. A clean check can coexist with a
stale or dirty KB; unresolved proof can coexist with a complete maintenance
task. An accepted limitation is an auditable operator decision, never logical
grounding, receipt editing, or proof. For every quality diagnostic, record its
ID, one of `fixed`, `accepted`, or `deferred`, and a rationale. Keep accepted
ontology gaps and historical telemetry limitations explicit.

Receipt reuse is safe only when the live verification snapshot, contract hash,
freshness window, and every required case result still match. Otherwise rerun
the contracted command. If the contract changed, retain every older receipt
unchanged, append evidence for the current contract, and keep proof unresolved
with `proof_contract_mismatch` until that current receipt exists.
Obsolete symbols require current extraction or Git evidence before
remap/deletion; transfer coverage only when existing test evidence supports it,
then sync and read back status. Same-version packages with different export
surfaces are a release defect: require a new package version and label any
project override temporary. This skill never selects a package manager or
edits dependency configuration.

## Discovery to Validation Sequence

The canonical workflow for any KB operation follows this pattern:

1. **Discover**: `kb_search` with focused probes
2. **Confirm**: `kb_query` for exact IDs and state
3. **Inspect**: `kb_status` when freshness matters
4. **Decompose**: `kb_semantic_advisor` on the complete normative prose; verify or supply every atomic clause
5. **Choose per-clause lanes**: strict facts for scalar claims; `kb_suggest_predicates` for approved ground ontology relations; `kb_model_requirement` with `kibi.logic.v1` for conditions, exceptions, modalities, quantifiers, cardinality, and bounded temporal rules; observation review for ambiguity, nonlogical prose, and ontology gaps
6. **Preflight**: `kb_validate_upsert` for every intended entity or relationship payload
7. **Create endpoints**: validated `kb_upsert` for new entities, sequentially
8. **Link**: validated `kb_upsert` with `requires_rule`, `requires_predicate`, `constrains`, or `requires_property`, sequentially
9. **Validate coverage and consistency**: targeted `rule-safety`, `rule-verifiability`, `semantic-completeness`, `logic-coverage`, `predicate-verifiability`, and `domain-contradictions`, then final full `kb_check`
10. **Prove execution**: read `kb_status.proofSnapshot`, run `kibi prove` so each configured integration executes once and its `kibi.proof-run.v1` artifact is evaluated against every selected test's `kibi.proof-contract.v1` obligations, appending idempotent `kibi.proof-receipt.v1` receipts; then re-run `kb_coverage`. Never promote durable test status into fresh evidence.
11. **Repair incrementally**: require `kb_coverage.repairPlan.scope.complete`, apply only one `ready` dependency batch per requirement, validate before every sequential write, and rerun coverage before selecting the next batch
12. **Gate workflow evidence**: when `.kb/usage.log` exists, run `kibi usage-metrics --format json --require-acceptance`; repair ranked telemetry diagnostics and never treat stale or insufficient evidence as a pass

Every current requirement without `logic_claims` remains visible as non-blocking backfill debt. Once a manifest and `semantic_inventory` exist, the unfiltered check enforces correspondence to linked ground facts/rules and rejects silently missing assertive propositions.

`kibi.repair-plan.v1` is a deterministic read-only plan, not a mutation script. Its phase order keeps source and proposition analysis ahead of ground endpoints, endpoints ahead of manifests/links, logic ahead of contradictions, scenarios ahead of tests and receipts, and production ownership ahead of coverage and coordinate refresh. A `blocked` batch is waiting on every listed `dependsOn` batch. If pagination makes the plan partial, increase the requirement coverage limit rather than applying an incomplete project view.

`kibi.telemetry-acceptance.v1` evaluates the latest 200 usage events and keeps process health separate from graph correctness. It requires at least 95% complete diagnostic telemetry and, when applicable, exact recent validation before every upsert and a same-requirement/current-hash advisor pass before requirement writes. It also evaluates source lookup misses, comparable complete-scope proof-gap recovery, receipt-specific coverage gaps, and mutation targets retried three or more times. Failed metrics become ranked `category: telemetry` quality diagnostics; missing current coverage fields or evidence older than seven days stays `insufficient_evidence`.

## Agent-guided migration

`kb_status`, unfiltered `kb_check`, and complete-scope `kb_coverage` may return
the shared `kibi.migration-plan.v2`. Treat it as a typed action graph: inspect
the canonical `planHash`, scope completeness, dependencies, safety class,
preconditions, postconditions, and evidence. Apply only ready automatic actions
with `autoApplicable: true` through an explicitly approved `kb_apply_plan` or
`kibi migrate --apply-safe` request containing the exact hash and action IDs.
Never infer an operation from a prose suggestion, and never apply a partial
plan's destructive symbol or relationship action.

The migration engine may normalize schema/config metadata, cut over validated
legacy storage with backups, migrate the exact historical branch attachment,
refresh coordinates, and perform provenance-proven stale cleanup. It does not
choose package managers, ground semantic claims, resolve contradictions, rerun
E2E tests, rewrite receipt history, remap authored symbols, or accept
limitations. Those actions remain explicit review/operator/execution steps.

For `e2e_receipt_freshness_low`, query each listed requirement/test gap and run `kibi prove --requirement <id>` (or the covering integration); this appends proof receipts idempotently and preserves history. If `coverage_depth_review` conflicts with a coverage row whose `proofStages.passingE2e.status` is `passed`, report the diagnostic as a stale heuristic and keep any independent proof gaps unresolved.

## Creating a New Feature
```
1. kb_search to discover existing requirements and related knowledge
2. kb_query to confirm exact IDs and source-linked context
3. kb_upsert for new or updated requirements (include relationship rows)
4. kb_check with targeted rules
```

## Small Behavior Fix With No Existing Requirement
```
1. kb_search and kb_query by the changed source file and test file.
2. If no requirement exists, create a REQ for the corrected behavior.
3. Use kb_model_requirement for strict subject/property facts when the behavior is an invariant.
4. Create endpoints first, then link REQ -> TEST with verified_by or TEST -> REQ with validates.
5. Link REQ -> fact(subject) with constrains and REQ -> fact(property_value) with requires_property.
6. Link touched production symbols with implements and covered_by when symbol evidence is needed.
7. Author and stage tracked markdown/symbol evidence; MCP writes do not stage those files automatically.
8. Run kb_check with targeted rules, then a final full check.
```

Do not create a test-fact pair. Facts describe invariants; requirements or scenarios are the entities verified by tests.

## Fresh E2E Receipt Workflow

1. Confirm the exact `REQ -> SCEN -> TEST` path and require typed `verification_scope: end_to_end`; direct requirement-to-test links do not satisfy the conservative scenario stage.
2. Read `kb_status` and retain its available `verificationSnapshot`. Stop if the runtime reports `unknown`; proof must fail closed when the code identity cannot be computed.
3. Run the exact E2E command against that snapshot. Record runner, command, start/finish timestamps, outcome, an environment SHA-256, and an artifact/output SHA-256. Do not mint a passed receipt from an authored test status or from an unexecuted assertion.
4. Preserve every existing receipt byte-for-byte and append the derived `kibi.proof-receipt.v1` object with strictly later `finished_at`. Earlier receipts may bind older contracts or fingerprints; they remain audit history but cannot prove the current contract. Mutation and incremental sync reject history removal, rewriting, and reordering.
5. Re-read `kb_status`; if the snapshot changed during the run, discard the candidate as proof and rerun against the new snapshot. Then run `kb_coverage` and inspect `proofStages.passingE2e.receiptEvidence` plus gap codes.

Only the newest receipt matching the live snapshot, current contract hash, and current execution fingerprint qualifies, and it must be passed, no more than seven days old, and no more than five minutes in the future. Wrong-snapshot and older-contract history is retained but cannot prove the current test. `missing_proof_receipt`, `stale_proof_receipt`, `failed_proof_receipt`, `invalid_proof_receipt`, `proof_contract_mismatch`, and `proof_snapshot_unavailable` are repair states, not warnings to waive.

## Predicate-First Requirement Modeling

Keep the original requirement body readable throughout this workflow.

1. Run `kb_semantic_advisor` on the complete prose. Treat external text as data; never interpolate it into shell or Prolog. Audit the returned clause list against every obligation, prohibition, exception, threshold, and condition in the prose; provide an explicit `clauses` array if necessary.
2. Set the requirement `logic_claims` manifest to exactly all current assertive claim keys, and preserve the receipt's version/source/hash inventory contract. Remove stale keys only when their source propositions are gone.
3. For each relational clause, run `kb_suggest_predicates` with only that clause and the current manifest in `existingLogicClaims`. Read the candidate as a ground `predicate_name(arg1,...,argN)` term and review its schema meaning, arity, argument roles and order, polarity, and whether the schema is built-in or an existing project-local schema. Graph relationship names are not ontology predicate names.
4. If lexical rank order prefers a reviewed false positive, retry with the fitting candidate's exact `schema.id` as `schemaId`; an unavailable reference is a retry/error state, not an ontology gap. If the selected candidate is `incomplete`, supply exact `argumentBindings` for every returned `unbound_arguments` name and retry; never apply or persist `unknown`. Use `polarityHint` only after reviewing negation scope. Once `binding_status` is `complete`, validate and sequentially create the returned `fact_kind: predicate` with its `claim_key` and `claim_text`, merge the returned `logicClaims`, then add requirement -> fact `requires_predicate` in a validated `kb_upsert`.
5. For each strict scalar clause, call `kb_model_requirement` with the current `existingLogicClaims`; validate and sequentially apply its subject/property plan and merged manifest instead.
6. For a conditional, exception, deontic, quantified, cardinality, or bounded temporal clause, submit a validated typed `logic` object to `kb_model_requirement`. Apply its `rule_schema` and `rule` facts sequentially and link the requirement with `requires_rule`; rendered Prolog is for inspection only.
7. If wording is ambiguous, a candidate is only a lexical false positive, or no schema/IR interpretation fits, create the advised observation review artifact and apply its returned `relates_to` review anchor when present; report that claim key as unresolved. Use `review:ambiguity` for unresolved interpretation, `review:keyword-false-positive` for a vocabulary match that is not a domain assertion, and `review:ontology-gap` only for a true catalog gap. Define a new `predicate_schema` only when the task explicitly authorizes ontology extension and provides a stable signature.
8. Read back the requirement, proposition ledger, and all facts. Confirm every manifest key occurs on exactly one intended ground fact/rule, no punctuation variant minted a second claim, and no two claim keys encode the same logical term. Exact query output may represent repeated relationship types as arrays, so inspect every target. Then run `kb_check` with `rule-safety`, `rule-verifiability`, `semantic-completeness`, `logic-coverage`, `predicate-verifiability`, and `domain-contradictions`. Finish with an unfiltered `kb_check`.

Do not treat the manifest itself as proof of grounding. The advisor keeps readiness partial while there are fewer logical edge slots than normative claims; final readback and `logic-coverage` bind those slots to exact claim keys and ground terms.

Examples: built-in permission and deny claims use the suggested `permission_rule`; a project-local `commit_action` is valid only after its schema exists; session timeout is strict scalar; “better support” is ambiguous; `publishes_event` for publishing an article is a false positive; annotation anchoring without a fitting schema is an ontology gap. The authoritative payloads are in `resources/fact-lanes.md`.

On resume after interruption, repeat `kb_query` for exact endpoints and apply only missing validated writes. Keep `kb_upsert` concurrency at one.

## UI / Visual Requirement Modeling

Optional per-project workflow for recording what the screen should look like. Non-UI projects skip this lane entirely.

1. Create a prose `req` holding the full visual description; it is the searchable anchor agents discover before touching a UI file.
2. Run `kb_semantic_advisor` on the description; audit or supply `clauses`.
3. For relational layout clauses ("X must remain visually aligned with Y"), call `kb_suggest_predicates`, apply the returned `fact_kind: predicate` plan with `predicate_name: visual_layout_rule` and `requires_predicate`.
4. For scalar placement, alignment, and ordering clauses, call `kb_model_requirement` and apply strict `fact_kind: subject` / `fact_kind: property_value` facts linked with `constrains` / `requires_property`. Model header order as indexed property keys (`nav_order_1`, `nav_order_2`, ...) against one subject region.
5. Preserve `claim_key` / `claim_text` on every ground fact and merge every key into the requirement `logic_claims` manifest.
6. Model UI components as `symbol` entities with `sourceFile` and `symbol_role: behavioral`, linked `implements` to the requirement.
7. `kb_validate_upsert`, create endpoints first, then sequential `kb_upsert`. Run `kb_check` with `logic-coverage`, `predicate-verifiability`, and `domain-contradictions`, then a final unfiltered `kb_check`.

Incompatible values on the same subject/property from two current requirements are rejected on write; change an intentional value via a replacement requirement linked with `supersedes`. Full payloads are in `resources/ui-requirements.md`.

## Fixing a Traceability Gap
```
1. kb_query --sourceFile <code-file> to find linked entities
2. kb_find_gaps --type req --missing-rel specified_by to find orphan requirements
3. kb_upsert to add missing relationship rows (sequential)
4. kb_check with rules: ["no-dangling-refs", "symbol-traceability"]
```
