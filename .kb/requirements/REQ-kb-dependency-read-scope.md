---
title: A read scoped to a KB dependency is answered from that dependency's own read-only store
status: open
semantic_text: Kibi must answer a read scoped to a KB dependency from that dependency's own read-only branch store, never from or into the project's KB.
semantic_clauses:
  - Kibi must answer a read scoped to a KB dependency from that dependency's own read-only branch store, never from or into the project's KB
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 4ddbc218f1cd4f487855ac20e84b1e9cadfdeef8ec4b341400bf7dc494e03e23
semantic_inventory:
  - claim_key: CLAIM-7B6800923B7B00A8
    claim_text: Kibi must answer a read scoped to a KB dependency from that dependency's own read-only branch store, never from or into the project's KB
    role: normative
    status: modeled
    span:
      start: 0
      end: 136
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-7B6800923B7B00A8
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-10, approving the behavior splits of the requirements the develop merge made broad in the KB gold-standard review (split batch 6): "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T14:58:57.300Z'
priority: must
firmness: firm
tags:
  - dependencies
  - git
  - mcp
  - cli
id: REQ-kb-dependency-read-scope
type: req
---
Kibi must answer a read scoped to a KB dependency from that dependency's own read-only branch store, never from or into the project's KB.

## Context

Mixing a dependency's entities into the project's KB, or writing into the dependency, would let another project's requirements pass or fail this project's checks.

The maintainer wants Kibi to grow toward a view across several codebases, starting with a project reading the KBs of the repositories it depends on (a library it uses, or a service it calls) to learn how they are meant to be used. Each dependency must be read at the version the project actually uses, so projects can upgrade at their own pace, and a dependency's KB must stay a separate read-only copy that never mixes with the project's KB or slows it down. Git repositories come first because every Kibi KB lives in one; package and path sources can follow. KB schema 6 is the oldest schema Kibi migrates cleanly, so it is the floor for dependencies.

## Why this changed

Refines the git KB dependencies umbrella into its five behaviors, one sentence each, unchanged. The umbrella keeps its wording; only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-10, approving the behavior splits of the requirements the develop merge made broad in the KB gold-standard review (split batch 6): "Ok"
