---
id: kibi-usage
name: Kibi Usage
description: Use Kibi's source-first, exact-Git, migration-aware, proof-aware operations safely across MCP or the trusted local CLI, including partial completion repair.
version: 2.29.2
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

## Reading a hook snippet

On hosts where Kibi hooks are installed, a short block
arrives before you read or edit a file whose symbols are linked to
requirements. It is projected from `.kb/symbols.yaml`, not from the store, so
it is a pointer to the knowledge, never proof. Each line answers one question:

- `Kibi knowledge for <path> (symbol manifest):` and the `- REQ-… — <symbol
  titles>` rows: the requirements the file's symbols implement, lead
  requirement first. Read the lead requirement with `kb_query({id})` before
  changing behavior; add `includeBody: true` to see its authored prose, and
  fix a stale sentence there with `kb_upsert` `document.body`.
- `REQ-… must keep true: FACT-…` (edit only): the ground facts the lead
  requirement requires. An edit that breaks one of them is a requirement
  change: ask before changing the rule (see Decision firmness), and never
  code around the fact.
- `Decision: ADR-…` (edit only): the decision behind the lead requirement.
- `Covered by: TEST-…` and `Test code for: …`: the tests that prove the
  file's symbols; run or update them with the edit.
- `The edit is inside <symbol>, which implements REQ-…`: the symbol the edit
  lands in.
- `Next layer: …`: the exact `kb_query` and `kb_search(... sourceLocations)`
  calls that return the full detail.
- The `kb_check({sourceFiles:[…], includeImpactDiagnostics:true,
  includeWorkingTreeDiff:true})` line (edit only): run it after the edit. The
  Stop hook reminds you once per session of files edited without it.

A file already shown this session gets only the one-line `Kibi: this edit to
<path> is inside <symbol>` update; the facts and tests from its first snippet
still apply. `Kibi: no symbol in <path> is linked to a requirement yet` means
the file is unowned, not that no rule covers it. When the note names
requirements whose titles share the path's words, `kb_query` each one and
treat a match as the governing rule; otherwise find it with `kb_search` and
`sourceLocations`. Link the symbol that implements it (for markup, the
component that renders it) with `implements` through `kb_upsert`. Without a readable manifest (`Kibi: the hook could not read
.kb/symbols.yaml`) snippets are off for this session; `kb_query({sourceFile})`
still answers and `kibi sync` regenerates the manifest. The search tip and the
`.kb/` note appear once per session and need no action.

Before you edit a source file that Kibi tracks, run `kb_search` with that file in `sourceLocations`, and treat both its ranked results and its `data.answer` layer as discovery only, not as the governing text. Then call `kb_query` by `id` on each current governing requirement that the search names, read what each one requires, and make the edit only after those exact reads. A `kb_check`, `kb_status` or `kb_coverage` result does not replace that `kb_query` read. This rule only adds an exact read before the edit and does not change the order of any other step in this workflow. It adds nothing to a modeling or write task: that task still ends with the real `kb_upsert` of every planned fact and requirement and the closing `kb_check`.

