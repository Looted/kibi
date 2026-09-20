---
title: Capability plugin protocol safety
status: open
tags:
  - plugins
  - protocol
semantic_text: Activated capability plugins must export a validated kibi.plugin.v1 named kibiPlugin, declare only supported capabilities, and be loaded only when explicitly listed under project kibi.plugins as bare declared dependency package names resolved through the project-local package manager.
logic_claims:
  - CLAIM-8093477265BBFDE4
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ececdcd2edf813bbba13803527226cbe7ad446a57110f730f2c8a4bbd4929458
semantic_inventory:
  - claim_key: CLAIM-8093477265BBFDE4
    claim_text: Activated capability plugins must export a validated kibi.plugin.v1 named kibiPlugin, declare only supported capabilities, and be loaded only when explicitly listed under project kibi.plugins as bare declared dependency package names resolved through the project-local package manager
    payload_hash: 1fef503dbe17db14da64e8294ba26dbb532d961d93d2b1f73400975d7a364ab3
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
    role: normative
    span:
      end: 284
      start: 0
    status: ontology_gap
id: REQ-capability-plugin-protocol-v1
type: req
proof_exempt: false
proof_exempt_reason: architectural boundary — verified by capability-plugin host unit tests and package distribution checks, not product E2E
---
# REQ-capability-plugin-protocol-v1

Activated capability plugins must export a validated kibi.plugin.v1 named kibiPlugin, declare only supported capabilities, and be loaded only when explicitly listed under project kibi.plugins as bare declared dependency package names resolved through the project-local package manager.
