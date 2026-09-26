---
id: REQ-symbol-granularity
title: Symbol traceability uses narrowest valid symbols
status: open
created_at: 2026-05-30T00:00:00.000Z
updated_at: 2026-05-30T00:00:00.000Z
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
semantic_text: Symbol traceability relationships must target the narrowest available class, function, interface, type, enum, or executable symbol unless a coarse file or module symbol carries an explicit granularity reason.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 2828824dc3920337a52909edb9b66064dc1e369db6b1ff06733126fa32ae21b3
semantic_inventory:
  - claim_key: CLAIM-7F327A2CB7C5FE63
    claim_text: Symbol traceability relationships must target the narrowest available class, function, interface, type, enum, or executable symbol unless a coarse file or module symbol carries an explicit granularity reason
    role: exception
    status: ambiguous
    span:
      start: 0
      end: 207
    payload_hash: 2c65ad97246f2d91db9c2390d9df9bdcfd9244205d7431d5ef3da4ec8ab01150
    reason: No accepted typed interpretation grounds this assertive proposition.
logic_claims:
  - CLAIM-7F327A2CB7C5FE63
type: req
---

Symbol traceability relationships must target the narrowest available class, function, interface, type, enum, or executable symbol unless a coarse file or module symbol carries an explicit granularity reason.
