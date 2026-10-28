---
title: Impact review versions and policy path
status: open
priority: must
firmness: firm
semantic_text: The impact policy file shall be .kibi/impact-policy.json. The impact policy version shall be kibi.impact-policy.v1. The impact review version shall be kibi.impact-review.v1. The impact evaluator version shall be kibi.impact-evaluator.v1.
semantic_clauses:
  - The impact policy file shall be .kibi/impact-policy.json.
  - The impact policy version shall be kibi.impact-policy.v1.
  - The impact review version shall be kibi.impact-review.v1.
  - The impact evaluator version shall be kibi.impact-evaluator.v1.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T17:31:49.039Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 4dc3ccdf01b2d7db6f4401b41bfc5e9c6fed2e7939555fb72210de732b21ce8f
semantic_inventory:
  - claim_key: CLAIM-FF8C4B4F98821E01
    claim_text: The impact policy file shall be .kibi/impact-policy.json
    role: normative
    status: modeled
    span:
      start: 0
      end: 56
  - claim_key: CLAIM-66AE03740817D7D3
    claim_text: The impact policy version shall be kibi.impact-policy.v1
    role: normative
    status: modeled
    span:
      start: 58
      end: 114
  - claim_key: CLAIM-CC2BEED3DB80189F
    claim_text: The impact review version shall be kibi.impact-review.v1
    role: normative
    status: modeled
    span:
      start: 116
      end: 172
  - claim_key: CLAIM-5857985CFA6DB752
    claim_text: The impact evaluator version shall be kibi.impact-evaluator.v1
    role: normative
    status: modeled
    span:
      start: 174
      end: 236
logic_claims:
  - CLAIM-FF8C4B4F98821E01
  - CLAIM-66AE03740817D7D3
  - CLAIM-CC2BEED3DB80189F
  - CLAIM-5857985CFA6DB752
id: REQ-impact-review-identifiers
type: req
---
The impact policy file shall be .kibi/impact-policy.json. The impact policy version shall be kibi.impact-policy.v1. The impact review version shall be kibi.impact-review.v1. The impact evaluator version shall be kibi.impact-evaluator.v1.

## Context

packages/cli/src/traceability/impact-review.ts versions the review, policy and evaluator documents REQ-impact-policy-stage-e-content-bound-review binds to staged content, and names the policy file a project commits. They are stated here so every identifier is proved against its constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"