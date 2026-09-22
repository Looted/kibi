---
title: Observable capability plugin behavior
status: open
tags:
  - plugins
semantic_text: Undeclared, path, and global plugin package names are invalid resolution inputs and must fail closed. When an installed capability plugin is not activated, the host must not import that package. An external capability provider must not run during a maintenance operation. Optional Jev must be absent from the default CLI, MCP, and runtime dependency graphs. An SDK-only third-party plugin must be allowed through the host capability seam as a provider operation. An external semantic classifier must be allowed only for kb_semantic_advisor. An external semantic classifier must be allowed only for kb_compile_intent.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: a74283b7e47b0b33bec2dc1d3f2255ffd192d6a2cc0a63612cbf6f571968c098
semantic_inventory:
  - claim_key: CLAIM-BE91D78C76F5AED6
    claim_text: Undeclared, path, and global plugin package names are invalid resolution inputs and must fail closed
    role: normative
    status: modeled
    span:
      start: 0
      end: 100
    payload_hash: 8a99d27c9a039584b63b5b90074ac4e7428dda8724f9b7c93a1ec32dc2bc9847
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-63A77AF6D21E6F55
    claim_text: When an installed capability plugin is not activated, the host must not import that package
    role: condition
    status: modeled
    span:
      start: 102
      end: 193
    payload_hash: 8a99d27c9a039584b63b5b90074ac4e7428dda8724f9b7c93a1ec32dc2bc9847
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-C279637CDAEEACFF
    claim_text: An external capability provider must not run during a maintenance operation
    role: normative
    status: modeled
    span:
      start: 195
      end: 270
    payload_hash: 8a99d27c9a039584b63b5b90074ac4e7428dda8724f9b7c93a1ec32dc2bc9847
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-0B24DE1EDE8B627D
    claim_text: Optional Jev must be absent from the default CLI, MCP, and runtime dependency graphs
    role: normative
    status: modeled
    span:
      start: 272
      end: 356
    payload_hash: 8a99d27c9a039584b63b5b90074ac4e7428dda8724f9b7c93a1ec32dc2bc9847
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-C47734A6D89B02CA
    claim_text: An SDK-only third-party plugin must be allowed through the host capability seam as a provider operation
    role: normative
    status: modeled
    span:
      start: 358
      end: 461
    payload_hash: 8a99d27c9a039584b63b5b90074ac4e7428dda8724f9b7c93a1ec32dc2bc9847
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-08144D5332C78E6F
    claim_text: An external semantic classifier must be allowed only for kb_semantic_advisor
    role: normative
    status: modeled
    span:
      start: 463
      end: 539
    payload_hash: 8a99d27c9a039584b63b5b90074ac4e7428dda8724f9b7c93a1ec32dc2bc9847
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-527900920AE83BD4
    claim_text: An external semantic classifier must be allowed only for kb_compile_intent
    role: normative
    status: modeled
    span:
      start: 541
      end: 615
    payload_hash: 8a99d27c9a039584b63b5b90074ac4e7428dda8724f9b7c93a1ec32dc2bc9847
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
logic_claims:
  - CLAIM-BE91D78C76F5AED6
  - CLAIM-63A77AF6D21E6F55
  - CLAIM-C279637CDAEEACFF
  - CLAIM-0B24DE1EDE8B627D
  - CLAIM-C47734A6D89B02CA
  - CLAIM-08144D5332C78E6F
  - CLAIM-527900920AE83BD4
id: REQ-capability-plugin-observable-behavior-v1
type: req
proof_exempt: false
semantic_clauses:
  - Undeclared, path, and global plugin package names are invalid resolution inputs and must fail closed.
  - When an installed capability plugin is not activated, the host must not import that package.
  - An external capability provider must not run during a maintenance operation.
  - Optional Jev must be absent from the default CLI, MCP, and runtime dependency graphs.
  - An SDK-only third-party plugin must be allowed through the host capability seam as a provider operation.
  - An external semantic classifier must be allowed only for kb_semantic_advisor.
  - An external semantic classifier must be allowed only for kb_compile_intent.
---
# REQ-capability-plugin-observable-behavior-v1

Undeclared, path, and global plugin package names are invalid resolution inputs and must fail closed. When an installed capability plugin is not activated, the host must not import that package. An external capability provider must not run during a maintenance operation. Optional Jev must be absent from the default CLI, MCP, and runtime dependency graphs. An SDK-only third-party plugin must be allowed through the host capability seam as a provider operation. An external semantic classifier must be allowed only for kb_semantic_advisor. An external semantic classifier must be allowed only for kb_compile_intent.
