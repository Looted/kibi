---
title: Engine writes commit entity, audit and commit metadata in one durable RDF transaction
status: open
semantic_text: The engine MUST attach the branch with SWI-Prolog rdf_persistency and commit domain triples audit resources and commit metadata in one RDF transaction acknowledged only after the journal is durable.
semantic_clauses:
  - The engine MUST attach the branch with SWI-Prolog rdf_persistency and commit domain triples audit resources and commit metadata in one RDF transaction acknowledged only after the journal is durable
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 3abf43ef211d26db65f5890f30418e3bc6de674d9fd89f0c902a9d821b4200e1
semantic_inventory:
  - claim_key: CLAIM-2A163B289A950EF7
    claim_text: The engine MUST attach the branch with SWI-Prolog rdf_persistency and commit domain triples audit resources and commit metadata in one RDF transaction acknowledged only after the journal is durable
    role: normative
    status: modeled
    span:
      start: 0
      end: 197
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-2A163B289A950EF7
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T07:26:35.350Z'
priority: must
tags:
  - core
  - engine
  - rdf
  - persistence
firmness: firm
id: REQ-kibi-engine-durable-transactions
type: req
---
The engine MUST attach the branch with SWI-Prolog rdf_persistency and commit domain triples audit resources and commit metadata in one RDF transaction acknowledged only after the journal is durable.

## Context

audit.log is only a derived export, so the journal is the record of truth and a write is never reported before it is durable there.

The engine is the only writer of a branch store, so a second writer, a partial commit, an unchecked migration or a silent full recompile would each lose or corrupt KB state that every later check relies on.

## Why this changed

Split from REQ-core-journaled-engine-persistence, which held four behaviors: one single-writer engine reached through the framed protocol, durable RDF transactions, guarded legacy migration, and delta compilation on normal sync. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
