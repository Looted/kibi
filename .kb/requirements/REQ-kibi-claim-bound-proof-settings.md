---
title: Claim-bound proof receipts and rule
status: open
priority: must
firmness: firm
semantic_text: A proof receipt outcome shall be passed, failed, errored, cancelled, skipped, timed_out or interrupted. Claim-bound proofs shall start at KB schema version 12. The proof contract claims check rule shall be proof-contract-claims.
semantic_clauses:
  - A proof receipt outcome shall be passed, failed, errored, cancelled, skipped, timed_out or interrupted.
  - Claim-bound proofs shall start at KB schema version 12.
  - The proof contract claims check rule shall be proof-contract-claims.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T10:57:39.069Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 1a17f732670d83fe1268a7f32d455acd08ee3d1d8db4ea62b061d8d565cfa7d9
semantic_inventory:
  - claim_key: CLAIM-C7F57251FDD48ED8
    claim_text: A proof receipt outcome shall be passed, failed, errored, cancelled, skipped, timed_out or interrupted
    role: normative
    status: modeled
    span:
      start: 0
      end: 102
  - claim_key: CLAIM-5946ECFCE6EFE677
    claim_text: Claim-bound proofs shall start at KB schema version 12
    role: normative
    status: modeled
    span:
      start: 104
      end: 158
  - claim_key: CLAIM-1308E97B03211146
    claim_text: The proof contract claims check rule shall be proof-contract-claims
    role: normative
    status: modeled
    span:
      start: 160
      end: 227
logic_claims:
  - CLAIM-C7F57251FDD48ED8
  - CLAIM-5946ECFCE6EFE677
  - CLAIM-1308E97B03211146
id: REQ-kibi-claim-bound-proof-settings
type: req
---
A proof receipt outcome shall be passed, failed, errored, cancelled, skipped, timed_out or interrupted. Claim-bound proofs shall start at KB schema version 12. The proof contract claims check rule shall be proof-contract-claims.

## Context

REQ-kibi-claim-bound-proofs binds proofs to claims: a receipt records one of a closed list of outcomes, the binding arrived with KB schema 12, and kb_check reports contracts that name no claims under its own rule. Each is stated here so it is proved against the constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"