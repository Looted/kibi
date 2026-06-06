---
id: SCEN-symbol-behavioral-anchors
title: Coarse behavioral links ignore type-shape-only symbols
status: active
created_at: 2026-06-06T00:00:00Z
updated_at: 2026-06-06T00:00:00Z
source: docs/symbol-traceability-taxonomy.md
tags: [symbols, traceability, ontology]
links:
  - type: validates
    target: REQ-symbol-behavioral-anchors
  - type: verified_by
    target: TEST-cli-symbol-behavioral-anchors
  - type: verified_by
    target: TEST-mcp-upsert-symbol-behavioral-anchors
---

Given a source file with exported interfaces, type aliases, or enums but no extracted behavioral symbols, when a coarse symbol with traceability relationships links to that file, then Kibi accepts the link unless a narrower behavioral symbol is available.
