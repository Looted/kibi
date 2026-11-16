---
title: kb_upsert compares a changed value fact by its previous value
status: open
priority: must
required_evidence: tested
firmness: default
tags:
  - check
  - quantity-duplicate
semantic_text: kb_upsert must compare a changed value fact by the value it held before the write.
rationale: In the benchmark one limit was recorded twice, under two keys by two requirements, and a change updated one of them; the other kept the old number and no rule compared them, because every rule that compares values reads one key at a time. Once the value changes the two facts no longer match, so a comparison by the new value alone misses exactly the twin the change leaves stale.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, approving the statements for the stale and split facts plan: "Approve all"'
  approved_by: maintainer
  recorded_at: '2026-11-16T16:10:24.484Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0c602ec0e2beca1cc7d8514a2fabd6ab6b9712bf7cec10f9b2fcd8c8f592abe6
semantic_inventory:
  - claim_key: CLAIM-6C22696655D4CD14
    claim_text: kb_upsert must compare a changed value fact by the value it held before the write
    role: normative
    status: modeled
    span:
      start: 0
      end: 81
logic_claims:
  - CLAIM-6C22696655D4CD14
id: REQ-upsert-quantity-previous-value
type: req
---
kb_upsert must compare a changed value fact by the value it held before the write.

## Context

In the benchmark one limit was recorded twice, under two keys by two requirements, and a change updated one of them; the other kept the old number and no rule compared them, because every rule that compares values reads one key at a time. Once the value changes the two facts no longer match, so a comparison by the new value alone misses exactly the twin the change leaves stale.

## Source

> Maintainer decision, 2026-11-16, approving the statements for the stale and split facts plan: "Approve all"