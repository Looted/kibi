---
id: REQ-symbol-behavioral-anchors
title: Symbol traceability prefers behavioral anchors
status: open
created_at: 2026-06-06T00:00:00.000Z
updated_at: 2026-06-06T00:00:00.000Z
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
semantic_text: Symbol traceability granularity checks must reject coarse file/module links only when narrower behavioral symbols are available. Type-shape symbols such as interfaces, type aliases, and enums must not by themselves block a coarse behavioral link.
logic_claims:
  - CLAIM-867030205D8FADB4
  - CLAIM-6F780FCF425E5D75
semantic_clauses:
  - Symbol traceability granularity checks must reject coarse file/module links only when narrower behavioral symbols are available
  - Type-shape symbols such as interfaces, type aliases, and enums must not by themselves block a coarse behavioral link
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 249510a6ba5284319026eea05cbcc1bc45677f579a1d26b5fcd661fbe601bf1c
semantic_inventory:
  - claim_key: CLAIM-867030205D8FADB4
    claim_text: Symbol traceability granularity checks must reject coarse file/module links only when narrower behavioral symbols are available
    role: normative
    status: modeled
    span:
      start: 0
      end: 127
  - claim_key: CLAIM-6F780FCF425E5D75
    claim_text: Type-shape symbols such as interfaces, type aliases, and enums must not by themselves block a coarse behavioral link
    role: normative
    status: modeled
    span:
      start: 129
      end: 245
    payload_hash: e4d62b6bf58a64ec6953debe96d3b3367de5995a73bce0449744561a9a141f30
type: req
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-10, approving the supersession reasons recovered from history in the KB gold-standard review (reasons batch 1): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Symbol traceability granularity checks must reject coarse file/module links only when narrower behavioral symbols are available. Type-shape symbols such as interfaces, type aliases, and enums must not by themselves block a coarse behavioral link.

## Why this changed
Requiring the narrowest symbol of any kind made interfaces, type aliases and enums block a coarse behavioral link. Only narrower behavioral symbols should do that. Source: commit "add behavioral anchor traceability", Jun 6; diff of the two statements.
