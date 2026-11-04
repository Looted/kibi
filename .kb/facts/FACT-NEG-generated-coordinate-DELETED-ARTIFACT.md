---
title: The sync compiler ignores a deleted symbol-coordinates.yaml
status: active
tags:
  - negative-path
fact_kind: property_value
subject_key: kibi.symbols.coordinates
property_key: coordinates_file_is_sync_dependency
operator: eq
value_type: bool
value_bool: false
origin:
  kind: agent
  recorded_at: '2026-11-04T18:30:00.000Z'
id: FACT-NEG-generated-coordinate-DELETED-ARTIFACT
type: fact
---
Sync treats a missing coordinate artifact as unchanged, so the cache keeps symbols whose coordinates are no longer published.
