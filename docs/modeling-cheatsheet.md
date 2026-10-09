# Kibi Modeling Cheatsheet

Use this one-page guide when deciding how to model knowledge through peer MCP tools or dedicated CLI JSON routes.

## Decision Tree

1. **Starting from raw normative prose?** Call `kb_model` with `mode: "analyze"` and the complete body. Audit its clause split and supply `clauses` when needed so every atomic obligation, prohibition, exception, condition, and threshold has a stable claim key.
2. **About to write/update a normative requirement?** Run `kb_upsert` with `dryRun: true` first and inspect `semanticAdvisor`. If it reports `needs_modeling`, repair the payload before treating the requirement as Prolog-checkable.
3. **Runtime/config gate?** Use `flag`, then link with `guards`.
4. **Bug, incident, workaround, audit note, or migration evidence?** Use `fact` with `fact_kind: observation` or `fact_kind: meta`. A bootstrap provider entry with no claim is a `meta` fact tagged `bootstrap:provenance-stub`; never add such a tag to a fact that states something, and never treat a stub as evidence for a requirement.
5. **For each normative property/value/limit clause?** Use a requirement plus strict facts:
   - `fact_kind: subject` with `subject_key`, linked from the requirement by `constrains`.
   - `fact_kind: property_value` with `subject_key`, `property_key`, `operator`, `value_type`, and exactly one `value_*`, linked by `requires_property`.
   - Prefer `kb_model` with `mode: "requirement"` when starting from prose.
6. **For each relational domain clause?** Call `kb_model` with `mode: "predicates"`, then write `fact_kind: predicate` with `predicate_name`, `predicate_args`, and `canonical_key`, linked by `requires_predicate`. For conditions, exceptions, modalities, quantifiers, cardinality, or bounded temporal clauses, submit typed `kibi.logic.v1` to `kb_model` with `mode: "requirement"`, persist `rule_schema` + `rule`, and link with `requires_rule`.
   - A conditional clause ("checkout may happen only when the cart total is positive", "checkout must not happen unless ...") restricts an action; it is a rule, not a property of every situation. `kb_compile_intent` and `kb_model` (`mode: "requirement"`) translate one comparison on one subject property into a `forbid` rule with that exception, linked by `requires_rule`. A conditional they cannot translate (several conditions, pronouns, relations) stays an `ontology_gap` in the inventory with no observation and no property; supply the typed rule yourself.
7. **BDD behavior?** Use `scenario`, linked with `specified_by`. A scenario that expects success and `assumes` values is checked against current requirements' property facts and rules (see `docs/inference-rules.md`). A human-approved exception requirement (`exempts` the base requirement, `specified_by` the scenario, `approved_by` set) waives the base requirement for that scenario only; `exempts_claims` narrows the waiver to the listed claim keys.
8. **Executable evidence?** Use `test`, linked with `verified_by` or `validates`.
   - When the requirement has a `scenario`, this link must target the scenario: use `verified_by(Scenario, Test)` or `validates(Test, Scenario)`. Directly linking `verified_by(Req, Test)` and `validates(Test, Req)` does not satisfy scenario-aware symbol-coverage.
   - For small behavior fixes discovered from source, create or update a `req` for the observable behavior. Link strict or observation facts from that requirement, then link the requirement or scenario to the executable test. Do not create direct `fact -> test` / `test -> fact` verification shortcuts.
9. **Code ownership or coverage?** Use `symbol`, linked with `implements`, `covered_by`, or `executable_for`.
10. **Storing visual/UI layout expectations** (button placement, centered content, header items, alignment)? Use the UI modeling lane in `docs/ui-requirements.md`: prose `req` for the full screen description, strict `property_value` facts for checkable positions/alignment/order, and `visual_layout_rule` (or a project-local `predicate_schema`) for relational layout. Optional and per-project; non-UI projects skip it.

## Names and subjects

