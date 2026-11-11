---
title: A leftover .kb/config.json marks a project as initialized
status: active
tags:
  - negative-path
fact_kind: property_value
subject_key: kibi.kb.canonical_layout
property_key: manifest_is_initialized_signal
operator: eq
value_type: bool
value_bool: false
origin:
  kind: agent
  recorded_at: '2026-11-10T09:00:00.000Z'
id: FACT-NEG-kibi-manifest-initialized-signal-CONFIG-AS-INITIALIZED
type: fact
---
A workspace with a leftover .kb/config.json and no .kb/manifest.json is treated as an initialized Kibi project by MCP workspace activation or by Cursor hook readiness.
