---
id: init-kibi
name: init-kibi
description: Bootstrap Kibi from the current Git checkout with exact Git attachment, preview approval, source-first writes, and repair-safe completion.
version: 2.0.0
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

Bootstrap or refresh branch-local Kibi knowledge without creating a parallel
human-maintained ticket system. Ask at most four bounded context questions when
repository evidence is insufficient; agents own deterministic translation and
humans resolve genuine ambiguity.

## Interface and preview

Use the visible approved MCP surface or the trusted project-local CLI as equal
peer interfaces. If neither is available, stop. Run `kb_autopilot_generate`
(or `autopilot-generate --input`) read-only, show the complete preview, and get
explicit approval before any write.

For CLI JSON, use the trusted route with `--input` (for example
`printf '%s\\n' '{}' | kibi status --input -`); MCP and CLI are semantic peers.
Read the branch-lifecycle and source-authoring resources before migration,
source writes, or repair actions.

## Apply and verify

Apply the approved entity plan with sequential `kb_upsert` calls. Create
relationship endpoints before links. Use `kb_delete` only for an approved
hash-bound deletion plan; evolve requirements with `supersedes`. Finish with
`kb_check` and `kb_status`.

Consume the versioned `kibiProtocol: 1` result envelope: inspect `status`, `effects`,
`diagnostics`, and `nextActions`. On `committed_with_repairs`, execute required
repair actions and never retry the original mutation.

Kibi may author tracked Markdown/YAML/manifests and relationship shards
transactionally, but never Git-stages or commits them. Never read or edit
`.kb` directly. Missing exact branch stores are compiled from this checkout's
tracked sources by `kibi sync`; Kibi does not copy another branch's store.
