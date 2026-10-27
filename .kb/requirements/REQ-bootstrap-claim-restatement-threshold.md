---
title: The bootstrap close restatement threshold is a Jaccard similarity of 0.8
status: open
semantic_text: The close restatement threshold must be a token-set Jaccard similarity of 0.8.
semantic_source_field: semantic_text
semantic_clauses:
  - The close restatement threshold must be a token-set Jaccard similarity of 0.8.
priority: must
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_hash: 9edd4b53e81c7cd568d4034624504f0a227b9fe575032efba2b01ec3a7d79347
semantic_inventory:
  - claim_key: CLAIM-D75EA03CE26FF1F2
    claim_text: The close restatement threshold must be a token-set Jaccard similarity of 0.8
    role: normative
    status: modeled
    span:
      start: 0
      end: 77
logic_claims:
  - CLAIM-D75EA03CE26FF1F2
origin:
  kind: agent
  recorded_at: '2026-10-27T08:05:58.880Z'
id: REQ-bootstrap-claim-restatement-threshold
type: req
---
The close restatement threshold must be a token-set Jaccard similarity of 0.8.

## Context

The bootstrap planner keeps a declared intent claim that closely restates a current requirement and names that requirement (REQ-bootstrap-claim-restatement). How close is close is the exported NEAR_RESTATEMENT_JACCARD constant, so the claim is proved against the value the code holds.
