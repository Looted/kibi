---
title: KB lifecycle review codes
status: open
semantic_text: The proposed ADR review code shall be review_adr_proposed. The unlinked ADR review code shall be review_adr_unlinked. The unapproved exception review code shall be review_exception_unapproved. The missing rationale review code shall be review_requirement_rationale_missing. The supersession cycle review code shall be review_supersession_cycle. The superseded symbol owner review action id shall be review-symbol-owner-superseded. The superseded symbol owner review code shall be review_symbol_owner_superseded.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: bf9d12b4c02ba0b24c828cc12804669f87c53f757e4f0b5c3205a67112cf8cf8
semantic_inventory:
  - claim_key: CLAIM-C3EEAB6C1BBB59F7
    claim_text: The proposed ADR review code shall be review_adr_proposed
    role: normative
    status: modeled
    span:
      start: 0
      end: 57
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-38F792CCEE6129F9
    claim_text: The unlinked ADR review code shall be review_adr_unlinked
    role: normative
    status: modeled
    span:
      start: 59
      end: 116
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-21E64A855F1EB4A6
    claim_text: The unapproved exception review code shall be review_exception_unapproved
    role: normative
    status: modeled
    span:
      start: 118
      end: 191
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-0380F3C1816B850D
    claim_text: The missing rationale review code shall be review_requirement_rationale_missing
    role: normative
    status: modeled
    span:
      start: 193
      end: 272
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-B26CCE9856ABAD66
    claim_text: The supersession cycle review code shall be review_supersession_cycle
    role: normative
    status: modeled
    span:
      start: 274
      end: 343
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-525C794415A21798
    claim_text: The superseded symbol owner review action id shall be review-symbol-owner-superseded
    role: normative
    status: modeled
    span:
      start: 345
      end: 429
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-9646A15E0E142800
    claim_text: The superseded symbol owner review code shall be review_symbol_owner_superseded
    role: normative
    status: modeled
    span:
      start: 431
      end: 510
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-C3EEAB6C1BBB59F7
  - CLAIM-38F792CCEE6129F9
  - CLAIM-21E64A855F1EB4A6
  - CLAIM-0380F3C1816B850D
  - CLAIM-B26CCE9856ABAD66
  - CLAIM-525C794415A21798
  - CLAIM-9646A15E0E142800
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"'
  approved_by: maintainer
  recorded_at: '2026-11-04T18:11:53.335Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - proof
id: REQ-kibi-lifecycle-review-codes
type: req
---
The proposed ADR review code shall be review_adr_proposed. The unlinked ADR review code shall be review_adr_unlinked. The unapproved exception review code shall be review_exception_unapproved. The missing rationale review code shall be review_requirement_rationale_missing. The supersession cycle review code shall be review_supersession_cycle. The superseded symbol owner review action id shall be review-symbol-owner-superseded. The superseded symbol owner review code shall be review_symbol_owner_superseded.

## Context

These are the codes of the lifecycle findings that kibi migrate leaves for a person to review.

REQ-kibi-kb-lifecycle-integrity has kb_check report lifecycle problems with stable codes an agent can act on: review codes for findings a person must judge and action ids and codes for repairs Kibi can apply. They are stated here so every code is proved against its constant.

## Why this changed

Split from REQ-kibi-lifecycle-check-codes, which held thirteen codes for three kinds of lifecycle action. Each child is the codes of one kind of action.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"
