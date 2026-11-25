---
title: kibi.search-hints.v1 results
status: open
priority: should
required_evidence: tested
firmness: default
tags:
  - search
  - retrieval
semantic_text: A kibi.search-hints.v1 result must name only entity ids the host supplied, each at most once. A kibi.search-hints.v1 result must hold at most the requested limit of hints and never more than 50000. Each search hint score must lie between 0 and 1, and hints must be ordered by score descending with ties ordered by id. Project configuration validation must reject augment mode for the kibi.search-hints.v1 capability.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-25, on the question "Approve the six search requirement changes as worded?", after the offline replay of the retrieval rethink: "Approve all six"'
  approved_by: maintainer
  recorded_at: '2026-11-25T19:29:27.384Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 7a940c30443129c757a36dfc12012f4869b46bcac458b700545e077eb00a6182
semantic_inventory:
  - claim_key: CLAIM-3E5D051097B01431
    claim_text: A kibi.search-hints.v1 result must name only entity ids the host supplied, each at most once
    role: normative
    status: modeled
    span:
      start: 0
      end: 92
  - claim_key: CLAIM-90BCF67C464507F3
    claim_text: A kibi.search-hints.v1 result must hold at most the requested limit of hints and never more than 50000
    role: normative
    status: modeled
    span:
      start: 94
      end: 196
  - claim_key: CLAIM-DC38E7945CDB1FC1
    claim_text: Each search hint score must lie between 0 and 1
    role: normative
    status: modeled
    span:
      start: 198
      end: 245
  - claim_key: CLAIM-308CEAF68BC374D8
    claim_text: hints must be ordered by score descending with ties ordered by id
    role: normative
    status: modeled
    span:
      start: 251
      end: 316
  - claim_key: CLAIM-33C412296BA0748D
    claim_text: Project configuration validation must reject augment mode for the kibi.search-hints.v1 capability
    role: normative
    status: modeled
    span:
      start: 318
      end: 415
logic_claims:
  - CLAIM-3E5D051097B01431
  - CLAIM-90BCF67C464507F3
  - CLAIM-DC38E7945CDB1FC1
  - CLAIM-308CEAF68BC374D8
  - CLAIM-33C412296BA0748D
id: REQ-capability-search-hints-v1-scores
type: req
---
A kibi.search-hints.v1 result must name only entity ids the host supplied, each at most once. A kibi.search-hints.v1 result must hold at most the requested limit of hints and never more than 50000. Each search hint score must lie between 0 and 1, and hints must be ordered by score descending with ties ordered by id. Project configuration validation must reject augment mode for the kibi.search-hints.v1 capability.

## Why this changed

kb_search now asks the provider to score every decision and every entity a decision links, about 4,800 on Kibi's own knowledge base, so a result capped at 20 hints could not carry the meaning ranking that REQ-search-meaning-fusion fuses on every search.

## Context

This replaces REQ-capability-search-hints-v1, whose cap was 20 hints. The cap is the limit REQ-search-meaning-limits records for one request.

## Source

> Maintainer decision, 2026-11-25, on the question "Approve the six search requirement changes as worded?", after the offline replay of the retrieval rethink: "Approve all six"
