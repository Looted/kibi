---
title: Search answers lift two-hop tests and clause facts and rerank broad rationale ADRs
status: open
priority: should
required_evidence: tested
firmness: default
tags:
  - search
  - retrieval
semantic_text: Search answers must lift two-hop tests and scenario-assumed clause facts and resolve supersession chains to current requirements while keeping current ADRs unlifted and reranking current ADRs on unfiltered broad rationale queries.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-25, on the question "Approve the six search requirement changes as worded?", after the offline replay of the retrieval rethink: "Approve all six". Maintainer decision, 2026-11-25, on the question "Keep a short related-by-meaning list beside the five decision cards?": "Keep up to 7 meaning-based ids" (every search shows 5 cards plus up to 7 ids ranked by embeddings through linked scenarios, tests and facts)'
  approved_by: maintainer
  recorded_at: '2026-11-25T19:29:31.412Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: a82ed5b7c777daef45ee3ac35265ca9b7efe0cbcf98c4d2a2f7ee6e7df70172a
semantic_inventory:
  - claim_key: CLAIM-0BC5FA97F5055830
    claim_text: Search answers must lift two-hop tests and scenario-assumed clause facts and resolve supersession chains to current requirements while keeping current ADRs unlifted and reranking current ADRs on unfiltered broad rationale queries
    role: normative
    status: modeled
    span:
      start: 0
      end: 229
logic_claims:
  - CLAIM-0BC5FA97F5055830
id: REQ-search-answers-lift-two
type: req
---
Search answers must lift two-hop tests and scenario-assumed clause facts and resolve supersession chains to current requirements while keeping current ADRs unlifted and reranking current ADRs on unfiltered broad rationale queries.

## Why this changed

Search hints are now the meaning list of REQ-search-meaning-list, which credits each decision with its linked scenarios, tests and facts and folds supersession chains into cards, so the lifting rule keeps only the search answer it still governs.

## Context

This replaces REQ-search-answers-search-hints-lift-two without its search hints clause. The answer layer of a typed search, and the intent ranking that compile-intent uses, still lift and rerank this way.

## Source

> Maintainer decision, 2026-11-25, on the question "Approve the six search requirement changes as worded?", after the offline replay of the retrieval rethink: "Approve all six". Maintainer decision, 2026-11-25, on the question "Keep a short related-by-meaning list beside the five decision cards?": "Keep up to 7 meaning-based ids" (every search shows 5 cards plus up to 7 ids ranked by embeddings through linked scenarios, tests and facts)
