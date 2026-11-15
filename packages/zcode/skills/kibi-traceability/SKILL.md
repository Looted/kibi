---
name: kibi-traceability
description: "Maintain source-first requirement, scenario, test, symbol, and proof traceability through Kibi's peer interfaces. Use when linking a code symbol to a requirement (implements, covered_by, executable_for), choosing which function owns a behavior, moving or removing links, or when kb_check reports broad_requirement_review, multi_requirement_symbol_review, coarse_anchor_only_review, symbol-coverage or missing_production_symbol_coverage."
license: AGPL-3.0-or-later
metadata:
  id: kibi-traceability
  version: 2.4.0
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

## Ownership precision

An `implements` link says "this function decides that behavior". Hooks and
`kb_query({sourceFile})` hand it to the next agent as the rule for the file,
so a loose link is wrong context, not harmless extra coverage.

- Link the function that decides the behavior: the one whose body would
  change if the rule changed. A wrapper that only delegates, an adapter that
  forwards to shared code and a helper that decides nothing get no
  `implements` link to that requirement. Every symbol in the manifest must
  implement a requirement (`symbol-traceability`), so a symbol that decides
  nothing is removed rather than left unlinked: `kb_delete` its id and apply
  the returned plan.
- A new function that decides a behavior no current requirement states needs
  its own requirement, and recording it is part of the task. Write it from
  what the code does: the statement with `must`, a `## Context` naming where
  the behavior came from ("Reason not stated." when nobody gave one), the
  subject its claims are about, a scenario and the existing test. Then link
  the function with `implements` and `covered_by`. Leaving the symbol
  unowned, or linking it to a requirement that does not state its behavior,
  does not finish the task.
- A behavioral symbol implements at most 2 requirements (4 for a class,
  component or module). A third link means the symbol or one of the
  requirements is too broad; `granularity_reason` does not exempt it.
- Before adding a link, read the requirement's fan-out with `kb_graph`. More
  than 8 implementing symbols, 6 scenarios, 8 tests or 5 dependent
  requirements is reported as `broad_requirement_review` by the unfiltered
  `kb_check`. If your link would cross a threshold, do not pick another
  requirement that has room and do not tag the requirement `umbrella`: record
  the narrower behavior the code decides, or report the requirement as broad
  (`kibi-usage`, Requirement size and ownership).
- When you move a link, the symbol must also be `covered_by` a test that
  verifies the new owner, or coverage reports
  `missing_production_symbol_coverage`.
- After link work, run the unfiltered `kb_check` and read `qualityDiagnostics`
  as well as `violations`; a check scoped by `rules` leaves out the full-KB
  review findings.

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
