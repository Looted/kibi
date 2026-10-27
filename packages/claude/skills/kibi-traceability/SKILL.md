---
name: kibi-traceability
description: Maintain source-first requirement, scenario, test, symbol, and proof traceability through Kibi's peer interfaces.
license: AGPL-3.0-or-later
metadata:
  displayName: kibi-traceability
  id: kibi-traceability
  version: 2.3.0
  kibiCompatibility: ">=1.0.0"
  tags:
    - kibi
    - traceability
    - source-first
    - proof
    - agent-guidance
  resources:
    - resources/traceability.md
    - resources/branch-lifecycle.md
    - resources/source-authoring.md
    - resources/operation-access.md
---
## Goal

Keep product intent connected to implementation without a parallel ticket
bureaucracy. Requirements own symbols, requirements have clause-complete
semantics, scenarios have tests, and proof-bearing tests have fresh evidence.

## Interface Selection

Use the visible approved MCP tools or trusted project-local CLI as equal peer
interfaces. Select the surface by capability; neither is semantically preferred.
For CLI JSON, use a dedicated route such as
`printf '%s\n' '{}' | kibi status --input -`.

For every traceability answer, begin with `kb_search` even when an identifier is already named, then exact-filter with `kb_query`, inspect relationships with `kb_graph`, and make `kb_status` the final Kibi call, including after `kb_graph` or `kb_coverage`; report no conclusions until that closing `kb_status` returns. When judging scenario feasibility, ground each step in the queried requirements, scenarios, tests, and symbols, and state missing links, ambiguity, or stale evidence explicitly rather than inferring them. For authorized coverage or link work, keep the exact supplied target and intended edges, discover and query those targets, then validate the payload with `kb_upsert` and `dryRun: true`. A passing dry run is only validation, not completion: next perform the real `kb_upsert` with the same payload, exact-read the result back with `kb_query`, run `kb_check` and `kb_coverage`, report the resulting proof state, and finish with `kb_status`. Distinct authorized payloads may each need their own sequential dry run and write, so there is no single-write limit, but never retry a mutation that already committed; on `committed_with_repairs`, execute the typed repair action instead.

## Workflow

Use the visible approved MCP tools or trusted project-local CLI as equal peer
interfaces. Discover with `kb_search`, exact-filter with `kb_query`, and inspect
`kb_status` before branch-sensitive work. Preserve `REQ-* -> SCEN-* -> TEST-*`;
link production symbols with `implements` and qualifying tests with
`executable_for`/`covered_by`.

After source edits, run targeted `kb_check` with impact diagnostics, update
tracked Markdown/YAML/manifests and canonical relationship shards through
sequential `kb_upsert`, then run final check and coverage. Kibi authors tracked
files transactionally but never Git-stages or commits them. Do not read or edit
`.kb` directly.

Use `kb_delete` only for intentional cleanup; `dryRun: true` previews any
delete without writing. Authored entity deletion returns `outcome:
plan_returned` with a hash-bound plan whose `nextActions[0].input` is the exact
`kb_apply_plan` input; requirements return `supersession_required` and evolve
through a new requirement linked with `supersedes`. Relationship deletes patch
shards while preserving unrelated records.

For executable coverage work, keep the production symbol's implements link to its requirement and link that same production symbol to its qualifying test with covered_by; reserve executable_for for a symbol that stands for the executable test itself, and never put executable_for on a symbol that also carries production ownership or coverage. Preserve the exact supplied target and intended edges, discover and query those targets, validate the payload with `kb_upsert` and `dryRun: true`, then perform the authorized real `kb_upsert` with the same payload and exact-read the result with `kb_query` before final checks, because validation alone is not completion. A passing dry run does not guarantee the commit: if the real `kb_upsert` returns an error, read its message and correct only the conflicting relationship on the same target rather than working around it with a new entity, then validate again with `dryRun: true`, write again, and exact-read it back. Distinct authorized payloads may each need their own sequential validation and write, so there is no single write limit, but never retry a mutation that already committed; on `committed_with_repairs`, execute the typed repair action instead. Then run `kb_check` and `kb_coverage`, report the proof and verification state they return, treating a dirty verification snapshot after a write as expected rather than as a failure, and finish with `kb_status`.

## Typed recovery and proof

Parse `kibiProtocol`, `resultVersion`, `status`, `effects`, diagnostics, and
typed `nextActions`. On `committed_with_repairs`, execute the required repair
action and never retry the original mutation. Keep ontology gaps, ambiguity,
stale snapshots, unavailable receipts, and incomplete grounding explicit.

Fresh proof requires a current verification snapshot, the exact contracted E2E
command, an append-only receipt, and current symbol coordinates. Structural
coverage and a green check are not proof by themselves.

Report each requirement's `evidenceLevel` from `kb_coverage` as it is:
`proved` only when certificate proofs (exhaustive, typecheck, arithmetic,
smt, rule, state_machine, regex, source) bound at code or harness scope
derive every applicable claim (intent-scope bindings stay `tested`), named in each contract's `proves`
(`claimSummary` and `unprovedClaims` say which are missing), `tested` for fresh passing E2E receipts,
`asserted` when only a person stands behind it, `unverified` otherwise. Its
`evidenceFloor` says what `kb_check`'s `evidence-floor` rule requires:
`below` is a traceability gap to close with links, tests and `kibi prove`;
`pending_reproof` means the receipts are older than the code and need
`kibi prove`. Never lower `required_evidence` to clear either.
