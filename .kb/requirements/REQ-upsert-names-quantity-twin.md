---
title: kb_upsert names the value fact that states the same quantity
status: open
priority: must
required_evidence: tested
firmness: default
tags:
  - check
  - quantity-duplicate
semantic_text: kb_upsert must name each existing value fact that states the same quantity as the value fact it writes.
rationale: The write is when an agent creates the second key. A check finding later makes someone else untangle it; a warning on the write lets the agent reuse the existing key or say why the two differ while the reason is in front of it.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, approving the statements for the stale and split facts plan: "Approve all"'
  approved_by: maintainer
  recorded_at: '2026-11-16T16:10:21.785Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 734670e9cd78ce2d0abbf5bbab261df165be7178c5334dbb8a71d88136ae2b82
semantic_inventory:
  - claim_key: CLAIM-74F1CBCBDD1B6E18
    claim_text: kb_upsert must name each existing value fact that states the same quantity as the value fact it writes
    role: normative
    status: modeled
    span:
      start: 0
      end: 102
logic_claims:
  - CLAIM-74F1CBCBDD1B6E18
id: REQ-upsert-names-quantity-twin
type: req
---
kb_upsert must name each existing value fact that states the same quantity as the value fact it writes.

## Context

The write is when an agent creates the second key. A check finding later makes someone else untangle it; a warning on the write lets the agent reuse the existing key or say why the two differ while the reason is in front of it.

## Source

> Maintainer decision, 2026-11-16, approving the statements for the stale and split facts plan: "Approve all"