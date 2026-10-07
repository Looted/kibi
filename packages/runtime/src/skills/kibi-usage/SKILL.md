---
id: kibi-usage
name: Kibi Usage
description: Use Kibi's source-first, exact-Git, migration-aware, proof-aware operations safely across MCP or the trusted local CLI, including partial completion repair.
version: 2.6.0
kibiCompatibility: ">=1.0.0"
tags:
  - kibi
  - mcp
  - cli
  - source-first
  - branching
  - traceability
  - recovery
resources:
  - resources/operation-access.md
  - resources/branch-lifecycle.md
  - resources/source-authoring.md
  - resources/relationship-directions.md
  - resources/fact-lanes.md
  - resources/workflows.md
  - resources/proof.md
  - resources/ui-requirements.md
  - resources/logic-ir.md
  - resources/kb-improvement.md
---
# Kibi Usage

Consult this skill before any Kibi knowledge base operation, on first
interaction with a Kibi-enabled repo, after stale or dirty status is suspected,
and before mutations.

Kibi is an agent-native requirements compiler. Use it to retain product intent,
compile branch-local requirements and scenarios, link symbols to ownership,
and prove implementation with fresh evidence.

## Interface Selection

Use whichever capability is visible and approved. The surfaces are equal peers:

1. If approved Kibi MCP tools are visible, use them.
2. Otherwise use `npx --no-install kibi ...` from the trusted project-local CLI.
3. If the operator capability is unavailable or too old for the needed route,
   stop and identify the missing capability.
4. Never use a global fallback, an installing runner, or an unapproved route.

Hosts may expose prefixed identifiers such as `kibi_kb_search`,
`kibi_kb_query`, and `kibi_kb_upsert`; map them to the canonical MCP names.

The MCP server keeps its tool list short. Load skills with `kb_skills`
(`action: "list" | "load" | "read"`; CLI `kibi skill` or `kibi skills
list|load|read`). Model prose with `kb_model` (`mode: "analyze"` for the
semantic advisor, `"requirement"` for strict claims, `"predicates"` for
ontology predicates; CLI `kibi model` or `semantic-advisor`,
`model-requirement`, `suggest-predicates`). Preflight a write with
`kb_upsert` plus `dryRun: true` (CLI `upsert` with `"dryRun": true` or
`validate-upsert`); it validates and writes nothing. Result payloads still name
catalog operations such as `kb_model_requirement` or `kb_validate_upsert` in
`recommended_tools` and repair steps; translate them with the list in
`resources/operation-access.md`.

The CLI JSON route accepts the same business object as MCP:

```bash
printf '%s\n' '{"query":"checkout","limit":10}' | npx --no-install kibi search --input -
```

Read `resources/operation-access.md` for the route, result version, effects,
mutability, and Prolog requirements of each operation.

## Working in a git worktree or another directory

Kibi MCP servers start in one project and answer from its knowledge base.
Every Kibi MCP tool accepts `workspaceRoot`: when your working directory is not
the project the server started in (a git worktree, a sibling checkout), pass
your working directory as `workspaceRoot` on every call. Host plugins with
pre-tool hooks add it for you. The server answers from that workspace when it
is a worktree of the same repository or lies under the client's MCP roots.

If a result carries a `workspace_mismatch` diagnostic, the answer came from a
different workspace than the one you asked for; its `detail.reason` says why.
Use the CLI from your working directory instead: `npx --no-install kibi ...`
runs where you are and needs no `workspaceRoot`.

## Safe workflow

