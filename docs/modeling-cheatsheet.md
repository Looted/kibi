# Kibi Modeling Cheatsheet

Use this one-page guide when deciding how to model knowledge through peer MCP tools or dedicated CLI JSON routes.

## Decision Tree

1. **Starting from raw normative prose?** Call `kb_semantic_advisor` with the complete body. Audit its clause split and supply `clauses` when needed so every atomic obligation, prohibition, exception, condition, and threshold has a stable claim key.
2. **About to write/update a normative requirement?** Run `kb_validate_upsert` first and inspect `semanticAdvisor`. If it reports `needs_modeling`, repair the payload before treating the requirement as Prolog-checkable.
3. **Runtime/config gate?** Use `flag`, then link with `guards`.
4. **Bug, incident, workaround, audit note, or migration evidence?** Use `fact` with `fact_kind: observation` or `fact_kind: meta`.
5. **For each normative property/value/limit clause?** Use a requirement plus strict facts:
   - `fact_kind: subject` with `subject_key`, linked from the requirement by `constrains`.
   - `fact_kind: property_value` with `subject_key`, `property_key`, `operator`, `value_type`, and exactly one `value_*`, linked by `requires_property`.
   - Prefer `kb_model_requirement` when starting from prose.
6. **For each relational domain clause?** Call `kb_suggest_predicates`, then write `fact_kind: predicate` with `predicate_name`, `predicate_args`, and `canonical_key`, linked by `requires_predicate`. For conditions, exceptions, modalities, quantifiers, cardinality, or bounded temporal clauses, submit typed `kibi.logic.v1` to `kb_model_requirement`, persist `rule_schema` + `rule`, and link with `requires_rule`.
7. **BDD behavior?** Use `scenario`, linked with `specified_by`.
8. **Executable evidence?** Use `test`, linked with `verified_by` or `validates`.
   - When the requirement has a `scenario`, this link must target the scenario: use `verified_by(Scenario, Test)` or `validates(Test, Scenario)`. Directly linking `verified_by(Req, Test)` and `validates(Test, Req)` does not satisfy scenario-aware symbol-coverage.
   - For small behavior fixes discovered from source, create or update a `req` for the observable behavior. Link strict or observation facts from that requirement, then link the requirement or scenario to the executable test. Do not create direct `fact -> test` / `test -> fact` verification shortcuts.
