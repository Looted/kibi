---
title: Jev classifier optional fallback
status: open
tags:
  - plugins
semantic_text: A TypeSafe client or network call must be absent when kibi-plugin-jev is imported or the registry is inactive. When the Jev semantic classifier is unavailable, classification must fall back to builtin analysis. Plugin diagnostics must not expose credentials.
logic_claims:
  - CLAIM-303792FABB5EDCA6
  - CLAIM-667188ECE5EC04C8
  - CLAIM-5A84BFC75BAA5A5D
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ff38d37d1ba770dda6b4863906585c0b60b3405d00b0de55b7c292623ef9504d
semantic_inventory:
  - claim_key: CLAIM-303792FABB5EDCA6
    claim_text: A TypeSafe client or network call must be absent when kibi-plugin-jev is imported or the registry is inactive
    role: normative
    status: modeled
    span:
      start: 0
      end: 109
    payload_hash: 010689f8a85b1732898aec22af8dae60b521d69d3c40a54bc002734a4c631be6
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-667188ECE5EC04C8
    claim_text: When the Jev semantic classifier is unavailable, classification must fall back to builtin analysis
    role: condition
    status: modeled
    span:
      start: 111
      end: 209
    payload_hash: 010689f8a85b1732898aec22af8dae60b521d69d3c40a54bc002734a4c631be6
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-5A84BFC75BAA5A5D
    claim_text: Plugin diagnostics must not expose credentials
    role: normative
    status: modeled
    span:
      start: 211
      end: 257
    payload_hash: 010689f8a85b1732898aec22af8dae60b521d69d3c40a54bc002734a4c631be6
    reason: No accepted typed interpretation grounds this assertive proposition.
id: REQ-capability-plugin-jev-fallback-v1
type: req
proof_exempt: false
semantic_clauses:
  - A TypeSafe client or network call must be absent when kibi-plugin-jev is imported or the registry is inactive.
  - When the Jev semantic classifier is unavailable, classification must fall back to builtin analysis.
  - Plugin diagnostics must not expose credentials.
---
# REQ-capability-plugin-jev-fallback-v1

A TypeSafe client or network call must be absent when kibi-plugin-jev is imported or the registry is inactive. When the Jev semantic classifier is unavailable, classification must fall back to builtin analysis. Plugin diagnostics must not expose credentials.
