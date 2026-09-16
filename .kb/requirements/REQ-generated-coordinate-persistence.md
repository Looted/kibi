---
title: Generated symbol coordinates persist across mutations and repair deterministically
status: open
owner: platform-team
logic_claims:
  - CLAIM-0CABAB4DED81E9E2
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 8e44ad224f4efece524a24c8eaf1002f2704b2d286e411c831237571e5d07bfd
semantic_inventory:
  - claim_key: CLAIM-0CABAB4DED81E9E2
    claim_text: Symbol source coordinates are generated compiler state and callers must not author coordinate fields through kb_upsert.\n\nA source-first symbol upsert must preserve or regenerate valid coordinates in persisted RDF without copying coordinate fields into the authored symbol manifest, and a coordinate-generation or artifact-publication failure must not be reported as a complete mutation.\n\nThe sync compiler must treat symbol-coordinates.yaml as a dependency of symbols.yaml, detect artifact creation, modification, and deletion, derive cache identities relative to the explicit workspace root, and recompile affected symbols.\n\nAn explicitly approved coordinate refresh must force coordinate-bearing symbols to persist even when normalized entity hashes match cached hashes; sync cache state may advance only after refresh, extraction, RDF persistence, and durable save succeed.\n\nCoordinate artifact publication must be atomic, bound to current extraction identity, preserve unrelated valid records, and fail closed on malformed artifacts
    role: normative
    status: modeled
    span:
      start: 0
      end: 1044
tags:
  - symbols
  - coordinates
  - sync
  - proof
priority: must
id: REQ-generated-coordinate-persistence
type: req
semantic_text: Symbol source coordinates are generated compiler state and callers must not author coordinate fields through kb_upsert.\n\nA source-first symbol upsert must preserve or regenerate valid coordinates in persisted RDF without copying coordinate fields into the authored symbol manifest, and a coordinate-generation or artifact-publication failure must not be reported as a complete mutation.\n\nThe sync compiler must treat symbol-coordinates.yaml as a dependency of symbols.yaml, detect artifact creation, modification, and deletion, derive cache identities relative to the explicit workspace root, and recompile affected symbols.\n\nAn explicitly approved coordinate refresh must force coordinate-bearing symbols to persist even when normalized entity hashes match cached hashes; sync cache state may advance only after refresh, extraction, RDF persistence, and durable save succeed.\n\nCoordinate artifact publication must be atomic, bound to current extraction identity, preserve unrelated valid records, and fail closed on malformed artifacts.
semantic_clauses:
  - Symbol source coordinates are generated compiler state and callers must not author coordinate fields through kb_upsert.\n\nA source-first symbol upsert must preserve or regenerate valid coordinates in persisted RDF without copying coordinate fields into the authored symbol manifest, and a coordinate-generation or artifact-publication failure must not be reported as a complete mutation.\n\nThe sync compiler must treat symbol-coordinates.yaml as a dependency of symbols.yaml, detect artifact creation, modification, and deletion, derive cache identities relative to the explicit workspace root, and recompile affected symbols.\n\nAn explicitly approved coordinate refresh must force coordinate-bearing symbols to persist even when normalized entity hashes match cached hashes; sync cache state may advance only after refresh, extraction, RDF persistence, and durable save succeed.\n\nCoordinate artifact publication must be atomic, bound to current extraction identity, preserve unrelated valid records, and fail closed on malformed artifacts
---
# Generated symbol coordinates persist across mutations and repair deterministically

Symbol source coordinates are generated compiler state. Callers cannot author coordinate fields through `kb_upsert`. A source-first symbol upsert preserves or regenerates valid coordinates in persisted RDF without copying them into the authored manifest, and a coordinate-generation or artifact-publication failure is never reported as a complete mutation.

The sync compiler treats `symbol-coordinates.yaml` as a dependency of `symbols.yaml`: artifact creation, modification, and deletion change the effective source fingerprint, cache identities derive from the explicit workspace root, and affected symbols recompile. An explicitly approved coordinate refresh forces coordinate-bearing symbols to persist even when normalized entity hashes match cached hashes; sync cache state advances only after refresh, extraction, RDF persistence, and durable save succeed.

Coordinate artifact publication is atomic, bound to current extraction identity, preserves unrelated valid records, and fails closed on malformed artifacts.

Unresolved propositions stay explicit: several normative clauses remain `ontology_gap`/`missing` until predicate schemas exist; they are enforced behaviorally by TEST-generated-coordinate-repair.
