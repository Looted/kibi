---
title: A coordinate refresh rewrites the authored symbols manifest
status: active
tags:
  - negative-path
fact_kind: property_value
subject_key: kibi.sync.extractors
property_key: authored_and_generated_split
operator: eq
value_type: bool
value_bool: false
origin:
  kind: agent
  recorded_at: '2026-11-10T11:00:00.000Z'
id: FACT-NEG-kibi-coordinate-refresh-split-COORDINATES-IN-MANIFEST
type: fact
---
A sync that refreshes symbol coordinates writes generated locations into .kb/symbols.yaml, so the authored manifest changes when only source positions moved.