Name a new entity by the behavior it governs: `<TYPE>-<area>-<behavior>` in kebab-case (`REQ-cli-gc`, `SCEN-mcp-search-discovery`). The filename stem equals the `id`. Search that area first. Update the existing entity when it already covers the behavior. Link `supersedes` when one requirement replaces another, and `restates` (requirement to requirement) when two current requirements intentionally say the same thing. Existing numbered IDs stay valid.

A subject key is dotted `component.aspect[.sub]`: at least two lowercase snake_case segments, such as `docs.site` or `kibi.cli.check.staged`. Never derive it from a requirement ID. `kb_model` with `mode: "requirement"` returns `vocabularyAlignment` with ranked subjects and a `reuse_existing` or `declare_new` decision. Follow that decision. A requirement constrains one subject fact for a given key. Property facts for that subject share the key. A second subject fact with the same key grounds every claim twice.

When a predicate is single-valued per key (one `reading` per `sensor`), add `key_arguments: [sensor]` to its `predicate_schema`. Rule comparison only treats two atoms as the same fact through such a declaration; without it, opposing rules over that predicate stay `unresolved` rather than `disjoint`. The advisory `rule-key-arguments-missing` check names the predicates whose missing declaration is the only thing keeping an opposing rule pair `unresolved`; declare keys only for predicates that really are single-valued per key.

When a predicate schema declares `argument_constants`, new facts must use those values. `argument_aliases` names old spellings that map to a constant; writes reject both undeclared values and aliases. `kibi migrate` can apply the mechanical repairs (the only matching namespace, or an alias rewritten to its constant) after you approve the plan hash.

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

### Review observation for a claim Kibi could not write

When a claim cannot be written yet (an `invalid_write`, an ontology gap, an open question), record it as a review observation. Quote the claim in `claim_text`; an observation is a non-grounding note, so it takes no `claim_key` and no `requires_*` link:

```json
{
  "type": "fact",
  "id": "FACT-review-mic-failure-error",
  "properties": {
    "title": "Review: microphone failure claim needs a rule",
    "status": "active",
    "fact_kind": "observation",
    "text_ref": "tracker:ED-12",
    "tags": ["review:invalid-write"],
    "claim_text": "If microphone access fails, the editor must present an error instead of silently pretending to record."
  }
}
```

Every other fact kind that carries `claim_text` also needs the matching `claim_key`.

## Writing a scenario

Scenario prose goes in `document.body`, never in `properties` (a `body`, `text` or `description` property is rejected as an unknown property that names `document.body`). `expects` is `success`, `rejection` or `error`. Set it only when the scenario also links `assumes` facts (the `property_value` facts whose values it relies on): Kibi checks feasibility from those values, and `expects` without `assumes` only yields a `scenario-feasibility-unknown` warning. A draft scenario tagged `needs-human-review` omits `expects`:

```json
{
  "type": "scenario",
  "id": "SCEN-editor-mic-failure-error",
  "properties": { "title": "Microphone failure shows an error", "status": "active", "expects": "error" },
  "document": {
    "body": "Given microphone access is denied, when the user starts recording, then the editor shows an error and records nothing.\n\nSupport asked for this after users lost takes they believed were recorded; ticket ED-88.\n"
  },
  "relationships": [
    { "type": "assumes", "from": "SCEN-editor-mic-failure-error", "to": "FACT-editor-mic-permission-denied" }
  ]
}
```

## Linking a scenario to an existing requirement

To add `specified_by` to a requirement that already has a proposition ledger, upsert the requirement with its stored `title`, a `status`, and the relationship only. Kibi keeps the stored ledger when the payload has no `semantic_*` or `logic_claims` field and does not change `title` or `text_ref`:

```json
{
  "type": "req",
  "id": "REQ-editor-mic-failure-error",
  "properties": { "title": "<stored title>", "status": "open" },
  "relationships": [
    { "type": "specified_by", "from": "REQ-editor-mic-failure-error", "to": "SCEN-editor-mic-failure-error" }
  ]
}
```

## Body context example

