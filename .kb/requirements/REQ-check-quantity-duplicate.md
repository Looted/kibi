---
title: Kibi check reports one quantity stated under two keys
status: open
priority: must
required_evidence: tested
firmness: default
tags:
  - check
  - quantity-duplicate
semantic_text: Kibi check must report two active value facts of current requirements that state one quantity under different subject or property keys.
rationale: In the benchmark one limit was recorded twice, under two keys by two requirements, and a change updated one of them; the other kept the old number and no rule compared them, because every rule that compares values reads one key at a time.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, approving the statements for the stale and split facts plan: "Approve all"'
  approved_by: maintainer
  recorded_at: '2026-11-16T16:10:10.496Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 91e731299fadba275cbaf9775f15c6136c0f93dce67e32ec863736c6cc098028
semantic_inventory:
  - claim_key: CLAIM-3BFD956863B01302
    claim_text: Kibi check must report two active value facts of current requirements that state one quantity under different subject or property keys
    role: normative
    status: modeled
    span:
      start: 0
      end: 134
logic_claims:
  - CLAIM-3BFD956863B01302
id: REQ-check-quantity-duplicate
type: req
---
Kibi check must report two active value facts of current requirements that state one quantity under different subject or property keys.

## Context

In the benchmark one limit was recorded twice, under two keys by two requirements, and a change updated one of them; the other kept the old number and no rule compared them, because every rule that compares values reads one key at a time.

## Source

> Maintainer decision, 2026-11-16, approving the statements for the stale and split facts plan: "Approve all"