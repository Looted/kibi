---
title: The staged check treats a staged source edit as behavior-changing only when its diff changes meaningful source
status: open
semantic_text: The staged check must treat a staged source edit as behavior-changing only when its diff changes meaningful source.
semantic_clauses:
  - The staged check must treat a staged source edit as behavior-changing only when its diff changes meaningful source
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: a8d03709b4181118447a594ad389846d3bf27e46249b3fdc8f7776977596b807
semantic_inventory:
  - claim_key: CLAIM-EEF0402F966AE161
    claim_text: The staged check must treat a staged source edit as behavior-changing only when its diff changes meaningful source
    role: normative
    status: modeled
    span:
      start: 0
      end: 114
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-EEF0402F966AE161
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-10, approving the reworded children in the KB gold-standard review (batch 5 rewordings): "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T14:32:37.524Z'
firmness: firm
required_evidence: tested
priority: must
tags:
  - staged-check
  - impact
id: REQ-kibi-behavior-edit-detection
type: req
---
The staged check must treat a staged source edit as behavior-changing only when its diff changes meaningful source.

## Context

Comment, whitespace and formatting-only diffs do not change what the code does, so they must not demand impact evidence; any diff that touches meaningful source does.

Carved out of REQ-cli-staged-impact-enforcement, which keeps the block itself; each child names one decision the staged gate and the impact check make around it.

## Source

> Maintainer decision, 2026-11-10, approving the reworded children in the KB gold-standard review (batch 5 rewordings): "Ok"
