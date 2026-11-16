---
title: Kibi check reports a distinct_from entry that names no value fact
status: open
priority: must
required_evidence: tested
firmness: default
tags:
  - check
  - quantity-duplicate
semantic_text: Kibi check must report a distinct_from entry on a value fact that names no active value fact.
rationale: A distinct_from entry exempts a pair forever. When the key it names is renamed or retired the entry silently exempts nothing, and a later fact under a new name is never compared, so the stale entry has to show up.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, approving the statements for the stale and split facts plan: "Approve all"'
  approved_by: maintainer
  recorded_at: '2026-11-16T16:10:19.459Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 928366953e4d916f4e2243f304a27722f3de0165b8031cc7a78ab1c2947ddfdf
semantic_inventory:
  - claim_key: CLAIM-EAAFDB2C954FA1D7
    claim_text: Kibi check must report a distinct_from entry on a value fact that names no active value fact
    role: normative
    status: modeled
    span:
      start: 0
      end: 92
logic_claims:
  - CLAIM-EAAFDB2C954FA1D7
id: REQ-check-quantity-duplicate-dangling-distinct
type: req
---
Kibi check must report a distinct_from entry on a value fact that names no active value fact.

## Context

A distinct_from entry exempts a pair forever. When the key it names is renamed or retired the entry silently exempts nothing, and a later fact under a new name is never compared, so the stale entry has to show up.

## Source

> Maintainer decision, 2026-11-16, approving the statements for the stale and split facts plan: "Approve all"