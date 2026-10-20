---
id: kibi-traceability
name: kibi-traceability
description: Maintain source-first requirement, scenario, test, symbol, and proof traceability through Kibi's peer interfaces.
version: 2.0.0
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

Before adding a scenario that expects success, use `kb_search` and then `kb_query` to read the preconditions, facts, and current requirements that constrain it. Check each value the scenario assumes against them. If a current requirement forbids an assumed value and there is no recorded human approval, report the scenario as infeasible, name the conflicting requirement and value, and ask how to proceed without writing anything. If a recorded approval exists, record exactly the approved exception and the scenario, and keep the supplied target identifiers and intended edges unchanged. To do that, query those targets, validate the same payload with `kb_upsert` and `dryRun: true`, perform the authorized same-payload `kb_upsert`, and read the result back by exact id with `kb_query` before the final check and coverage. Distinct authorized payloads, such as the exception and the scenario, may need separate sequential writes. On `committed_with_repairs`, follow the typed `nextActions` and never retry a mutation that already committed. A scenario that expects the forbidden value to be rejected needs no exception. A passing dry run is validation, not completion. Answer read-only questions about feasibility or coverage from queries without writing, unless a write is explicitly requested.

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

## Typed recovery and proof

Parse `kibiProtocol`, `resultVersion`, `status`, `effects`, diagnostics, and
typed `nextActions`. On `committed_with_repairs`, execute the required repair
action and never retry the original mutation. Keep ontology gaps, ambiguity,
stale snapshots, unavailable receipts, and incomplete grounding explicit.

Fresh proof requires a current verification snapshot, the exact contracted E2E
command, an append-only receipt, and current symbol coordinates. Structural
coverage and a green check are not proof by themselves.
