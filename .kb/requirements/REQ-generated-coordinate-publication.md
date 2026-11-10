---
title: Coordinate artifacts publish atomically and fail closed
status: open
semantic_text: A coordinate-generation or artifact-publication failure must not be reported as a complete mutation. Coordinate artifact publication must be atomic, bound to the current extraction identity, preserve unrelated valid records, and fail closed on malformed artifacts.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 3d21727807c2c9b503f616392cc2ebbfb9009d638ca9a6269b7dd266efa8d5cc
semantic_inventory:
  - claim_key: CLAIM-6E7A1BA3AFAB9067
    claim_text: A coordinate-generation or artifact-publication failure must not be reported as a complete mutation
    role: normative
    status: modeled
    span:
      start: 0
      end: 99
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-59F5FF0447C4D992
    claim_text: Coordinate artifact publication must be atomic, bound to the current extraction identity, preserve unrelated valid records, and fail closed on malformed artifacts
    role: normative
    status: modeled
    span:
      start: 101
      end: 263
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-6E7A1BA3AFAB9067
  - CLAIM-59F5FF0447C4D992
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"'
  approved_by: maintainer
  recorded_at: '2026-11-04T18:14:55.614Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - symbols
  - coordinates
  - sync
  - proof
owner: platform-team
id: REQ-generated-coordinate-publication
type: req
---
A coordinate-generation or artifact-publication failure must not be reported as a complete mutation. Coordinate artifact publication must be atomic, bound to the current extraction identity, preserve unrelated valid records, and fail closed on malformed artifacts.

## Context

The coordinate artifact parser rejects malformed artifacts, and each record is bound to its symbol identity and source hash.



## Why this changed

Split from REQ-generated-coordinate-persistence, which held seven clauses about three behaviors: who may write coordinates, how sync treats the coordinate artifact, and how the artifact is published. Each child is one of those behaviors.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"
