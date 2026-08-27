---
title: Generated symbol coordinates persist across mutations and repair deterministically
status: open
owner: platform-team
logic_claims:
  - CLAIM-13B00A897062CB91
  - CLAIM-E74E76450FD5233B
  - CLAIM-6E7A1BA3AFAB9067
  - CLAIM-0D8F70EC5534576F
  - CLAIM-F0B0DB25D3B05FD3
  - CLAIM-90667997A663922B
  - CLAIM-6FEF9037E6FC8893
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: f59f0cc27f56be613ff23c905020e9d65f549d39a68475bd16053abc7b2fe9a1
semantic_inventory:
  - claim_key: CLAIM-13B00A897062CB91
    claim_text: Symbol source coordinates are generated compiler state and callers must not author coordinate fields through kb_upsert
    role: normative
    status: missing
    span:
      start: 0
      end: 118
  - claim_key: CLAIM-E74E76450FD5233B
    claim_text: A source-first symbol upsert must preserve or regenerate valid coordinates in persisted RDF without copying coordinate fields into the authored symbol manifest
    role: normative
    status: ontology_gap
    span:
      start: 121
      end: 280
  - claim_key: CLAIM-6E7A1BA3AFAB9067
    claim_text: a coordinate-generation or artifact-publication failure must not be reported as a complete mutation
    role: normative
    status: missing
    span:
      start: 286
      end: 385
  - claim_key: CLAIM-0D8F70EC5534576F
    claim_text: The sync compiler must treat symbol-coordinates.yaml as a dependency of symbols.yaml, detect artifact creation, modification, and deletion, derive cache identities relative to the explicit workspace root, and recompile affected symbols
    role: normative
    status: ontology_gap
    span:
      start: 388
      end: 623
  - claim_key: CLAIM-F0B0DB25D3B05FD3
    claim_text: An explicitly approved coordinate refresh must force coordinate-bearing symbols to persist even when normalized entity hashes match cached hashes
    role: normative
    status: ontology_gap
    span:
      start: 626
      end: 771
  - claim_key: CLAIM-90667997A663922B
    claim_text: sync cache state may advance only after refresh, extraction, RDF persistence, and durable save succeed
    role: descriptive
    status: missing
    span:
      start: 773
      end: 875
  - claim_key: CLAIM-6FEF9037E6FC8893
    claim_text: Coordinate artifact publication must be atomic, bound to current extraction identity, preserve unrelated valid records, and fail closed on malformed artifacts
    role: normative
    status: ontology_gap
    span:
      start: 878
      end: 1036
tags:
  - symbols
  - coordinates
  - sync
  - proof
priority: must
id: REQ-generated-coordinate-persistence
type: req
semantic_text: |-
  Symbol source coordinates are generated compiler state and callers must not author coordinate fields through kb_upsert.

  A source-first symbol upsert must preserve or regenerate valid coordinates in persisted RDF without copying coordinate fields into the authored symbol manifest, and a coordinate-generation or artifact-publication failure must not be reported as a complete mutation.

  The sync compiler must treat symbol-coordinates.yaml as a dependency of symbols.yaml, detect artifact creation, modification, and deletion, derive cache identities relative to the explicit workspace root, and recompile affected symbols.

  An explicitly approved coordinate refresh must force coordinate-bearing symbols to persist even when normalized entity hashes match cached hashes; sync cache state may advance only after refresh, extraction, RDF persistence, and durable save succeed.

  Coordinate artifact publication must be atomic, bound to current extraction identity, preserve unrelated valid records, and fail closed on malformed artifacts.
---
# Generated symbol coordinates persist across mutations and repair deterministically

Symbol source coordinates are generated compiler state. Callers cannot author coordinate fields through `kb_upsert`. A source-first symbol upsert preserves or regenerates valid coordinates in persisted RDF without copying them into the authored manifest, and a coordinate-generation or artifact-publication failure is never reported as a complete mutation.

The sync compiler treats `symbol-coordinates.yaml` as a dependency of `symbols.yaml`: artifact creation, modification, and deletion change the effective source fingerprint, cache identities derive from the explicit workspace root, and affected symbols recompile. An explicitly approved coordinate refresh forces coordinate-bearing symbols to persist even when normalized entity hashes match cached hashes; sync cache state advances only after refresh, extraction, RDF persistence, and durable save succeed.

Coordinate artifact publication is atomic, bound to current extraction identity, preserves unrelated valid records, and fails closed on malformed artifacts.

Unresolved propositions stay explicit: several normative clauses remain `ontology_gap`/`missing` until predicate schemas exist; they are enforced behaviorally by TEST-generated-coordinate-repair.
