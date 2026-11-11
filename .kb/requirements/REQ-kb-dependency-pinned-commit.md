---
title: A KB dependency is read only at the commit pinned for it in the lock file
status: open
semantic_text: Kibi must read a KB dependency declared in .kb/dependencies.json only at the commit pinned for it in .kb/dependencies.lock.json.
semantic_clauses:
  - Kibi must read a KB dependency declared in .kb/dependencies.json only at the commit pinned for it in .kb/dependencies.lock.json
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 8a170f9ea549d09d30c4a54f108caecef3dbe66dac539f3ef5c0926ea66a170e
semantic_inventory:
  - claim_key: CLAIM-369DC965CC50460A
    claim_text: Kibi must read a KB dependency declared in .kb/dependencies.json only at the commit pinned for it in .kb/dependencies.lock.json
    role: normative
    status: modeled
    span:
      start: 0
      end: 127
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-369DC965CC50460A
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-10, approving the behavior splits of the requirements the develop merge made broad in the KB gold-standard review (split batch 6): "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T14:58:02.434Z'
priority: must
firmness: firm
tags:
  - dependencies
  - git
  - mcp
  - cli
id: REQ-kb-dependency-pinned-commit
type: req
---
Kibi must read a KB dependency declared in .kb/dependencies.json only at the commit pinned for it in .kb/dependencies.lock.json.

## Context

A dependency read must be reproducible: the declared ref can move, so Kibi materializes only the locked commit and refuses a dependency whose lock entry is missing or no longer matches its declaration.

The maintainer wants Kibi to grow toward a view across several codebases, starting with a project reading the KBs of the repositories it depends on (a library it uses, or a service it calls) to learn how they are meant to be used. Each dependency must be read at the version the project actually uses, so projects can upgrade at their own pace, and a dependency's KB must stay a separate read-only copy that never mixes with the project's KB or slows it down. Git repositories come first because every Kibi KB lives in one; package and path sources can follow. KB schema 6 is the oldest schema Kibi migrates cleanly, so it is the floor for dependencies.

## Why this changed

Refines the git KB dependencies umbrella into its five behaviors, one sentence each, unchanged. The umbrella keeps its wording; only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-10, approving the behavior splits of the requirements the develop merge made broad in the KB gold-standard review (split batch 6): "Ok"
