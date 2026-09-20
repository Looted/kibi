---
title: Builtin capability parity
status: open
tags:
  - plugins
semantic_text: With no kibi.plugins configuration, Kibi must use only the automatically registered kibi-plugin-builtin providers and preserve historical semantic, ontology, and TypeScript symbol analysis behavior.
logic_claims:
  - CLAIM-8D06A9D8603734D2
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 345575f7f0ba442614c9154c1cdef2e8646e25263028fd78fd1147c693c9c7e9
semantic_inventory:
  - claim_key: CLAIM-8D06A9D8603734D2
    claim_text: With no kibi.plugins configuration, Kibi must use only the automatically registered kibi-plugin-builtin providers and preserve historical semantic, ontology, and TypeScript symbol analysis behavior
    payload_hash: 5a0e7f227c106fba78a42a48eecb0dc434882671b9f220e7adc84bb03bc13ff6
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
    role: normative
    span:
      end: 197
      start: 0
    status: ontology_gap
id: REQ-capability-plugin-builtin-parity-v1
type: req
proof_exempt: false
proof_exempt_reason: architectural boundary — verified by builtin parity and host unit tests, not product E2E
---
# REQ-capability-plugin-builtin-parity-v1

With no kibi.plugins configuration, Kibi must use only the automatically registered kibi-plugin-builtin providers and preserve historical semantic, ontology, and TypeScript symbol analysis behavior.
