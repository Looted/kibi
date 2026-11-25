---
title: kb_search calls the requirements of a close ranking candidates
status: open
priority: must
firmness: default
required_evidence: tested
tags:
  - kb_search
  - search-answer
origin:
  kind: agent
  ref: 'Maintainer approval of the benchmark-driven capture, lookup and hook fixes, statement 8 of 8: ''Approve all''.'
  approved_by: maintainer
  recorded_at: '2026-11-24T20:00:27.813Z'
rationale: In the crowded-store benchmark kb_search labelled a neighbour and a look-alike as governing while its own analysis said the ranking was ambiguous.
semantic_text: When kb_search's top matches are close, its result must call the requirements it reached candidates not confirmed to govern the change, never governing.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d75fad095ac215678a4401934d5ed5dd82b48d25dfff564b5c7e356e13b0599c
semantic_inventory:
  - claim_key: CLAIM-E155B6F3352AB28F
    claim_text: When kb_search's top matches are close, its result must call the requirements it reached candidates not confirmed to govern the change, never governing
    role: condition
    status: modeled
    span:
      start: 0
      end: 151
    subjects:
      - kibi.discovery.search
logic_claims:
  - CLAIM-E155B6F3352AB28F
id: REQ-kb-search-close-matches-candidates
type: req
---
When kb_search's top matches are close, its result must call the requirements it reached candidates not confirmed to govern the change, never governing.

## Context

In the crowded-store benchmark kb_search labelled a neighbour and a look-alike as governing while its own analysis said the ranking was ambiguous.

## Source

> Maintainer approval of the benchmark-driven capture, lookup and hook fixes, statement 8 of 8: 'Approve all'.
