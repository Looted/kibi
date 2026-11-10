---
title: kibi deps lock resolves each declared git ref to a commit and records it with the dependency's KB schema
status: open
semantic_text: The kibi deps lock command must resolve a declared git ref to a commit and record that commit with the dependency's KB schema.
semantic_clauses:
  - The kibi deps lock command must resolve a declared git ref to a commit and record that commit with the dependency's KB schema
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: e3caaf48998fb06f6dfd207a6e726543d1d002dc971a455a4452e2a6078a5a92
semantic_inventory:
  - claim_key: CLAIM-2DE614DF1343B592
    claim_text: The kibi deps lock command must resolve a declared git ref to a commit and record that commit with the dependency's KB schema
    role: normative
    status: modeled
    span:
      start: 0
      end: 125
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-2DE614DF1343B592
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-10, approving the behavior splits of the requirements the develop merge made broad in the KB gold-standard review (split batch 6): "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T14:59:38.273Z'
priority: must
firmness: firm
tags:
  - dependencies
  - git
  - mcp
  - cli
id: REQ-kb-dependency-lock-command
type: req
---
The kibi deps lock command must resolve a declared git ref to a commit and record that commit with the dependency's KB schema.

## Context

Locking is the one step that turns a moving ref into a pinned commit, and it records the schema so a later read can refuse an incompatible dependency before materializing it.

The maintainer wants Kibi to grow toward a view across several codebases, starting with a project reading the KBs of the repositories it depends on (a library it uses, or a service it calls) to learn how they are meant to be used. Each dependency must be read at the version the project actually uses, so projects can upgrade at their own pace, and a dependency's KB must stay a separate read-only copy that never mixes with the project's KB or slows it down. Git repositories come first because every Kibi KB lives in one; package and path sources can follow. KB schema 6 is the oldest schema Kibi migrates cleanly, so it is the floor for dependencies.

## Why this changed

Refines the git KB dependencies umbrella into its five behaviors, one sentence each, unchanged. The umbrella keeps its wording; only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-10, approving the behavior splits of the requirements the develop merge made broad in the KB gold-standard review (split batch 6): "Ok"
