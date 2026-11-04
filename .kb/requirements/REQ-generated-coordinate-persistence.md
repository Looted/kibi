---
title: Generated symbol coordinates persist across mutations and repair deterministically
status: open
owner: platform-team
logic_claims:
  - CLAIM-2E1D66B90856D0BC
  - CLAIM-E74E76450FD5233B
  - CLAIM-6E7A1BA3AFAB9067
  - CLAIM-551AD42515A8BF91
  - CLAIM-F0B0DB25D3B05FD3
  - CLAIM-FA76D9EC41628C8D
  - CLAIM-59F5FF0447C4D992
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 28d14364c02d0a616e5263e57b947b63cd9284d7336965099e48c775f79d929f
semantic_inventory:
  - claim_key: CLAIM-2E1D66B90856D0BC
    claim_text: Callers must not author symbol coordinate fields through kb_upsert, because symbol source coordinates are generated compiler state
    role: normative
    status: modeled
    span:
      start: 0
      end: 130
  - claim_key: CLAIM-E74E76450FD5233B
    claim_text: A source-first symbol upsert must preserve or regenerate valid coordinates in persisted RDF without copying coordinate fields into the authored symbol manifest
    role: normative
    status: modeled
    span:
      start: 132
      end: 291
  - claim_key: CLAIM-6E7A1BA3AFAB9067
    claim_text: A coordinate-generation or artifact-publication failure must not be reported as a complete mutation
    role: normative
    status: modeled
    span:
      start: 293
      end: 392
  - claim_key: CLAIM-551AD42515A8BF91
    claim_text: The sync compiler must treat symbol-coordinates.yaml as a dependency of symbols.yaml, detect its creation, modification and deletion, derive cache identities relative to the explicit workspace root, and recompile affected symbols
    role: normative
    status: modeled
    span:
      start: 394
      end: 623
  - claim_key: CLAIM-F0B0DB25D3B05FD3
    claim_text: An explicitly approved coordinate refresh must force coordinate-bearing symbols to persist even when normalized entity hashes match cached hashes
    role: normative
    status: modeled
    span:
      start: 625
      end: 770
  - claim_key: CLAIM-FA76D9EC41628C8D
    claim_text: Sync cache state may advance only after refresh, extraction, RDF persistence and durable save succeed
    role: normative
    status: modeled
    span:
      start: 772
      end: 873
  - claim_key: CLAIM-59F5FF0447C4D992
    claim_text: Coordinate artifact publication must be atomic, bound to the current extraction identity, preserve unrelated valid records, and fail closed on malformed artifacts
    role: normative
    status: modeled
    span:
      start: 875
      end: 1037
tags:
  - symbols
  - coordinates
  - sync
  - proof
  - review:context-missing
priority: must
id: REQ-generated-coordinate-persistence
type: req
semantic_text: Callers must not author symbol coordinate fields through kb_upsert, because symbol source coordinates are generated compiler state. A source-first symbol upsert must preserve or regenerate valid coordinates in persisted RDF without copying coordinate fields into the authored symbol manifest. A coordinate-generation or artifact-publication failure must not be reported as a complete mutation. The sync compiler must treat symbol-coordinates.yaml as a dependency of symbols.yaml, detect its creation, modification and deletion, derive cache identities relative to the explicit workspace root, and recompile affected symbols. An explicitly approved coordinate refresh must force coordinate-bearing symbols to persist even when normalized entity hashes match cached hashes. Sync cache state may advance only after refresh, extraction, RDF persistence and durable save succeed. Coordinate artifact publication must be atomic, bound to the current extraction identity, preserve unrelated valid records, and fail closed on malformed artifacts.
semantic_clauses:
  - Callers must not author symbol coordinate fields through kb_upsert, because symbol source coordinates are generated compiler state.
  - A source-first symbol upsert must preserve or regenerate valid coordinates in persisted RDF without copying coordinate fields into the authored symbol manifest.
  - A coordinate-generation or artifact-publication failure must not be reported as a complete mutation.
  - The sync compiler must treat symbol-coordinates.yaml as a dependency of symbols.yaml, detect its creation, modification and deletion, derive cache identities relative to the explicit workspace root, and recompile affected symbols.
  - An explicitly approved coordinate refresh must force coordinate-bearing symbols to persist even when normalized entity hashes match cached hashes.
  - Sync cache state may advance only after refresh, extraction, RDF persistence and durable save succeed.
  - Coordinate artifact publication must be atomic, bound to the current extraction identity, preserve unrelated valid records, and fail closed on malformed artifacts.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Atomic clause rewrite of the migrated requirement body (kibi migrate v5->v6).'
  approved_by: maintainer
  recorded_at: '2026-11-03T11:34:18.000Z'
firmness: default
required_evidence: tested
rationale: "Symbol coordinates are derived compiler state; letting callers author them, or reporting a mutation complete when they failed to generate, leaves navigation and impact analysis pointing at the wrong code."
---
- Callers must not author symbol coordinate fields through kb_upsert, because symbol source coordinates are generated compiler state.
- A source-first symbol upsert must preserve or regenerate valid coordinates in persisted RDF without copying coordinate fields into the authored symbol manifest.
- A coordinate-generation or artifact-publication failure must not be reported as a complete mutation.
- The sync compiler must treat symbol-coordinates.yaml as a dependency of symbols.yaml, detect its creation, modification and deletion, derive cache identities relative to the explicit workspace root, and recompile affected symbols.
- An explicitly approved coordinate refresh must force coordinate-bearing symbols to persist even when normalized entity hashes match cached hashes.
- Sync cache state may advance only after refresh, extraction, RDF persistence and durable save succeed.
- Coordinate artifact publication must be atomic, bound to the current extraction identity, preserve unrelated valid records, and fail closed on malformed artifacts.
