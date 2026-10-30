---
title: Check policy contract version
status: open
priority: must
firmness: firm
semantic_text: A check policy plugin contract shall be kibi.check-policy.v1.
semantic_clauses:
  - A check policy plugin contract shall be kibi.check-policy.v1.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-29T16:59:00.017Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 240159302d0f9c0ea76fb1c86076bd1cbdc36a85d161c8f9fff3a755e8a11a8b
semantic_inventory:
  - claim_key: CLAIM-01D7E1782A68ED2E
    claim_text: A check policy plugin contract shall be kibi.check-policy.v1
    role: normative
    status: modeled
    span:
      start: 0
      end: 60
logic_claims:
  - CLAIM-01D7E1782A68ED2E
id: REQ-capability-check-policy-version
type: req
---
A check policy plugin contract shall be kibi.check-policy.v1.

## Context

packages/plugin-sdk/src/capabilities/check-policy.ts versions the contract REQ-capability-check-policy plugins implement. The version is stated here so it is proved against the constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"