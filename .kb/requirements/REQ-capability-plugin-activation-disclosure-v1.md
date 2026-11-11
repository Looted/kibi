---
title: Explicit activation and network disclosure
status: open
tags:
  - plugins
semantic_text: A capability plugin must be activated only from explicit package.json kibi.plugins configuration. A capability plugin package must resolve from the project-local dependency graph and must not use a global installation. Plugin permission metadata must not be an allowed provider operation for sandbox enforcement.
logic_claims:
  - CLAIM-2F275AF8F97A7F6E
  - CLAIM-D5F22EE18EE4D00D
  - CLAIM-5BAA13F7DBEB043C
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 606894ec280e3b65c3a38d0e48734362d891495311a81e6389ee7bae72ed228f
semantic_inventory:
  - claim_key: CLAIM-2F275AF8F97A7F6E
    claim_text: A capability plugin must be activated only from explicit package.json kibi.plugins configuration
    role: normative
    status: modeled
    span:
      start: 0
      end: 96
    payload_hash: 05cf280e63148927fb9a6871b98f1283dc95bd942d0d6a8db43bf1d6ba590c98
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-D5F22EE18EE4D00D
    claim_text: A capability plugin package must resolve from the project-local dependency graph and must not use a global installation
    role: normative
    status: modeled
    span:
      start: 98
      end: 217
    payload_hash: 05cf280e63148927fb9a6871b98f1283dc95bd942d0d6a8db43bf1d6ba590c98
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-5BAA13F7DBEB043C
    claim_text: Plugin permission metadata must not be an allowed provider operation for sandbox enforcement
    role: normative
    status: modeled
    span:
      start: 219
      end: 311
    payload_hash: 05cf280e63148927fb9a6871b98f1283dc95bd942d0d6a8db43bf1d6ba590c98
    reason: No accepted typed interpretation grounds this assertive proposition.
id: REQ-capability-plugin-activation-disclosure-v1
type: req
proof_exempt: false
semantic_clauses:
  - A capability plugin must be activated only from explicit package.json kibi.plugins configuration.
  - A capability plugin package must resolve from the project-local dependency graph and must not use a global installation.
  - Plugin permission metadata must not be an allowed provider operation for sandbox enforcement.
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Firmness relabelled to default until reviewed. Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 5): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
firmness: default
required_evidence: tested
---
# REQ-capability-plugin-activation-disclosure-v1

A capability plugin must be activated only from explicit package.json kibi.plugins configuration. A capability plugin package must resolve from the project-local dependency graph and must not use a global installation. Plugin permission metadata must not be an allowed provider operation for sandbox enforcement.

## Why
Activating a package grants it code-execution trust, so it must be an explicit, declared, project-local choice. Global installs and ambient packages are rejected. Permission metadata is disclosure for operators only, because Kibi can't sandbox a package after importing it. Source: docs/plugin-development.md, "Trust boundary".
