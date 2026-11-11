---
title: Observable capability plugin behavior
status: open
tags:
  - plugins
semantic_text: Undeclared, path, and global plugin package names are invalid resolution inputs and must fail closed. When an installed capability plugin is not activated, the host must not import that package. An external capability provider must not run during a maintenance operation. Optional Jev must be absent from the default CLI, MCP, and runtime dependency graphs. An SDK-only third-party plugin must be allowed through the host capability seam as a provider operation. An external semantic classifier must be allowed only for kb_semantic_advisor and kb_compile_intent.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c31a9b527c263f69a0b04b7176970757894d34677d07363c30b15672f55bfa16
semantic_inventory:
  - claim_key: CLAIM-BE91D78C76F5AED6
    claim_text: Undeclared, path, and global plugin package names are invalid resolution inputs and must fail closed
    role: normative
    status: modeled
    span:
      start: 0
      end: 100
  - claim_key: CLAIM-63A77AF6D21E6F55
    claim_text: When an installed capability plugin is not activated, the host must not import that package
    role: condition
    status: modeled
    span:
      start: 102
      end: 193
  - claim_key: CLAIM-C279637CDAEEACFF
    claim_text: An external capability provider must not run during a maintenance operation
    role: normative
    status: modeled
    span:
      start: 195
      end: 270
  - claim_key: CLAIM-0B24DE1EDE8B627D
    claim_text: Optional Jev must be absent from the default CLI, MCP, and runtime dependency graphs
    role: normative
    status: modeled
    span:
      start: 272
      end: 356
  - claim_key: CLAIM-C47734A6D89B02CA
    claim_text: An SDK-only third-party plugin must be allowed through the host capability seam as a provider operation
    role: normative
    status: modeled
    span:
      start: 358
      end: 461
  - claim_key: CLAIM-C7D1AFFF5CDB6B36
    claim_text: An external semantic classifier must be allowed only for kb_semantic_advisor and kb_compile_intent
    role: normative
    status: modeled
    span:
      start: 463
      end: 561
logic_claims:
  - CLAIM-BE91D78C76F5AED6
  - CLAIM-63A77AF6D21E6F55
  - CLAIM-C279637CDAEEACFF
  - CLAIM-0B24DE1EDE8B627D
  - CLAIM-C47734A6D89B02CA
  - CLAIM-C7D1AFFF5CDB6B36
id: REQ-capability-plugin-observable-behavior-v1
type: req
proof_exempt: false
semantic_clauses:
  - Undeclared, path, and global plugin package names are invalid resolution inputs and must fail closed
  - When an installed capability plugin is not activated, the host must not import that package
  - An external capability provider must not run during a maintenance operation
  - Optional Jev must be absent from the default CLI, MCP, and runtime dependency graphs
  - An SDK-only third-party plugin must be allowed through the host capability seam as a provider operation
  - An external semantic classifier must be allowed only for kb_semantic_advisor and kb_compile_intent
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Firmness relabelled to default until reviewed. Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 5): "Ok" Maintainer decision, 2026-11-11, approving the wording fixes of the second KB gold-standard review: "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
firmness: default
required_evidence: tested
---
# REQ-capability-plugin-observable-behavior-v1

Undeclared, path, and global plugin package names are invalid resolution inputs and must fail closed. When an installed capability plugin is not activated, the host must not import that package. An external capability provider must not run during a maintenance operation. Optional Jev must be absent from the default CLI, MCP, and runtime dependency graphs. An SDK-only third-party plugin must be allowed through the host capability seam as a provider operation. An external semantic classifier must be allowed only for kb_semantic_advisor and kb_compile_intent.

## Why
The first version had no end-to-end proof of activation, rejection, mode and fallback. This requirement states the behavior a user can observe, so it could be proved through a real install. Maintenance paths stay builtin-only so checks stay deterministic. Source: Commit "prove observable plugin behavior and configure Jev from the environment"; ADR "Builtin semantics".
