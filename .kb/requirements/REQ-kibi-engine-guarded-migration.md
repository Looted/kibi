---
title: Opening a legacy branch store migrates it once into a verified staging generation
status: open
semantic_text: Opening a legacy branch MUST perform one guarded migration into a staging generation and verify canonical digests counts audit preservation required fields and relationships before publishing.
semantic_clauses:
  - Opening a legacy branch MUST perform one guarded migration into a staging generation and verify canonical digests counts audit preservation required fields and relationships before publishing
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ac1fa7af05c52bae4ffbd779f2c38556b2b6e89de0e9d2e0caf52d514feccad7
semantic_inventory:
  - claim_key: CLAIM-3D88BEFE8838940D
    claim_text: Opening a legacy branch MUST perform one guarded migration into a staging generation and verify canonical digests counts audit preservation required fields and relationships before publishing
    role: normative
    status: modeled
    span:
      start: 0
      end: 191
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-3D88BEFE8838940D
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T07:27:11.966Z'
priority: must
tags:
  - core
  - engine
  - rdf
  - persistence
firmness: firm
id: REQ-kibi-engine-guarded-migration
type: req
---
Opening a legacy branch MUST perform one guarded migration into a staging generation and verify canonical digests counts audit preservation required fields and relationships before publishing.

## Context

Originals stay in an immutable legacy backup and the old kb.rdf path holds a sentinel, so a failed or older-client open can never overwrite the only copy.

The engine is the only writer of a branch store, so a second writer, a partial commit, an unchecked migration or a silent full recompile would each lose or corrupt KB state that every later check relies on.

## Why this changed

Split from REQ-core-journaled-engine-persistence, which held four behaviors: one single-writer engine reached through the framed protocol, durable RDF transactions, guarded legacy migration, and delta compilation on normal sync. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
