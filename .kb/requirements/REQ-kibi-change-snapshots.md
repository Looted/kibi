---
title: Kibi captures staged changes as one index tree and revision diffs between explicit base and head
status: open
semantic_text: Kibi must capture the staged change as one immutable tree from the Git index, and a revision diff between explicit base and head revisions, inventorying only Git objects.
semantic_clauses:
  - Kibi must capture the staged change as one immutable tree from the Git index, and a revision diff between explicit base and head revisions, inventorying only Git objects
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 1dd9315945f6416b4333b520da1dbe3970cf2ac501f7dc3c538b97ffad5cb6a9
semantic_inventory:
  - claim_key: CLAIM-38C86C3A0461AE86
    claim_text: Kibi must capture the staged change as one immutable tree from the Git index, and a revision diff between explicit base and head revisions, inventorying only Git objects
    role: normative
    status: modeled
    span:
      start: 0
      end: 169
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-38C86C3A0461AE86
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the new-sentence children of the single-surface requirements in the KB gold-standard review (split batch 5): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T10:47:09.301Z'
firmness: firm
required_evidence: tested
priority: must
tags:
  - source-analysis
  - staged-check
  - git
id: REQ-kibi-change-snapshots
type: req
---
Kibi must capture the staged change as one immutable tree from the Git index, and a revision diff between explicit base and head revisions, inventorying only Git objects.

## Context

The staged snapshot writes one tree from the index and reads blobs by object id, so an unstaged working-tree edit never enters the analysis and an index change made during analysis is detected; the revision diff resolves the caller's base and head once and never picks a merge base on its own. Source configuration is read from the same captured trees.

Carved out of REQ-source-analysis-v2, which keeps the source analysis v2 result contract (completeness status, UTF-16 ranges, authored identity); each child names one decision the staged and diff analysis makes around it.

## Source

> Maintainer decision, 2026-11-05, approving the new-sentence children of the single-surface requirements in the KB gold-standard review (split batch 5): "ok"
