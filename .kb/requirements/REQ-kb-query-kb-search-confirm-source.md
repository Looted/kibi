---
title: kb_query and kb_search confirm source freshness and surface branch_store_stale warnings
status: open
firmness: default
origin:
  kind: agent
  ref: 'Maintainer reply (2026-11-23) approving the 4 new requirements in the Kibi signoff view for GitHub issue #829 (.2, .3, .7): "Approve all"'
  approved_by: maintainer
  recorded_at: '2026-11-23T11:17:01Z'
rationale: 'Inferred from issue #829.2: a stale compiled knowledge base previously gave no warning on reads, so uncompiled edits or deleted relationship shards could be misread as nothing governing the code.'
semantic_text: kb_query and kb_search must confirm source freshness against cached hashes and surface a branch_store_stale warning when compiled branch store sources or relationship shards have drifted.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ebba9ba9fca5ae573f18994648a1801150caf6d9c1976c58d7d3d08a15dfbf84
semantic_inventory:
  - claim_key: CLAIM-84CEC03F0209BF8E
    claim_text: kb_query and kb_search must confirm source freshness against cached hashes and surface a branch_store_stale warning when compiled branch store sources or relationship shards have drifted
    role: normative
    status: modeled
    span:
      start: 0
      end: 186
logic_claims:
  - CLAIM-84CEC03F0209BF8E
id: REQ-kb-query-kb-search-confirm-source
type: req
priority: should
tags:
  - cli
  - discovery
  - freshness
required_evidence: tested
semantic_clauses:
  - kb_query and kb_search must confirm source freshness against cached hashes and surface a branch_store_stale warning when compiled branch store sources or relationship shards have drifted.
---
kb_query and kb_search must confirm source freshness against cached hashes and surface a branch_store_stale warning when compiled branch store sources or relationship shards have drifted.

## Context

Inferred from issue #829.2: a stale compiled knowledge base previously gave no warning on reads, so uncompiled edits or deleted relationship shards could be misread as nothing governing the code.
