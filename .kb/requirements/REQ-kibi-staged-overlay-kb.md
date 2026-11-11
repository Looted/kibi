---
title: The staged check evaluates staged knowledge in a temporary KB overlay without changing the branch store
status: open
semantic_text: The staged check must evaluate staged knowledge in a temporary KB overlay without changing the branch store.
semantic_clauses:
  - The staged check must evaluate staged knowledge in a temporary KB overlay without changing the branch store
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: b2eca05482370a7ad25353b3b474c9bd808bb100077a51a1a0e50860f8f07e70
semantic_inventory:
  - claim_key: CLAIM-36DAE3D3D591F5D9
    claim_text: The staged check must evaluate staged knowledge in a temporary KB overlay without changing the branch store
    role: normative
    status: modeled
    span:
      start: 0
      end: 107
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-36DAE3D3D591F5D9
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the new-sentence children of the single-surface requirements in the KB gold-standard review (split batch 5): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T11:09:10.776Z'
firmness: firm
required_evidence: tested
priority: must
tags:
  - staged-check
  - kb-store
id: REQ-kibi-staged-overlay-kb
type: req
---
The staged check must evaluate staged knowledge in a temporary KB overlay without changing the branch store.

## Context

kibi check --staged copies the branch KB into a temporary directory and projects the staged entities and relationships there, so a commit is judged on exactly what it stages while the branch store under .kb/branches keeps the last synced state until the next sync.

Carved out of REQ-cli-staged-impact-enforcement, which keeps the rule that behavior-changing edits need impact evidence; this child names where the staged check evaluates the staged knowledge.

## Source

> Maintainer decision, 2026-11-05, approving the new-sentence children of the single-surface requirements in the KB gold-standard review (split batch 5): "ok"
