---
title: Plan document versions
status: open
priority: must
firmness: firm
semantic_text: The compiled plan version shall be kibi.compile-plan.v1. The plan apply result version shall be kibi.plan-apply-result.v1. The repair plan version shall be kibi.repair-plan.v1. The symbol repair plan version shall be kibi.symbol-repair-plan.v1.
semantic_clauses:
  - The compiled plan version shall be kibi.compile-plan.v1.
  - The plan apply result version shall be kibi.plan-apply-result.v1.
  - The repair plan version shall be kibi.repair-plan.v1.
  - The symbol repair plan version shall be kibi.symbol-repair-plan.v1.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T17:45:09.115Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 9877ddf1d885987098b6e92fc728041ff972b4380f99a532c98bc1f6cc59d521
semantic_inventory:
  - claim_key: CLAIM-FE782C6BF95D6643
    claim_text: The compiled plan version shall be kibi.compile-plan.v1
    role: normative
    status: modeled
    span:
      start: 0
      end: 55
  - claim_key: CLAIM-3CBF895C02EDE2BB
    claim_text: The plan apply result version shall be kibi.plan-apply-result.v1
    role: normative
    status: modeled
    span:
      start: 57
      end: 121
  - claim_key: CLAIM-159F17EBC799D9E8
    claim_text: The repair plan version shall be kibi.repair-plan.v1
    role: normative
    status: modeled
    span:
      start: 123
      end: 175
  - claim_key: CLAIM-BC7A149A10F9A5EA
    claim_text: The symbol repair plan version shall be kibi.symbol-repair-plan.v1
    role: normative
    status: modeled
    span:
      start: 177
      end: 243
logic_claims:
  - CLAIM-FE782C6BF95D6643
  - CLAIM-3CBF895C02EDE2BB
  - CLAIM-159F17EBC799D9E8
  - CLAIM-BC7A149A10F9A5EA
id: REQ-kibi-plan-document-versions
type: req
---
The compiled plan version shall be kibi.compile-plan.v1. The plan apply result version shall be kibi.plan-apply-result.v1. The repair plan version shall be kibi.repair-plan.v1. The symbol repair plan version shall be kibi.symbol-repair-plan.v1.

## Context

REQ-kibi-change-to-proof-plan-compiler compiles a change into a plan an agent reviews and applies; repair and symbol repair plans follow the same shape. Every plan document and the apply result carry a version string, stated here so it is proved against its constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"