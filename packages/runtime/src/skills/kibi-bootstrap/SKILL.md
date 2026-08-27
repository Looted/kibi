---
id: kibi-bootstrap
name: kibi-bootstrap
description: Bootstrap Kibi from the current Git checkout with exact Git attachment, preview approval, source-first writes, and repair-safe completion.
version: 3.0.0
kibiCompatibility: ">=1.0.0"
tags:
  - kibi
  - bootstrap
  - source-first
  - agent-guidance
resources:
  - resources/bootstrap.md
  - resources/branch-lifecycle.md
  - resources/source-authoring.md
  - resources/operation-access.md
---
## Goal

Seed branch-local Kibi knowledge for an attached but thin repository without
creating a parallel human-maintained ticket system. Ask at most four bounded
context questions only when the planner says repository evidence is
insufficient; agents own deterministic translation and humans resolve genuine
ambiguity. A seeded repository hands off to the normal Kibi workflow.

## Interface and preview

Use the visible approved MCP surface or the trusted project-local CLI as equal
peer interfaces. If neither is available, stop. Run `kb_plan_bootstrap` (or
`plan-bootstrap --input`) read-only. If it returns `needs_context`, ask only its
bounded questions (never more than four), then rerun the planner. Show the
complete returned `structuredContent.plan`, including its canonical hash, and
get explicit approval before any write. Pass that plan object unchanged to
`kb_apply_plan`; do not reconstruct it from preview fields.

For CLI JSON, use the trusted route with `--input` (for example
`printf '%s\n' '{}' | kibi status --input -`); MCP and CLI are semantic peers.
Read the branch-lifecycle and source-authoring resources before migration,
source writes, or repair actions.

## Apply and verify

Apply the approved `kibi.bootstrap-plan.v1` by calling `kb_apply_plan` with the
exact plan and approved hash. The operation owns dependency ordering,
source-first writes, sequential mutation, and recovery journaling. Direct
`kb_upsert` is forbidden for every kibi-bootstrap task, including after
approval; never replay plan actions manually. Use `kb_delete` only for an
approved hash-bound deletion plan; evolve requirements with `supersedes`.
Finish with `kb_check` and `kb_status`.

Consume the versioned `kibiProtocol: 1` result envelope: inspect `status`, `effects`,
`diagnostics`, and `nextActions`. On `committed_with_repairs`, execute required
repair actions and never retry the original mutation.

Kibi may author tracked Markdown/YAML/manifests and relationship shards
transactionally, but never Git-stages or commits them. Never read or edit
`.kb` directly. Missing exact branch stores are compiled from this checkout's
tracked sources by `kibi sync`; Kibi does not copy another branch's store.
