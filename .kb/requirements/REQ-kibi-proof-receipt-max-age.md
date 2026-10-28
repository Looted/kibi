---
title: A proof receipt stays fresh for 604800 seconds
status: open
priority: must
firmness: firm
semantic_text: The maximum proof receipt age shall be 604800 seconds.
semantic_clauses:
  - The maximum proof receipt age shall be 604800 seconds.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T10:12:08.337Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c4048b2c41d9e12bd0e7e87dfa79c651aae133d1bc1979a5988510ce048631c8
semantic_inventory:
  - claim_key: CLAIM-B7AF26BF0F918815
    claim_text: The maximum proof receipt age shall be 604800 seconds
    role: normative
    status: modeled
    span:
      start: 0
      end: 53
logic_claims:
  - CLAIM-B7AF26BF0F918815
id: REQ-kibi-proof-receipt-max-age
type: req
---
The maximum proof receipt age shall be 604800 seconds.

## Context

PROOF_RECEIPT_MAX_AGE_SECONDS in packages/cli/src/public/proof-receipt.ts is the age after which a passing receipt no longer proves its requirement. REQ-kibi-fresh-verification-receipts-v2 says a receipt must be no older than seven days; this requirement states the limit as a number so it is proved against the constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"