Front matter holds the checked meaning; the body holds the reasons. A requirement body needs a `## Context` section that is not a restatement of the title.

```markdown
Refunds above 500 EUR require a second approver.

## Context
Finance asked for this after the March audit found two unreviewed large refunds. The 500 EUR threshold was their number; the requester gave no reason for it.

## Source
> Refunds over 500 EUR need a second approver.

Finance audit follow-up, ticket FIN-212.
```

Scenarios and tests keep Given/When/Then prose, assumptions, what is asserted and what would make it a false pass. When the reason was not given, write "Reason not stated"; never invent one. `entity-context-missing` blocks entities without context; `review:context-missing` is reserved for entities the schema 8 migration acknowledged and is not honored on any other entity; write who asked, the source and "Reason not stated" instead.

## Common field-name mistakes

The claim keys above are illustrative. Always use the stable key returned for the exact clause text. Store every returned normative key in the requirement-only `logic_claims` array, merge rather than replace existing keys, and preserve `claim_key` plus `claim_text` together on every ground `property_value`, `predicate`, or `rule` fact. Preserve the full `semantic_inventory` proposition ledger; an observation does not ground a claim.

`kb_model` accepts semantic claim inputs such as `subjectKey`, `propertyKey`, and `existingLogicClaims` in `mode: "requirement"`; `mode: "predicates"` also accepts `existingLogicClaims`. `kb_upsert.properties` does not accept camelCase modeling inputs. For `kb_upsert`, use snake_case only: `logic_claims`, `claim_key`, `claim_text`, `subject_key`, `property_key`, `predicate_name`, `predicate_args`, `canonical_key`, `closed_world`, `value_type`, and one typed `value_*` field.

## Semantic advisor receipts

`kb_upsert` with `dryRun: true` and successful `kb_upsert` responses may include semantic advisor receipts for requirements. The receipt contains `clauses` and `logic_coverage`, including expected, declared, missing, and unresolved claim keys. A receipt with `logic_readiness: needs_modeling` means at least one clause still needs work. Inspect `suggestions` for one of five reviewable paths:

- `strict_property` — draft subject/property facts plus requirement relationships.
- `predicate` — draft ontology predicate fact and relationship guidance.
- `ambiguity_observation` — observation artifact when prose has competing interpretations.
- `ontology_gap` — observation artifact plus a recommended predicate schema when the claim is logical but unsupported.
- `rule` — a validated `kibi.logic.v1` rule, from a host interpretation or from a conditional clause ("only when", "only if", "must not ... unless") the advisor translated; link it with `requires_rule`.

Suggestions are non-blocking and must be reviewed before applying; they are not enforcement receipts. Current deterministic coverage includes:

- **Strict property suggestions:** multi-claim prose, cardinality, thresholds with units, retention/expiry durations, booleans, enum sets, and comparative numeric constraints.
- **Ontology predicate suggestions:** permissions and prohibitions, defaults, uniqueness constraints, state memberships, state transitions, conditional behavior, temporal ordering, rate limits, exception rules, mutual exclusion, dependency rules, ownership, retry policies, escalation rules, availability SLAs, notification routing, idempotency, data residency, audit logging, consent prerequisites, lifecycle archive/delete/expiry rules, conflict-resolution strategies, fallback/degradation behavior, batch operations, cross-entity consistency/reference requirements, build constraints, environment-safety rules, schema invariants, coding standards, migration boundaries, absence/removal requirements, offline behavior, release gates, platform consistency, preservation rules, abstraction boundaries, security configuration, ordered strategies, refresh policies, scoped authorization, documentation standards, warmup policies, visual layout rules, enforcement-location rules, reconciliation rules, and throttling policies.
- **Review artifacts:** ambiguity observations and ontology-gap observations when a claim is logical but not safely grounded by the current deterministic catalog.
- **Bootstrap review facts:** `kb_plan_bootstrap` turns `intentClaims` declared with `kind: observation` or `kind: open_question`, and each declared `conflicts` entry, into `fact_kind: observation` facts that cite their source (`text_ref: <sourceId>:<reference>`). Open questions carry `review:open-question` and conflicts `review:conflict`; none of them is a requirement or enters the contradiction lane. Resolve them with the human, then author the outcome as a normal `req`.

