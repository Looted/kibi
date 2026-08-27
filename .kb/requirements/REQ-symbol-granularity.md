---
id: REQ-symbol-granularity
title: Symbol traceability uses narrowest valid symbols
status: open
created_at: 2026-05-30T00:00:00Z
updated_at: 2026-05-30T00:00:00Z
source: docs/symbol-traceability-taxonomy.md
priority: must
tags:
  - symbols
  - traceability
  - ontology
links:
  - type: specified_by
    target: SCEN-symbol-granularity
  - type: verified_by
    target: TEST-cli-symbol-extract-methods
  - type: verified_by
    target: TEST-mcp-upsert-method-granularity
---

Symbol traceability relationships must target the narrowest available class, function, interface, type, enum, or executable symbol unless a coarse file or module symbol carries an explicit granularity reason.
