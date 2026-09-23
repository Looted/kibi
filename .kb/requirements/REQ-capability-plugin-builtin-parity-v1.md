---
title: Builtin capability parity
status: open
tags:
  - plugins
semantic_text: When kibi.plugins is absent, the host must use only automatically registered kibi-plugin-builtin providers. Builtin providers must be allowed to keep historical deterministic semantic ontology and TypeScript symbol analysis.
logic_claims:
  - CLAIM-C03388C2E2F780AC
  - CLAIM-3F41F5281E4B98CA
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 62cb575856b01ca6aca0a3ed09b459563e839d008e016bfd28b1d17b37d4325d
semantic_inventory:
  - claim_key: CLAIM-C03388C2E2F780AC
    claim_text: When kibi.plugins is absent, the host must use only automatically registered kibi-plugin-builtin providers
    role: condition
    status: modeled
    span:
      start: 0
      end: 106
    payload_hash: fb4dd7e3738772a635dbc7472004d52be6edbf384bcd0be0e06f0f9ef99d6ae0
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-3F41F5281E4B98CA
    claim_text: Builtin providers must be allowed to keep historical deterministic semantic ontology and TypeScript symbol analysis
    role: normative
    status: modeled
    span:
      start: 108
      end: 223
    payload_hash: fb4dd7e3738772a635dbc7472004d52be6edbf384bcd0be0e06f0f9ef99d6ae0
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
id: REQ-capability-plugin-builtin-parity-v1
type: req
proof_exempt: false
semantic_clauses:
  - When kibi.plugins is absent, the host must use only automatically registered kibi-plugin-builtin providers.
  - Builtin providers must be allowed to keep historical deterministic semantic ontology and TypeScript symbol analysis.
---
# REQ-capability-plugin-builtin-parity-v1

When kibi.plugins is absent, the host must use only automatically registered kibi-plugin-builtin providers. Builtin providers must be allowed to keep historical deterministic semantic ontology and TypeScript symbol analysis.