When an exact predicate suggestion exists, prefer its `applyPlan` and `requires_predicate` relationship guidance over generic prose notes. The receipt-level `candidate_lane` and `suggested_next_tools` are aligned to exact suggestions, so numeric-looking predicate claims such as lifecycle or batching rules can still correctly route to `kb_suggest_predicates` (call it as `kb_model` with `mode: "predicates"`; these receipt fields name catalog operations).

After writes, run `kb_check` with `logic-coverage`, `predicate-verifiability`, and `domain-contradictions`. `logic-coverage` verifies that every declared claim key has a matching linked ground fact and that linked ground facts appear in the manifest. It does not prove that an automatic clause split exhausts arbitrary natural language; that boundary remains an explicit review obligation. Exact `assert`/`deny` facts over the same predicate namespace, name, and ordered arguments do participate in `domain-contradictions`.

Do not invent or copy a claim key between clauses. Kibi mutation and Markdown sync surfaces recompute the stable key from `claim_text` and reject mismatches; preserve the exact key returned by `kb_model` with `mode: "analyze"` for that atomic clause.

If an upgrade changes how the advisor reads existing prose, `kibi sync` lists every requirement whose stored inventory no longer matches. Run `kibi migrate`: it re-derives those inventories, keeping each claim whose key and text still match (a modeled claim stays modeled with its grounding) and marking new or reclassified claims unresolved. It lists the requirements it cannot re-derive safely, with the exact commands to fix them.

## Origin

Every entity can carry `origin: {kind, ref, approved_by, recorded_at}` (`kind` is `human`, `agent`, `migration` or `import`; typed fields are snake_case). Leave it out of `kb_upsert` unless you have something to add: a new entity is recorded as `{kind: agent, recorded_at}`, and an update without `origin` keeps whatever is stored. Set `ref` to the conversation, ticket or document the content came from. Record `origin.approved_by` only when a named person reviewed the content. An agent must not fill it in on its own; `agent-requirement-unapproved` lists agent-authored requirements nobody has approved yet.

For an exception requirement, `approved_by` is what lets the exception exempt anything. When an agent records it, also set `approval_ref` to the decision record and `origin.approved_by` to the person who confirmed it; otherwise `exception-approval-self-attested` asks a human to confirm.

```json
{
  "type": "req",
  "id": "REQ-quota-promo-exception",
  "properties": {
    "title": "Promotional accounts may exceed the upload quota",
    "status": "open",
    "approved_by": "Dana Lee",
    "approval_ref": "DEC-quota-promo",
    "origin": { "kind": "agent", "ref": "session 2026-10-01", "approved_by": "Dana Lee" }
  }
}
```

## Quality diagnostics lane

`kibi check`, MCP `kb_check`, staged impact checks, coverage reports, and OpenCode scheduled checks can surface non-blocking `qualityDiagnostics[]` alongside hard `violations[]`. Treat `violations[]` as correctness failures to fix before handoff. Treat `qualityDiagnostics[]` as audit review guidance unless `blocking: true` or `severity: "error"` is present.

Common review diagnostics map to modeling actions:

- Broad requirement or multi-requirement symbol: split the requirement/symbol into one observable behavior per anchor, or document a valid umbrella/module rationale.
- Logical coverage review: decompose the complete requirement, use `kb_model` (`mode: "requirement"` or `"predicates"`) per clause, and validate the claim manifest.
- Coverage-depth review: add typed `verification_scope` / `verification_perspective` fields to test entities and prefer direct/scenario e2e evidence when the behavior crosses an external boundary.
- Duplicate coordinate review: refresh symbol coordinates through the CLI sync workflow and keep modeled symbol IDs distinct enough to identify the behavioral anchor.
