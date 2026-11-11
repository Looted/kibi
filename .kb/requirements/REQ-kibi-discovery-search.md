---
title: Free-text search through kb_search and kibi search, beside an exact kb_query
status: open
semantic_text: The discovery surface must offer free-text discovery with kb_search and kibi search. kb_query must remain exact and deterministic and must not be turned into fuzzy search.
semantic_clauses:
  - The discovery surface must offer free-text discovery with kb_search and kibi search.
  - kb_query must remain exact and deterministic and must not be turned into fuzzy search.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: e1e721fa0db725280a53988c3824251591578b7546fffec1ccc17404ae9bc55a
semantic_inventory:
  - claim_key: CLAIM-72D8537F4A41017D
    claim_text: The discovery surface must offer free-text discovery with kb_search and kibi search
    role: normative
    status: modeled
    span:
      start: 0
      end: 83
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-C366C52CD08BBDBC
    claim_text: kb_query must remain exact and deterministic and must not be turned into fuzzy search
    role: normative
    status: modeled
    span:
      start: 85
      end: 170
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-72D8537F4A41017D
  - CLAIM-C366C52CD08BBDBC
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 3): "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-05T06:39:36.139Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - mcp
  - cli
  - discovery
  - search
id: REQ-kibi-discovery-search
type: req
---
The discovery surface must offer free-text discovery with kb_search and kibi search. kb_query must remain exact and deterministic and must not be turned into fuzzy search.

## Context

Search ranks entities by intent and abstains when nothing matches, while kb_query stays an exact lookup.



## Why this changed

Split from REQ-mcp-search-discovery, which held two behaviors: free-text search beside exact query, and the read-only inspection tools. Each child is one of them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 3): "Ok"
