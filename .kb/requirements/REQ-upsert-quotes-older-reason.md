---
title: kb_upsert quotes the recorded reason when a grounded value changes
status: open
priority: must
required_evidence: tested
firmness: default
tags:
  - upsert
  - rationale
semantic_text: kb_upsert must quote the recorded reason when a write changes a grounded value and leaves the reason unchanged.
rationale: In the benchmark a limit changed from 9 to 10 while the requirement's recorded reason still described 9. A reason written for the old value reads as current unless someone asks whether it still holds, and the write that changes the value is where to ask.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, approving the statements for the stale and split facts plan: "Approve all"'
  approved_by: maintainer
  recorded_at: '2026-11-16T14:58:19.363Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 1ac8eaff6747ebf9babfb7530a844e04c73e63c5aab09350e382f54975286917
semantic_inventory:
  - claim_key: CLAIM-D0DB8015DCC18F0D
    claim_text: kb_upsert must quote the recorded reason when a write changes a grounded value and leaves the reason unchanged
    role: normative
    status: modeled
    span:
      start: 0
      end: 110
logic_claims:
  - CLAIM-D0DB8015DCC18F0D
id: REQ-upsert-quotes-older-reason
type: req
---
kb_upsert must quote the recorded reason when a write changes a grounded value and leaves the reason unchanged.

## Context

In the benchmark a limit changed from 9 to 10 while the requirement's recorded reason still described 9. A reason written for the old value reads as current unless someone asks whether it still holds, and the write that changes the value is where to ask.

## Source

> Maintainer decision, 2026-11-16, approving the statements for the stale and split facts plan: "Approve all"