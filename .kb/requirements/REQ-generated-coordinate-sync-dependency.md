---
title: Sync treats the coordinate artifact as a dependency of the symbol manifest
status: open
semantic_text: The sync compiler must treat symbol-coordinates.yaml as a dependency of symbols.yaml, detect its creation, modification and deletion, derive cache identities relative to the explicit workspace root, and recompile affected symbols. An explicitly approved coordinate refresh must force coordinate-bearing symbols to persist even when normalized entity hashes match cached hashes. Sync cache state may advance only after refresh, extraction, RDF persistence and durable save succeed.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 478e6d48434b8be121ce859795ad22dc11d698eb08693cc0ee22a2d66dc6f7e8
semantic_inventory:
  - claim_key: CLAIM-551AD42515A8BF91
    claim_text: The sync compiler must treat symbol-coordinates.yaml as a dependency of symbols.yaml, detect its creation, modification and deletion, derive cache identities relative to the explicit workspace root, and recompile affected symbols
    role: normative
    status: modeled
    span:
      start: 0
      end: 229
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-F0B0DB25D3B05FD3
    claim_text: An explicitly approved coordinate refresh must force coordinate-bearing symbols to persist even when normalized entity hashes match cached hashes
    role: normative
    status: modeled
    span:
      start: 231
      end: 376
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-FA76D9EC41628C8D
    claim_text: Sync cache state may advance only after refresh, extraction, RDF persistence and durable save succeed
    role: normative
    status: modeled
    span:
      start: 378
      end: 479
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-551AD42515A8BF91
  - CLAIM-F0B0DB25D3B05FD3
  - CLAIM-FA76D9EC41628C8D
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"'
  approved_by: maintainer
  recorded_at: '2026-11-04T18:14:32.246Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - symbols
  - coordinates
  - sync
  - proof
owner: platform-team
id: REQ-generated-coordinate-sync-dependency
type: req
---
The sync compiler must treat symbol-coordinates.yaml as a dependency of symbols.yaml, detect its creation, modification and deletion, derive cache identities relative to the explicit workspace root, and recompile affected symbols. An explicitly approved coordinate refresh must force coordinate-bearing symbols to persist even when normalized entity hashes match cached hashes. Sync cache state may advance only after refresh, extraction, RDF persistence and durable save succeed.

## Context

The sync cache hashes the manifest together with its coordinates, and coordinate refreshes run under the symbol compiler lock.



## Why this changed

Split from REQ-generated-coordinate-persistence, which held seven clauses about three behaviors: who may write coordinates, how sync treats the coordinate artifact, and how the artifact is published. Each child is one of those behaviors.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"
