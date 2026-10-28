---
title: Non-numeric certificate proof kinds
status: open
priority: should
firmness: firm
semantic_text: Rule, state_machine and regex must each be certificate proof kinds.
semantic_clauses:
  - Rule, state_machine and regex must each be certificate proof kinds.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T13:45:57.834Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 018c51f226d4d7d58629f1f4f7dbcfeaee901c1412a9b8a5b7df596fa97d86d3
semantic_inventory:
  - claim_key: CLAIM-289608FF49F0F9C6
    claim_text: Rule, state_machine and regex must each be certificate proof kinds
    role: normative
    status: modeled
    span:
      start: 0
      end: 66
logic_claims:
  - CLAIM-289608FF49F0F9C6
id: REQ-kibi-non-numeric-certificate-kinds
type: req
---
Rule, state_machine and regex must each be certificate proof kinds.

## Context

REQ-kibi-non-numeric-proof-kinds adds rule, state_machine and regex proofs. isCertificateProofKind in packages/cli/src/public/proof-protocol.ts decides which kinds need a certificate, and a rule certificate proves the three kinds are among them.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"