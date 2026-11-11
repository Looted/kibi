---
title: A symbol removed from symbols.yaml stays in the KB
status: active
tags:
  - negative-path
fact_kind: property_value
subject_key: kibi.sync.extractors
property_key: symbols_manifest_imported
operator: eq
value_type: bool
value_bool: false
origin:
  kind: agent
  recorded_at: '2026-11-10T11:00:00.000Z'
id: FACT-NEG-kibi-symbol-manifest-import-REMOVED-SYMBOL-KEPT
type: fact
---
After a symbol entry is removed from .kb/symbols.yaml, the next sync still serves that symbol from the branch KB.
