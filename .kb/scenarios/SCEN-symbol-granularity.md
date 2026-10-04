---
id: SCEN-symbol-granularity
title: Traceability resolves to the narrowest available symbol
status: active
created_at: 2026-06-01T00:00:00Z
updated_at: 2026-06-01T00:00:00Z
source: docs/symbol-traceability-taxonomy.md
tags: [symbols, traceability, ontology]
links:
  - type: verified_by
    target: TEST-cli-symbol-extract-methods
  - type: verified_by
    target: TEST-mcp-upsert-method-granularity
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Given extracted symbols include class methods or otherwise narrow code symbols, traceability must prefer the narrowest unambiguous symbol target. Coarse module or file-level symbols remain valid only when no narrower symbol is available or an explicit granularity reason is supplied.
