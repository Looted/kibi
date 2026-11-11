---
title: The aggregate pull request gate validates the whole change against the trusted target
status: open
semantic_text: Kibi must resolve a unique trusted repository, target ref, base and head for aggregate pull request validation. Kibi must validate the complete merge-base-to-head Git inventory in the aggregate pull request gate. Kibi must reject candidate policy weakening against the trusted target policy. Kibi must run aggregate validation without executing candidate workspace code.
semantic_clauses:
  - Kibi must resolve a unique trusted repository, target ref, base and head for aggregate pull request validation
  - Kibi must validate the complete merge-base-to-head Git inventory in the aggregate pull request gate
  - Kibi must reject candidate policy weakening against the trusted target policy
  - Kibi must run aggregate validation without executing candidate workspace code
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d93a65a4f5b3ee224fa7d1b10056634e33479481891ccb97509d008ad104b391
semantic_inventory:
  - claim_key: CLAIM-097BCE1268B9EAEC
    claim_text: Kibi must resolve a unique trusted repository, target ref, base and head for aggregate pull request validation
    role: normative
    status: modeled
    span:
      start: 0
      end: 110
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-2B3C543C216F686F
    claim_text: Kibi must validate the complete merge-base-to-head Git inventory in the aggregate pull request gate
    role: normative
    status: modeled
    span:
      start: 112
      end: 211
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-D7F08F67F0CB82AF
    claim_text: Kibi must reject candidate policy weakening against the trusted target policy
    role: normative
    status: modeled
    span:
      start: 213
      end: 290
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-377FABBF19D3105A
    claim_text: Kibi must run aggregate validation without executing candidate workspace code
    role: normative
    status: modeled
    span:
      start: 292
      end: 369
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-097BCE1268B9EAEC
  - CLAIM-2B3C543C216F686F
  - CLAIM-D7F08F67F0CB82AF
  - CLAIM-377FABBF19D3105A
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T08:00:57.755Z'
tags:
  - multilingual
  - impact-policy
  - stage-e
  - pull-request
firmness: firm
id: REQ-kibi-impact-aggregate-pr-gate
type: req
---
Kibi must resolve a unique trusted repository, target ref, base and head for aggregate pull request validation. Kibi must validate the complete merge-base-to-head Git inventory in the aggregate pull request gate. Kibi must reject candidate policy weakening against the trusted target policy. Kibi must run aggregate validation without executing candidate workspace code.

## Context

The gate runs from the protected target, so a pull request cannot loosen the policy or run its own code to pass the check it is judged by.

Impact review is how a change proves it considered every affected requirement, so evidence that drifts from the reviewed bytes, a gate that trusts the candidate, or a policy that switches itself on would each let unreviewed changes through.

## Why this changed

Split from REQ-impact-policy-stage-e-content-bound-review, which held three behaviors: review evidence bound to exact content, the trusted aggregate pull request gate, and receipt, advisory and opt-in handling around them. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
