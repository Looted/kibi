---
title: Claim binding verdict vocabulary
status: open
priority: should
firmness: firm
semantic_text: A claim binding must be one of derived, attested or rejected.
semantic_clauses:
  - A claim binding must be one of derived, attested or rejected.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T13:43:33.103Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: f5d12005c20bf30febaa7f95e9cab3424856d0b2533ac87776ba573721010d64
semantic_inventory:
  - claim_key: CLAIM-B5DC77B02767FF31
    claim_text: A claim binding must be one of derived, attested or rejected
    role: normative
    status: modeled
    span:
      start: 0
      end: 60
logic_claims:
  - CLAIM-B5DC77B02767FF31
id: REQ-kibi-claim-binding-verdicts
type: req
---
A claim binding must be one of derived, attested or rejected.

## Context

REQ-kibi-claim-bound-proofs records a verdict for every claim a proof run names. CLAIM_BINDING_VERDICTS in packages/cli/src/public/proof-receipt.ts holds the closed list, and an exhaustive certificate proves it.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"