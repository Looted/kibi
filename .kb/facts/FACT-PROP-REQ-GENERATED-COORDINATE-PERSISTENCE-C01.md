---
title: Symbol source coordinates are generated compiler state and callers must not auth
status: active
tags:
  - strict-lane
fact_kind: property_value
subject_key: req.req_generated_coordinate_persistence
property_key: clause_01_symbol_source_coordinates_are_generated_compiler
operator: eq
value_type: bool
value_bool: true
polarity: require
canonical_key: req.req_generated_coordinate_persistence.clause_01_symbol_source_coordinates_are_generated_compiler.eq.true
claim_key: CLAIM-0CABAB4DED81E9E2
claim_text: Symbol source coordinates are generated compiler state and callers must not author coordinate fields through kb_upsert.\n\nA source-first symbol upsert must preserve or regenerate valid coordinates in persisted RDF without copying coordinate fields into the authored symbol manifest, and a coordinate-generation or artifact-publication failure must not be reported as a complete mutation.\n\nThe sync compiler must treat symbol-coordinates.yaml as a dependency of symbols.yaml, detect artifact creation, modification, and deletion, derive cache identities relative to the explicit workspace root, and recompile affected symbols.\n\nAn explicitly approved coordinate refresh must force coordinate-bearing symbols to persist even when normalized entity hashes match cached hashes; sync cache state may advance only after refresh, extraction, RDF persistence, and durable save succeed.\n\nCoordinate artifact publication must be atomic, bound to current extraction identity, preserve unrelated valid records, and fail closed on malformed artifacts
id: FACT-PROP-REQ-GENERATED-COORDINATE-PERSISTENCE-C01
type: fact
---
