---
title: The impact check lists the entities linked to each changed symbol and gives each blocking impact diagnostic a suggestion that clears it
status: open
semantic_text: The impact check must list the entities linked to each changed symbol, and give each blocking impact diagnostic a suggestion that clears it.
semantic_clauses:
  - The impact check must list the entities linked to each changed symbol, and give each blocking impact diagnostic a suggestion that clears it
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 1e680d241efda0bec58c3490da18cdbd11aa54f2335203bc483cd6159d75741a
semantic_inventory:
  - claim_key: CLAIM-2540F9D53E08E8D6
    claim_text: The impact check must list the entities linked to each changed symbol, and give each blocking impact diagnostic a suggestion that clears it
    role: normative
    status: modeled
    span:
      start: 0
      end: 139
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-2540F9D53E08E8D6
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-10, approving the reworded children in the KB gold-standard review (batch 5 rewordings): "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T14:32:54.009Z'
firmness: firm
required_evidence: tested
priority: must
tags:
  - impact
  - staged-check
id: REQ-kibi-impact-next-actions
type: req
---
The impact check must list the entities linked to each changed symbol, and give each blocking impact diagnostic a suggestion that clears it.

## Context

The impact check is kb_check or kibi check with sourceFiles. An agent that changed code needs to see which requirements and tests own the changed symbols, and a blocking diagnostic without a concrete repair would leave it guessing, so every blocking diagnostic carries the suggestion that clears it.

Carved out of REQ-cli-staged-impact-enforcement, which keeps the block itself; each child names one decision the staged gate and the impact check make around it.

## Source

> Maintainer decision, 2026-11-10, approving the reworded children in the KB gold-standard review (batch 5 rewordings): "Ok"
