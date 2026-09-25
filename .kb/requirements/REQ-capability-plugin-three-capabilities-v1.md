---
title: Three replaceable capabilities
status: open
tags:
  - plugins
semantic_text: Allowed capability states are one of kibi.semantic-classifier.v1, kibi.ontology-pack.v1, and kibi.symbol-extractor.v1. Each capability must have at most one replace provider per capability. Shadow mode must leave canonical capability results unchanged. Augment mode must add capability results beside builtin providers.
logic_claims:
  - CLAIM-E6E0E9DF0A44A625
  - CLAIM-0DD019DFE9EE55AB
  - CLAIM-0FE6A514358FE47A
  - CLAIM-4E1843572AFC51D0
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 9288b2355213cbe27c9968f26b41db24ae4db17a3910127950271f585f628fac
semantic_inventory:
  - claim_key: CLAIM-E6E0E9DF0A44A625
    claim_text: Allowed capability states are one of kibi.semantic-classifier.v1, kibi.ontology-pack.v1, and kibi.symbol-extractor.v1
    role: descriptive
    status: modeled
    span:
      start: 0
      end: 117
    payload_hash: a1ba6a82266cbeb12272279a2d10505e1120a0b4333176a11d4d6875fd60188b
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-0DD019DFE9EE55AB
    claim_text: Each capability must have at most one replace provider per capability
    role: normative
    status: modeled
    span:
      start: 119
      end: 188
    payload_hash: a1ba6a82266cbeb12272279a2d10505e1120a0b4333176a11d4d6875fd60188b
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-0FE6A514358FE47A
    claim_text: Shadow mode must leave canonical capability results unchanged
    role: normative
    status: modeled
    span:
      start: 190
      end: 251
    payload_hash: a1ba6a82266cbeb12272279a2d10505e1120a0b4333176a11d4d6875fd60188b
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-4E1843572AFC51D0
    claim_text: Augment mode must add capability results beside builtin providers
    role: normative
    status: modeled
    span:
      start: 253
      end: 318
    payload_hash: a1ba6a82266cbeb12272279a2d10505e1120a0b4333176a11d4d6875fd60188b
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
id: REQ-capability-plugin-three-capabilities-v1
type: req
proof_exempt: false
semantic_clauses:
  - Allowed capability states are one of kibi.semantic-classifier.v1, kibi.ontology-pack.v1, and kibi.symbol-extractor.v1.
  - Each capability must have at most one replace provider per capability.
  - Shadow mode must leave canonical capability results unchanged.
  - Augment mode must add capability results beside builtin providers.
---
# REQ-capability-plugin-three-capabilities-v1

Allowed capability states are one of kibi.semantic-classifier.v1, kibi.ontology-pack.v1, and kibi.symbol-extractor.v1. Each capability must have at most one replace provider per capability. Shadow mode must leave canonical capability results unchanged. Augment mode must add capability results beside builtin providers.
