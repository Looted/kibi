---
title: Explicit activation and network disclosure
status: open
tags:
  - plugins
semantic_text: Optional capability plugins must be activated explicitly in package.json kibi.plugins, and plugin permissions for network, metered usage, and secrets must be treated as disclosure metadata rather than an in-process sandbox.
logic_claims:
  - CLAIM-32FFB9389087C607
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ec9cca4e0a26d521facf94495775b8e26ad1ca416d2e6d2990ccf56c3255eb62
semantic_inventory:
  - claim_key: CLAIM-32FFB9389087C607
    claim_text: Optional capability plugins must be activated explicitly in package.json kibi.plugins, and plugin permissions for network, metered usage, and secrets must be treated as disclosure metadata rather than an in-process sandbox
    payload_hash: ecc1964a9068c8d19f738338928e88f5296d0a6a86b4c83077b0a25efcdbaa56
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
    role: normative
    span:
      end: 222
      start: 0
    status: ontology_gap
id: REQ-capability-plugin-activation-disclosure-v1
type: req
proof_exempt: false
proof_exempt_reason: architectural boundary — verified by activation/disclosure host unit tests, not product E2E
---
# REQ-capability-plugin-activation-disclosure-v1

Optional capability plugins must be activated explicitly in package.json kibi.plugins, and plugin permissions for network, metered usage, and secrets must be treated as disclosure metadata rather than an in-process sandbox.
