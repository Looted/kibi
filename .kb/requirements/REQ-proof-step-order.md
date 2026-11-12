---
title: A proof contract's steps run in their declared order
status: open
priority: must
tags:
  - proof
semantic_text: The proof producer must not start a step of a proof contract while an earlier step of that contract is still running.
required_evidence: tested
origin:
  kind: agent
  ref: Post-release review of Kibi 2026.11.2, 2026-11-12
  approved_by: maintainer
  recorded_at: '2026-11-12T16:06:11.000Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: fd459195103ee3a3b379fac1b9deea60ed0bc1696cab088bd871a2895a784654
semantic_inventory:
  - claim_key: CLAIM-6A164EB7D3C45EC9
    claim_text: The proof producer must not start a step of a proof contract while an earlier step of that contract is still running
    role: normative
    status: modeled
    span:
      start: 0
      end: 116
    reason: Grounded by FACT-proof-step-order-earlier-steps-finish via requires_property.
logic_claims:
  - CLAIM-6A164EB7D3C45EC9
id: REQ-proof-step-order
type: req
---
The proof producer must not start a step of a proof contract while an earlier step of that contract is still running.

## Context

A proof contract may declare a step that reads what an earlier step built, as the Lean intervals contract does: its second and third steps run the binary that `lake build` produces in the first. The producer ran distinct steps of all selected contracts in a pool of `KIBI_PROOF_STEP_CONCURRENCY` with no order inside a contract, so in CI the later steps could start while the build was still running and fail for want of the binary. A step now waits for the steps its contract declares before it; steps of different contracts still run side by side.

## Source

Post-release review of Kibi 2026.11.2 (2026-11-12).
