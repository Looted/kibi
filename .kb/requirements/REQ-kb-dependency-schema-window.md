---
title: Kibi refuses a KB dependency whose KB schema is outside the supported window
status: open
semantic_text: Kibi must refuse a KB dependency whose KB schema is older than 6 or newer than the running Kibi supports.
semantic_clauses:
  - Kibi must refuse a KB dependency whose KB schema is older than 6 or newer than the running Kibi supports
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: e9c3ca0f4eb7d3b725d1de92653b81a9ba018abaacdca26d44c23452dcbb9945
semantic_inventory:
  - claim_key: CLAIM-21AC1757CBF6480F
    claim_text: Kibi must refuse a KB dependency whose KB schema is older than 6 or newer than the running Kibi supports
    role: normative
    status: modeled
    span:
      start: 0
      end: 104
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-21AC1757CBF6480F
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-10, approving the behavior splits of the requirements the develop merge made broad in the KB gold-standard review (split batch 6): "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T14:59:20.939Z'
priority: must
firmness: firm
tags:
  - dependencies
  - git
  - mcp
  - cli
id: REQ-kb-dependency-schema-window
type: req
---
Kibi must refuse a KB dependency whose KB schema is older than 6 or newer than the running Kibi supports.

## Context

A dependency KB stays at the schema of the release it was pinned to; Kibi reads old KBs back to schema 6 but must not guess at a schema it does not know.

The maintainer wants Kibi to grow toward a view across several codebases, starting with a project reading the KBs of the repositories it depends on (a library it uses, or a service it calls) to learn how they are meant to be used. Each dependency must be read at the version the project actually uses, so projects can upgrade at their own pace, and a dependency's KB must stay a separate read-only copy that never mixes with the project's KB or slows it down. Git repositories come first because every Kibi KB lives in one; package and path sources can follow. KB schema 6 is the oldest schema Kibi migrates cleanly, so it is the floor for dependencies.

## Why this changed

Refines the git KB dependencies umbrella into its five behaviors, one sentence each, unchanged. The umbrella keeps its wording; only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-10, approving the behavior splits of the requirements the develop merge made broad in the KB gold-standard review (split batch 6): "Ok"