1. Always discover before you mutate: start with `kb_search`, then exact-filter with `kb_query`. Use
   `kb_status` when branch or freshness confidence matters. `kb_search`
   defaults to intent ranking, so you can ask it a question ("what governs
   checkout rounding?"); its `data.answer` layer lists the current governing
   requirements with linked facts, scenarios, tests, and ADRs, separates
   superseded requirements, and labels observations as notes. Each governing
   requirement also carries a `verdict` (`contradiction`, `infeasible`,
   `unknown`, or `none`, which is not proof), the `exceptions` that exempt it,
   and the `unknowns` the checks could not decide. Those links and verdicts are
   discovery, not proof. Pass `sourceLocations` before changing a source file,
   and `rankingMode: "legacy"` for literal identifier lookups. See
   `resources/workflows.md` for the mode recipe.
2. Resolve genuine ambiguity with the human; use `kb_model` for deterministic
   interpretation and typed facts.
3. Create endpoints before relationships and upsert small batches sequentially.
   Keep the canonical `REQ-* -> SCEN-* -> TEST-*` chain.
4. Author tracked Markdown/YAML/manifests and relationship shards through Kibi;
   Kibi never Git-stages or commits those files. Do not read or edit `.kb`
   directly.
5. Finish with targeted and final `kb_check`, then read status/coverage and
   report the five independent closeout fields (not one inferred success flag).

Run `kb_check` with specific rules during iteration and the unfiltered final
check. Never fire `kb_upsert` calls in parallel; create or confirm endpoint
entities before linking them. The canonical MCP names are `kb_search`,
`kb_query`, `kb_model`, `kb_upsert`, and `kb_check`.

For a task that explicitly supplies a malformed concrete mutation payload, locate and read that public request artifact before choosing an entity, preserving its exact entity ID, type, requested changes, and every intended relationship and endpoint. Do not substitute a seeded or convenient entity for the requested target. Start with kb_search, then exact-filter those targets with kb_query, and run kb_upsert with dryRun: true on that same payload (CLI: validate-upsert); validation is not completion. Correct only diagnosed pre-commit errors and revalidate the corrected payload. Once authorized, apply the identical corrected and authorized payload with kb_upsert. If it returns committed_with_repairs, treat the mutation as committed, follow only the required repair actions, and neither retry it nor trigger unrelated semantic backfill for a schema-only repair. Exact-read every changed entity and relationship endpoint with kb_query, then finish with an unfiltered kb_check followed by a final kb_status.

## Closeout fields

End every task with these five independent fields:

```text
taskOutcome: complete | interim | blocked
kbState: clean_fresh | stale | dirty | legacy_compat | not_evaluated
verificationState: fresh | dirty | unavailable | not_evaluated
proofState: proven | mixed | unresolved | not_evaluated
limitationDisposition: none | accepted | unaccepted | not_applicable
```

`taskOutcome` is whether the requested work finished. The other fields are
observed system state. A clean check can coexist with unresolved proof.

## Exact Git attachment

The active ref is the exact KB identity. `KIBI_BRANCH` is used verbatim; Git's
symbolic HEAD is used otherwise. Slash, `@`, Unicode, `main`, `master`, and
detached states are not normalized or merged. Hashed stores and their
`branch.json` identity fence are compiled artifacts. A missing exact store is
created by `kibi sync` from this checkout's tracked sources. Kibi never copies
stores across branches and never selects merge winners; unresolved authored Git
conflicts block compilation. See `resources/branch-lifecycle.md` for legacy
migration, worktrees, quarantine, restore, and purge.

## Typed results and recovery

Every CLI JSON/MCP result has `kibiProtocol`, `operation`, `resultVersion`,
`status`, `data`, `effects`, `diagnostics`, and typed `nextActions`.
`status: error` normally means a failed pre-commit operation. The bootstrap
error `BOOTSTRAP_PLAN_REJECTED` can follow earlier committed actions: inspect
`data.actionResults` and `data.applied`, then re-plan from the current state.
Its journal is terminal; never recover or replay it. `BOOTSTRAP_PLAN_INVALID`
fails preflight before bootstrap writes or a new journal; obtain a corrected
plan. If the status is
`committed_with_repairs`, the mutation already committed: inspect failed effects,
execute each required repair action in order, and never retry the original
operation. Record effect failures, followed actions, and unsafe retries in
diagnostic telemetry.

## Entity body contract

The body is where context lives; front matter is the checked meaning.
`kb_check` rule `entity-context-missing` blocks a current `req`, `scenario`,
`test`, `adr` or observation/meta `fact` whose body carries no context: at
least 12 words that are not a restatement of the title (for a requirement, also
not of `semantic_text`). Symbols, flags, events and every other fact kind are
exempt. `kb_upsert` returns the same finding as a warning, including on dryRun.

- `req`: the statement, then `## Context` (why, who asked, constraints) and
  `## Source` (blockquoted excerpt plus reference). Only text under context
  headings (Context, Rationale, Why, Background, Source, Notes, Evidence)
  counts for a requirement, and it never changes the checked meaning:
  `semantic_text` is written explicitly and context sections are excluded.
- `scenario`: Given/When/Then prose plus the assumptions it depends on.
- `test`: what it asserts, how (fixture, entry point), what would make it a
  false pass.
- `fact` (`observation`/`meta`): what was seen, where, when, how confirmed.
- Never invent a reason the requester did not give. Write "Reason not stated"
  and the source instead.
- The tag `review:context-missing` is reserved for entities the schema 8
  migration (`kibi migrate`) acknowledged and recorded in the manifest; it is
  counted by the advisory `entity-context-acknowledged`. Never add it yourself:
  on any other entity it is still a violation. Write who asked, the source and
  "Reason not stated" in the Context section instead.
- `kb_plan_compile_intent` requires `context` when the plan creates a
  requirement, and accepts `sourceExcerpt` and `sourceReference`. On update it
  rewrites the statement and keeps the existing context sections unless you
  supply new `context` or source.

## Source-first mutation

Use `document.path` when a new entity has no single configured writable target.
Existing entities preserve body bytes when `document.body` is omitted; a new
requirement without `document.body` gets `semantic_text` as its body, and
`kb_check` then blocks it with `entity-context-missing`, so always pass a
sectioned `document.body` (see Entity body contract). Relationship mutations
patch canonical shards while preserving unrelated records. Authored entity
deletion returns a hash-bound approval plan; requirements normally evolve via a
new entity linked with `supersedes`; set the replaced requirement to
`status: closed` in the same change, because `kb_check` blocks an open
superseded requirement and supersession cycles. Kibi compiles `source` from
the entity's own file and never writes an authored `source` field, so
`kb_upsert` cannot change one. When `kb_check` blocks a leftover value
(`source-path-dangling`), run `kibi migrate`: its automatic
`source_path_rewrite` action removes the value, or rewrites it when the file
moved. Never hand-edit `.kb/` for it. Read `resources/source-authoring.md`
before source writes, deletion approval, or recovery.

`kb_apply_plan` applies a whole plan atomically: a failure changes nothing.
An interrupted plan is settled by the next `kb_apply_plan`, `kb_upsert`, or
`kb_delete` call, or by `kb_apply_plan` with its `recoveryJournalId`; never
re-apply the original plan. On a detached HEAD, reads answer from a read-only
snapshot and writes are refused; check out a branch before mutating.

## Origin and approvals

Entities record `origin` (`kind`: `human`, `agent`, `migration`, or `import`,
plus optional `ref` and `approved_by`). `kb_upsert` records `kind: agent` on
entities you create; leave `origin.approved_by` to the person who reviews them.
An exception (a requirement that `exempts` another) exempts nothing until a
human sets `approved_by`; `kb_check` flags approvals an agent recorded without
corroboration. Never fill in an approval yourself. Record why a requirement
exists in `rationale`, or link the ADR that explains it.

Conditional clauses ("only when", "only if", "must not ... unless") compile
into typed `forbid` rules linked by `requires_rule`, not property facts; one
`kb_model` or `kb_compile_intent` cannot translate stays an `ontology_gap`.

## Semantic and proof guardrails

Prolog proves only encoded facts. Keep ambiguity, ontology gaps, incomplete
grounding, stale snapshots, and failed or unavailable evidence explicit. Use
`fact_kind: subject` plus `property_value`/`predicate` lanes for contradiction-
safe normative claims; use `observation` or `meta` for bug/workaround notes and
`flag` only for actual runtime/config gates. Requirements require scenarios,
tests, symbol ownership, and fresh proof-bearing receipts before claiming proof.
For an existing product KB that needs semantic backfill, read
`resources/kb-improvement.md`, and `resources/proof.md` for the proof workflow.
When a proof ratchet fails, follow Debugging proof regressions in
`resources/proof.md`: use `kibi proof explain` and compare current proof state
to committed `proof/baseline.json` with `kibi proof impact`.

## Predicate Ontology Decision Tree

Call `kb_model` with `mode: "analyze"` on the complete prose before encoding a clause.
Set requirement `logic_claims` to exactly the assertive `claim_key` values.
For each relational clause, call `kb_model` with `mode: "predicates"`, that clause, and
`existingLogicClaims`. If lexical rank is a false positive, retry with the
reviewed `schemaId`. If `binding_status` is `incomplete`, supply
`argumentBindings` and retry. Persist `fact_kind: predicate` with the same
`claim_key` / `claim_text`, then link `REQ -> fact` with `requires_predicate`.
Use `kb_model` with `mode: "requirement"` for strict scalar clauses. Use
`fact_kind: observation` only for a true ontology gap. The manifest is not
grounding: run `logic-coverage` so each key binds to one ground fact.
Relationship direction is fixed, and every `from` in a relationship batch
must equal the upserted entity ID.

Worked example. `recommendedAction: "provide_argument_bindings"` means a
schema fits but `unbound_arguments` lists roles Kibi could not read from the
prose. Bind them from the claim's own words and call again with the same
`text` and `requirementId`, plus `schemaId` and `argumentBindings` keyed by
`argument_names` (reuse `argument_constants` values when the schema has them):

```json
{"mode":"predicates","text":"Only an annotation owner may delete an annotation.","requirementId":"REQ-annotation-delete-owner","schemaId":"FACT-SCHEMA-PERMISSION-RULE","argumentBindings":{"actor":"annotation_owner","action":"delete","resource":"annotation","decision":"allow"}}
```

When the retry returns `apply_requires_predicate`, write its `applyPlan` fact,
then the `relationshipPlan` `requires_predicate` row; its target is
`relationshipTarget` (the planned `FACT-PRED-…` id), never a candidate's
`SUGGEST-…` id. A non-empty `existingGrounding` means the requirement already
grounds the claim (for example a bootstrap `requires_property` fact); the action
still names the predicate state. `replace_grounding` means a predicate fits but
a second grounding link would fail, so keep the existing link or follow
`replacementPlan`; `provide_argument_bindings` and `record_ontology_gap` mean
the same as for an ungrounded claim, and the gap observation is not a grounding
link, so write it. Record an ontology gap only when no returned schema fits the
claim, not because bindings were missing.
A review note is an observation that quotes its claim without `claim_key`, with
its prose in `document.body`:
`{"type":"fact","id":"FACT-review-<area>-<behavior>","properties":{"title":"Review: ...","status":"active","fact_kind":"observation","text_ref":"<sourceId>:<reference>","tags":["review:invalid-write"],"claim_text":"<the claim>"},"document":{"body":"<why it needs review, who raised it, the source>"}}`.

To add `specified_by` (or another relationship) to an existing requirement,
upsert it with its stored `title`, a `status` and the relationship only; Kibi
keeps the stored proposition ledger when no `semantic_*` or `logic_claims`
field is sent and `title`/`text_ref` are unchanged.

For conditional relational claims, after the initial `kb_model` predicates call and before any `kb_upsert`—including one needed for a missing schema—call read-only `kb_model` with `mode: "requirement"` to preview suitable scalar or typed-rule modeling. Treat the preview as advisory: do not apply an irrelevant result or create unrequested facts, and retain an approved ground-predicate plan when it captures the whole claim. Preserve supplied arity, ordered argument roles, polarity, bound values, and one claim key per actual assertion; never split arguments across clauses or schemas or alter values to force uniqueness.

## Symbol-First Traceability

Represent implementation ownership with a `symbol` entity that has
`sourceFile`, `implements` to the requirement, and `covered_by` to the test.
Prolog `symbol-coverage` also requires the test to `validates` the requirement
(or the requirement `verified_by` the test). `covered_by` alone is not
enough. Do not rely on legacy `// implements REQ-<area>-<behavior>` comments as the
traceability record.

## Complete Logical Coverage

Decompose all atomic normative clauses into `claim_key`/`claim_text` entries in
`logic_claims`; human or agent review still confirms that the atomic clauses
exhaust the prose. Run `logic-coverage` and `domain-contradictions` after
modeling. Use `status: implemented` only as historical input; use a valid status
such as `closed`, add an `implemented` tag, and link evidence instead.

## Anti-Patterns and Remediation

Reject reversed relationship direction, a Bug-as-flag record without a runtime
gate, direct KB-store edits, and a generic `strict kb_upsert.properties` field.
Keep symbol payloads minimal. When a generic `Query failed` appears, do not keep
retrying the same payload; inspect the typed error and `nextActions`.

Kibi may now author tracked Markdown/YAML evidence transactionally. The former
statement “Kibi operation writes do not automatically stage markdown evidence”
means Kibi writes do not Git-stage it: review and commit remain ordinary Git
workflows.
