---
title: Impact review keeps receipt appends and advisories consistent and stays off until enabled
status: open
semantic_text: Kibi must preserve projected review scope and authored requirement semantics when canonically appending proof receipts. Kibi must resolve legacy staged impact advisories after a complete valid review while retaining unrelated ownership and incomplete analysis diagnostics. Kibi must preserve existing project behavior until impact policy is explicitly enabled.
semantic_clauses:
  - Kibi must preserve projected review scope and authored requirement semantics when canonically appending proof receipts
  - Kibi must resolve legacy staged impact advisories after a complete valid review while retaining unrelated ownership and incomplete analysis diagnostics
  - Kibi must preserve existing project behavior until impact policy is explicitly enabled
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 417397ada5d95867512560e1d6e491d3e990bf0d3d8cf5884d4c9b126f1f9484
semantic_inventory:
  - claim_key: CLAIM-330896475CDE15F7
    claim_text: Kibi must preserve projected review scope and authored requirement semantics when canonically appending proof receipts
    role: normative
    status: modeled
    span:
      start: 0
      end: 118
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-067190C4260E103B
    claim_text: Kibi must resolve legacy staged impact advisories after a complete valid review while retaining unrelated ownership and incomplete analysis diagnostics
    role: normative
    status: modeled
    span:
      start: 120
      end: 271
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-584C3309E83833D8
    claim_text: Kibi must preserve existing project behavior until impact policy is explicitly enabled
    role: normative
    status: modeled
    span:
      start: 273
      end: 359
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-330896475CDE15F7
  - CLAIM-067190C4260E103B
  - CLAIM-584C3309E83833D8
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T08:01:34.446Z'
tags:
  - multilingual
  - impact-policy
  - stage-e
  - proof-receipts
firmness: firm
id: REQ-kibi-impact-receipts-advisories-opt-in
type: req
---
Kibi must preserve projected review scope and authored requirement semantics when canonically appending proof receipts. Kibi must resolve legacy staged impact advisories after a complete valid review while retaining unrelated ownership and incomplete analysis diagnostics. Kibi must preserve existing project behavior until impact policy is explicitly enabled.

## Context

Appending a proof receipt or resolving an old advisory must not change what was reviewed, and projects that never adopted impact policy keep working exactly as before.

Impact review is how a change proves it considered every affected requirement, so evidence that drifts from the reviewed bytes, a gate that trusts the candidate, or a policy that switches itself on would each let unreviewed changes through.

## Why this changed

Split from REQ-impact-policy-stage-e-content-bound-review, which held three behaviors: review evidence bound to exact content, the trusted aggregate pull request gate, and receipt, advisory and opt-in handling around them. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