For an edit that keeps the governing rule, limit the consultation before the edit to exactly two Kibi calls: `kb_search` with the file in `sourceLocations`, then one `kb_query` (by the governing requirement's `id`, or by `sourceFile` when several requirements govern the file). Do not start with `kb_status`, and do not repeat the search or the query before editing; run `kb_status`, `kb_check` and `kb_coverage` after the edit. This limit applies only to source edits. A task that models a claim keeps its full order, one step after the other: `kb_search`, then the exact `kb_query` of the supplied target, then `kb_model` with `mode: "analyze"` on the complete claim, then `mode: "predicates"` for each relational clause, then `kb_model` with `mode: "requirement"` for a strict or typed-rule clause, and only then the real `kb_upsert` of every planned fact and requirement and the closing `kb_check`. Never call `kb_model` before that exact `kb_query`, and never stop at a dry run.

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
   Keep the canonical `REQ-* -> SCEN-* -> TEST-*` chain. Recording the
   behavior a change adds (a requirement with a scenario, and an `implements`
   link from the symbol) is part of finishing that change, not a separate
   request: do it without asking. Ask only when the change conflicts with a
   recorded rule.
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
proofState: tested | mixed | unresolved | not_evaluated
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
plan. A migration plan whose actions were refused before changing anything
returns `status: error`, `MIGRATION_PLAN_REFUSED` and `data.outcome:
refused`: nothing changed, so read the action `detail` and get a new plan.
`data.outcome: reconciliation_required` (status success) means an action
failed mid-way: inspect its effect before retrying. `kb_delete` of an
authored entity returns status success with `deleted: 0` and `outcome:
plan_returned` (or `supersession_required` for a requirement): nothing was
deleted yet, and `nextActions` names the call that does it. If the status is
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

## Second-agent edits

Recipes for an agent changing a knowledge base another agent or person
authored. Each one is the order the write path accepts.

1. **New strict requirement with a predicate grounding.** `kb_model` mode
   `analyze` with the complete prose; copy `inventory_contract` into
   `semantic_inventory_version`, `semantic_source_field` and
   `semantic_source_hash`, the prose into `semantic_text`, `propositions`
   into `semantic_inventory` and the assertive `claim_key`s into
   `logic_claims`. Reuse (or `kb_upsert`) the subject fact, then call
   `kb_model` mode `predicates` per clause with `subjectHint` set to that
   subject fact's `subject_key`: the requirement constrains nothing yet, so
   the hint is the planned subject and the planned fact gets its
   `subject_key` (`subjectKey` is a mode `requirement` parameter; mode
   `predicates` ignores it and warns). `kb_upsert` the returned `applyPlan`
   fact first (it carries the clause's `claim_key`). Then write the
   requirement in one `kb_upsert` with the ledger (that clause `status:
   modeled`), a sectioned `document.body`, `constrains` to the subject
   fact, `requires_predicate` to `relationshipTarget` and `specified_by` to
   its scenario: `specified_by` (req → scenario) is sent in the
   requirement's write, never in the scenario's, so create the scenario
   first, with `assumes` links (scenario → `property_value` fact, sent in
   the scenario's own write) to the values its outcome relies on. Set
   `expects` only on a scenario that has `assumes` links; `expects: success`
   without them only yields `scenario-feasibility-unknown` ("assumes
   nothing"). A
   `modeled` entry and its grounding link must arrive in the same write
   (`modeled semantic_inventory entries (n) must equal logical grounding
   relationships (m)`); a clause not grounded yet stays `status: missing`
   and is switched to `modeled` together with its link later. A partial
   `{title, status}` upsert (plus relationships) is enough only for an
   existing entity, whose stored ledger Kibi keeps.
2. **Changing the text of a grounded requirement.** New prose means new
   claim keys, so a bare rewrite is refused with `modeled proposition
   claim_keys must match logical grounding target claim_keys exactly`; the
   error names the modeled keys no fact declares and the facts whose keys
   the ledger dropped. Analyze the new prose with the requirement's `id`
   first: the receipt warns `Claim-key drift against the stored ledger`
   and names the grounded clauses the new wording drops (the title worded
   differently from the stored `semantic_text` is the usual cause), before
   any write. Prefer supersession for a change of meaning: analyze the new prose,
   write its facts, write the new requirement (`-v2`) with `supersedes` to
   the old one, then set the old one to `status: closed`. Its scenario
   follows the same rule as in recipe 1: create the new scenario (with
   `assumes` to the `property_value` facts it relies on, and `expects` only
   when it has them) before the `-v2` write that sends `specified_by`, then
   re-point the old scenario (its `assumes` go in its own write) or close
   it. For a wording fix
   that keeps the meaning, re-ground in place: analyze the new prose,
   `kb_upsert` each grounding fact with the new `claim_key`/`claim_text`
   (same fact id), then `kb_upsert` the requirement with the new ledger,
   `semantic_text` and the same grounding links in one write. The requirement
   write checks the targets' stored claim keys, so the facts go first;
   between the two writes `kb_check` reports the requirement until the
   second lands.
3. **Deleting authored entities.** `kb_delete` on an authored entity that
   is not a requirement (scenario, test, fact, ADR, …) writes nothing and
   returns `outcome: plan_returned` with a hash-bound
   `kibi.entity-deletion-plan.v1` in `deletionPlan`. After review, run
   `nextActions[0]` unchanged: `kb_apply_plan` with its `input` (`plan` plus
   `approvedPlanHash: plan.planHash`), or repeat the `kb_delete` call with
   `approvedPlanHash` to apply the freshly computed plan in one step (a
   changed source fails with `DELETE_PLAN_HASH_MISMATCH`). `dryRun: true`
   previews relationship and direct deletes without writing. For an
   authored requirement the result is `outcome: supersession_required`, the
   plan carries `supersessionRequired: true` and both routes refuse it
   (`REQUIREMENT_SUPERSESSION_REQUIRED`): Kibi never deletes an authored
   requirement. Evolve it instead with a new
   requirement linked by `supersedes` and close the old one, or, for an
   agent-origin requirement nobody approved and nothing links to, upsert it
   with `status: closed` (keep its `title`); it stays on disk as history. A
   person may remove the file in Git and run `kibi sync`; agents do not edit
   `.kb/` directly.
4. **After a commit-time refusal** (`Contradiction detected …
   (stage=contradiction_check)`, strict-lane pairing, proposition-complete
   ingestion): the result is `status: error` and nothing was written. The
   authored file, the relationship shards, the pending-source receipt of an
   untracked file and the file times are restored, so `kb_check` (including
   `source-relationship-parity`) stays clean and `kb_status` stays `fresh`;
   verify both, fix the cause (supersede, pair the lane, re-ground), and
   resend the whole payload. A `committed_with_repairs` result is the
   opposite case: the commit stands and only its repair actions are run.
5. **What `dryRun: true` does and does not check.** It runs every
   pre-commit validation and, for a `req`, the commit-time contradiction
   check against a staged, rolled-back copy of the store, so `valid: true`
   means the commit would accept the payload as far as the store can tell.
   It writes nothing, so it cannot report what only a write reveals:
   `DOCUMENT_PATH_REQUIRED` for a new entity with no single writable target,
   filesystem, lock and receipt failures, a concurrent writer, or
   `kb_check`-only rules such as `logic-coverage` and `scenario-feasibility`
   (`entity-context-missing` is returned as a warning).

## Origin and approvals

Entities record `origin` (`kind`: `human`, `agent`, `migration`, or `import`,
plus optional `ref` and `approved_by`). `kb_upsert` records `kind: agent` on
entities you create; leave `origin.approved_by` to the person who reviews them,
and ask for that review with `kibi signoff` (see `kibi-decisions`), never with
a summary in your own words.
An exception (a requirement that `exempts` another) exempts nothing until a
human sets `approved_by`; `kb_check` flags approvals an agent recorded without
corroboration. Never fill in an approval yourself. Record why a requirement
exists in `rationale`, or link the ADR that explains it.

## Decision firmness

Requirements and ADRs carry `firmness`, which says what you may do with them.
Load `kibi-decisions` when a person states a rule, a hook asks before an edit
of firm code, or a request conflicts with a recorded rule.
Search answers, `kb_query` rows and hook snippets show it (snippets label only
`[firm: ask before changing]` and `[exploratory]`; an unlabeled decision is
`default`).

- `firm`: a human stated it as a rule. Follow it; to change it, ask first.
  A requirement or ADR with no `firmness` reads as `firm` unless an agent
  wrote it (`origin.kind: agent`): rules people wrote, imported or carried
  over from before origins existed are theirs. `kb_check` blocks an explicit
  `firmness: firm` without `origin.ref` to their words, and a replacement of
  a firm decision that is not itself firm. Never edit a firm decision's
  title, statement or (ADR) body in place, by `kb_upsert` or on disk:
  `kb_upsert` refuses it and `kb_check` reports `decision-firm-edited`
  unless the edit cites new human words in `origin.ref`. Context sections,
  tags, status and links stay editable.
- `default`: a delegated or agent choice (`firmness: default`, or an
  agent-written decision without `firmness`). Follow it; supersede it only on
  evidence that it is wrong (a failing test, a measured cost, a constraint it
  missed), in the same change, listed under "Decisions I changed".
- `exploratory`: a flagged guess; revisit it when you touch the area.

**A request that conflicts with a recorded rule is a question, whatever the
rule's firmness.** The request is not evidence against the rule: it is the
conflict a person has to decide. Name the rule (id and what it requires) and
ask whether to change it; do not implement the request and do not supersede
the rule. Go ahead only when the person has said to change that rule, in this
task or in reply: then supersede it with `firmness: firm` and `origin.ref` to
their words (or, for a correction they asked for in place, update it with
`origin.ref` to those words), and say in the final answer which rule changed.

Set `firmness` explicitly from what a human actually said: only their stated
rule is `firm` (with `origin.ref` to their words); your own pick is `default`;
a guess is `exploratory`. A supersede needs a `## Why this changed` section of
at least 12 words naming the evidence; a preference is not evidence. Never
cite words nobody said. `kibi-decisions` has the recording and supersede
payloads.

Conditional clauses ("only when", "only if", "must not ... unless") compile
into typed `forbid` rules linked by `requires_rule`, not property facts; one
`kb_model` or `kb_compile_intent` cannot translate stays an `ontology_gap`.

`kb_compile_intent` reports `contradictionAnalysis.outcome: no_conflict` only
when it could check: Prolog compares only requirements with logic links. When
the intent is unmodeled or a related current requirement is prose only, the
outcome is `unresolved` with `reasons` and up to five `reviewCandidates`. Never
read `unresolved` as consistent. Compare the intent with each candidate's
`statement`, then compile again with `conflictReviews`
(`{requirementId, verdict: "conflict" | "no_conflict", note}`). On a conflict
the plan is `blocked`: ask the human which rule holds (a firm requirement is
theirs), then supersede or change it, or change the intent (see
`kibi-decisions`).

## Semantic and proof guardrails

Prolog proves only encoded facts. Keep ambiguity, ontology gaps, incomplete
grounding, stale snapshots, and failed or unavailable evidence explicit. Use
`fact_kind: subject` plus `property_value`/`predicate` lanes for contradiction-
safe normative claims; use `observation` or `meta` for bug/workaround notes and
`flag` only for actual runtime/config gates. Requirements require scenarios,
tests, symbol ownership, and fresh proof-bearing receipts before claiming proof.
For an existing product KB that needs semantic backfill, read
`resources/kb-improvement.md`, and `resources/proof.md` for the proof workflow.
Each current requirement has an evidence floor (`required_evidence`, else
`tested` when firm); certificate proof kinds (exhaustive, typecheck,
arithmetic, smt) reach `proved` for the claims their contract names in
`proves`, and a requirement is proved only when every claim is. When the `evidence-floor` rule fails, follow Debugging
proof regressions in `resources/proof.md` and use `kibi proof explain`.

## Predicate Ontology Decision Tree

Call `kb_model` with `mode: "analyze"` on the complete prose before encoding a clause.
Set requirement `logic_claims` to exactly the assertive `claim_key` values.
For each relational clause, call `kb_model` with `mode: "predicates"`, that clause, and
`existingLogicClaims`. If lexical rank is a false positive, retry with the
reviewed `schemaId`. If `binding_status` is `incomplete`, supply
`argumentBindings` and retry. Persist `fact_kind: predicate` with the same
`claim_key` / `claim_text`, then link `REQ -> fact` with `requires_predicate`.
`claim_key` is derived from `claim_text`, so a ground fact may send the exact
clause alone and Kibi fills the key in; a sent key must equal the derived one.
Use `kb_model` with `mode: "requirement"` for strict scalar clauses. Use
`fact_kind: observation` only for a true ontology gap. The manifest is not
grounding: run `logic-coverage` so each key binds to one ground fact.
Relationship direction is fixed, and every `from` in a relationship batch
must equal the upserted entity ID.

Worked example. `recommendedAction: "provide_argument_bindings"` means a
schema fits but `unbound_arguments` lists roles Kibi could not read from the
prose; `bindingHints` (on MCP at `structuredContent.data.bindingHints`, like
every result field) gives each one's `type`, `allowedValues` (declared
constants) or `examples`, and why the current value was refused. With a
`requirementId` whose requirement `constrains` one subject fact, the `subject`
argument is already bound to that fact's `subject_key` (provenance
`requirement`); keep it, so the predicate and the subject fact name one
subject. A schema without a `subject` argument (`permission_rule`) records
that key as the planned fact's `subject_key` instead; when the requirement
constrains several subjects, an unbound `subject_key` asks you to pass
`subjectHint` with one of them. A participant (`actor`, `resource`, entity)
is a short noun, never a clause of the claim, and an `actor`, `role` or
`owner` is never the requirement's subject key: the planned fact already
carries that key as `subject_key`, so `actor = <subject key>` stays unbound
with a reason. When the claim names no participant for such an argument (the
value is empty, the subject key or a clause that opens with a gerund such as
"Discarding a draft while …", and none of the schema's constants or example
values occurs in the claim), the schema does
not fit the claim and Kibi answers `record_ontology_gap` with the gap
observation in `applyPlan`; the candidate stays listed as `incomplete` with
its `bindingHints`. Write the observation instead of inventing a participant.
For every other unbound argument, bind it
from the claim's own words and call again with the same `text` and
`requirementId`, plus `schemaId` and `argumentBindings` keyed by
`argument_names` (reuse `argument_constants` values when the schema has them).
A value that repeats an argument name (`"before_event": "before_event"`) or is
a bare stop word (`be`, `is`, `the`) stays unbound; never copy field names:

```json
{"mode":"predicates","text":"Only an annotation owner may delete an annotation.","requirementId":"REQ-annotation-delete-owner","schemaId":"FACT-SCHEMA-PERMISSION-RULE","argumentBindings":{"actor":"annotation_owner","action":"delete","resource":"annotation","decision":"allow"}}
```

When the retry returns `apply_requires_predicate`, write its `applyPlan` fact,
then the `relationshipPlan` `requires_predicate` row; its target is
`relationshipTarget` (the planned `FACT-PRED-…` id), never a candidate's
`SUGGEST-…` id. A non-empty `existingGrounding` means the requirement already
grounds the claim (for example a bootstrap `requires_property` fact); the action
still names the predicate state. `replace_grounding` means a predicate fits but
a second grounding link would fail, so keep the existing link or apply the
`replacementPlan` steps unchanged, in order and back to back (predicate fact,
`kb_delete` of the old link, requirement link; between the last two `kb_check`
reports both `logic-coverage` and `strict-req-fact-pairing` for the
requirement, as `expected.kbCheckAfterStep` states; run `kb_check` after the
last step and apply `rollback` if it is not clean). `keep_existing_grounding`
means the requirement already links a predicate fact with the candidate's
`canonical_key` (`existingGrounding[].matchedBy` is `canonical_key` when the
claim was worded differently), so write nothing. `extend_requirement` means
the requirement's proposition ledger has no entry for this text, so a link
cannot be made and no fact is planned: add the clause to the requirement's
prose (`mode: "requirement"`, or `kb_upsert` with the extended `semantic_text`
and the ledger `mode: "analyze"` returns) and call `mode: "predicates"` again.
Read `decisionConflicts` and its warnings whenever `plan` is null: they name
the stored decision facts the candidate would contradict and the requirements
that own them. To ask what a proposed rule would conflict with, call
`mode: "predicates"` with its text and no `requirementId`; nothing is written.
`provide_argument_bindings` and `record_ontology_gap` mean
the same as for an ungrounded claim, and the gap observation is not a grounding
link, so write it exactly as returned (tags, `claim_text`, `document.body`, no
`claim_key`, no relationships). Record an ontology gap only when no returned schema fits the
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

Set the symbol's `title` to the behavioral member the extractor can locate in
`sourceFile`: `ClassName.methodName`, an exported function, or a class, not a
file or module name. A traceability link (`implements`, `covered_by`, …) from
a symbol whose `title` names no such member is refused by the granularity gate
when the file already has granular behavioral symbols, unless the symbol sets
`granularity_reason` to `config-artifact`, `module-level-behavior`,
`extractor-miss`, `legacy-link` or `test-suite`.

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
workflows. When `kibi check --staged` or the pre-commit hook blocks a commit,
load `kibi-commit-review`.