9. **Code ownership or coverage?** Use `symbol`, linked with `implements`, `covered_by`, or `executable_for`.
10. **Storing visual/UI layout expectations** (button placement, centered content, header items, alignment)? Use the UI modeling lane in `docs/ui-requirements.md`: prose `req` for the full screen description, strict `property_value` facts for checkable positions/alignment/order, and `visual_layout_rule` (or a project-local `predicate_schema`) for relational layout. Optional and per-project; non-UI projects skip it.

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
    "canonical_key": "user.session.timeout_minutes.lte.30",
    "claim_key": "CLAIM-0123456789ABCDEF",
    "claim_text": "Sessions must time out within 30 minutes."
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
    "canonical_key": "commit_action(editor.annotation,navigation,draft)",
    "claim_key": "CLAIM-FEDCBA9876543210",
    "claim_text": "Editor annotation drafts must autosave on navigation."
  }
}
```

## UI / visual requirement lane

For projects with a UI that must record what the screen should look like, store the full
visual description as prose in a `req` and decompose checkable invariants into strict or
predicate facts:

- Strict placement/alignment/order invariants: `fact_kind: subject` (`subject_key`) linked
  via `constrains`, plus `fact_kind: property_value` (`property_key`, `operator`, typed
  `value_*`) linked via `requires_property`. Incompatible values on the same subject/property
  from two current requirements are rejected on write unless `supersedes`.
- Relational layout ("X must remain visually aligned with Y"): the built-in
  `visual_layout_rule(subject, relation, target)` predicate linked via `requires_predicate`.
- UI components: `symbol` with `sourceFile` and `symbol_role: behavioral`, linked `implements`
  to the requirement so component edits surface the visual spec in impact diagnostics.

This lane is optional; a non-UI project simply never models UI subjects. See
`docs/ui-requirements.md` for payload-shaped examples and the full workflow.

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

The claim keys above are illustrative. Always use the stable key returned for the exact clause text. Store every returned normative key in the requirement-only `logic_claims` array, merge rather than replace existing keys, and preserve `claim_key` plus `claim_text` together on every ground `property_value`, `predicate`, or `rule` fact. Preserve the full `semantic_inventory` proposition ledger; an observation does not ground a claim.

`kb_model_requirement` accepts semantic claim inputs such as `subjectKey`, `propertyKey`, and `existingLogicClaims`. `kb_suggest_predicates` also accepts `existingLogicClaims`. `kb_upsert.properties` does not accept camelCase modeling inputs. For `kb_upsert`, use snake_case only: `logic_claims`, `claim_key`, `claim_text`, `subject_key`, `property_key`, `predicate_name`, `predicate_args`, `canonical_key`, `closed_world`, `value_type`, and one typed `value_*` field.

## Semantic advisor receipts

`kb_validate_upsert` and successful `kb_upsert` responses may include semantic advisor receipts for requirements. The receipt contains `clauses` and `logic_coverage`, including expected, declared, missing, and unresolved claim keys. A receipt with `logic_readiness: needs_modeling` means at least one clause still needs work. Inspect `suggestions` for one of four reviewable paths:

- `strict_property` — draft subject/property facts plus requirement relationships.
- `predicate` — draft ontology predicate fact and relationship guidance.
- `ambiguity_observation` — observation artifact when prose has competing interpretations.
- `ontology_gap` — observation artifact plus a recommended predicate schema when the claim is logical but unsupported.

Suggestions are non-blocking and must be reviewed before applying; they are not enforcement receipts. Current deterministic coverage includes:

- **Strict property suggestions:** multi-claim prose, cardinality, thresholds with units, retention/expiry durations, booleans, enum sets, and comparative numeric constraints.
- **Ontology predicate suggestions:** permissions and prohibitions, defaults, uniqueness constraints, state memberships, state transitions, conditional behavior, temporal ordering, rate limits, exception rules, mutual exclusion, dependency rules, ownership, retry policies, escalation rules, availability SLAs, notification routing, idempotency, data residency, audit logging, consent prerequisites, lifecycle archive/delete/expiry rules, conflict-resolution strategies, fallback/degradation behavior, batch operations, cross-entity consistency/reference requirements, build constraints, environment-safety rules, schema invariants, coding standards, migration boundaries, absence/removal requirements, offline behavior, release gates, platform consistency, preservation rules, abstraction boundaries, security configuration, ordered strategies, refresh policies, scoped authorization, documentation standards, warmup policies, visual layout rules, enforcement-location rules, reconciliation rules, and throttling policies.
- **Review artifacts:** ambiguity observations and ontology-gap observations when a claim is logical but not safely grounded by the current deterministic catalog.

When an exact predicate suggestion exists, prefer its `applyPlan` and `requires_predicate` relationship guidance over generic prose notes. The receipt-level `candidate_lane` and `suggested_next_tools` are aligned to exact suggestions, so numeric-looking predicate claims such as lifecycle or batching rules can still correctly route to `kb_suggest_predicates`.

After writes, run `kb_check` with `logic-coverage`, `predicate-verifiability`, and `domain-contradictions`. `logic-coverage` verifies that every declared claim key has a matching linked ground fact and that linked ground facts appear in the manifest. It does not prove that an automatic clause split exhausts arbitrary natural language; that boundary remains an explicit review obligation. Exact `assert`/`deny` facts over the same predicate namespace, name, and ordered arguments do participate in `domain-contradictions`.

Do not invent or copy a claim key between clauses. Kibi mutation and Markdown sync surfaces recompute the stable key from `claim_text` and reject mismatches; preserve the exact key returned by `kb_semantic_advisor` for that atomic clause.

## Quality diagnostics lane

`kibi check`, MCP `kb_check`, staged impact checks, coverage reports, and OpenCode scheduled checks can surface non-blocking `qualityDiagnostics[]` alongside hard `violations[]`. Treat `violations[]` as correctness failures to fix before handoff. Treat `qualityDiagnostics[]` as audit review guidance unless `blocking: true` or `severity: "error"` is present.

Common review diagnostics map to modeling actions:

- Broad requirement or multi-requirement symbol: split the requirement/symbol into one observable behavior per anchor, or document a valid umbrella/module rationale.
- Logical coverage review: decompose the complete requirement, use `kb_model_requirement` or `kb_suggest_predicates` per clause, and validate the claim manifest.
- Coverage-depth review: add typed `verification_scope` / `verification_perspective` fields to test entities and prefer direct/scenario e2e evidence when the behavior crosses an external boundary.
- Duplicate coordinate review: refresh symbol coordinates through the CLI sync workflow and keep modeled symbol IDs distinct enough to identify the behavioral anchor.
