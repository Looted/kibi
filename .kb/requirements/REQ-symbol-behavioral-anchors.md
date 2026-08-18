---
id: REQ-symbol-behavioral-anchors
title: Symbol traceability prefers behavioral anchors
status: open
created_at: 2026-06-06T00:00:00Z
updated_at: 2026-06-06T00:00:00Z
source: docs/symbol-traceability-taxonomy.md
priority: must
tags:
  - symbols
  - traceability
  - ontology
links:
  - type: supersedes
    target: REQ-symbol-granularity
  - type: specified_by
    target: SCEN-symbol-behavioral-anchors
  - type: verified_by
    target: TEST-cli-symbol-behavioral-anchors
  - type: verified_by
    target: TEST-mcp-upsert-symbol-behavioral-anchors
---

Symbol traceability granularity checks must reject coarse file/module links only when narrower behavioral symbols are available. Type-shape symbols such as interfaces, type aliases, and enums must not by themselves block a coarse behavioral link.
