---
title: kibi.search-hints.v1 providers return bounded, ordered hints for supplied entities only
status: open
priority: should
tags:
  - plugins
  - search
  - capability
semantic_text: A kibi.search-hints.v1 result must name only entity ids the host supplied, each at most once. A kibi.search-hints.v1 result must hold at most the requested limit of hints and never more than 20. Each search hint score must lie between 0 and 1, and hints must be ordered by score descending with ties ordered by id. Project configuration validation must reject augment mode for the kibi.search-hints.v1 capability.
required_evidence: tested
origin:
  kind: agent
  recorded_at: '2026-10-29T19:17:28.627Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: aa9ff0e280a5945244981d718967e441d94047d5e9a8ee26c959a1d0ce12a353
semantic_inventory:
  - claim_key: CLAIM-3E5D051097B01431
    claim_text: A kibi.search-hints.v1 result must name only entity ids the host supplied, each at most once
    role: normative
    status: modeled
    span:
      start: 0
      end: 92
  - claim_key: CLAIM-E6CCC884C14F7459
    claim_text: A kibi.search-hints.v1 result must hold at most the requested limit of hints and never more than 20
    role: normative
    status: modeled
    span:
      start: 94
      end: 193
  - claim_key: CLAIM-DC38E7945CDB1FC1
    claim_text: Each search hint score must lie between 0 and 1
    role: normative
    status: modeled
    span:
      start: 195
      end: 242
  - claim_key: CLAIM-308CEAF68BC374D8
    claim_text: hints must be ordered by score descending with ties ordered by id
    role: normative
    status: modeled
    span:
      start: 248
      end: 313
  - claim_key: CLAIM-33C412296BA0748D
    claim_text: Project configuration validation must reject augment mode for the kibi.search-hints.v1 capability
    role: normative
    status: modeled
    span:
      start: 315
      end: 412
logic_claims:
  - CLAIM-3E5D051097B01431
  - CLAIM-E6CCC884C14F7459
  - CLAIM-DC38E7945CDB1FC1
  - CLAIM-308CEAF68BC374D8
  - CLAIM-33C412296BA0748D
id: REQ-capability-search-hints-v1
type: req
---
A kibi.search-hints.v1 result must name only entity ids the host supplied, each at most once. A kibi.search-hints.v1 result must hold at most the requested limit of hints and never more than 20. Each search hint score must lie between 0 and 1, and hints must be ordered by score descending with ties ordered by id. Project configuration validation must reject augment mode for the kibi.search-hints.v1 capability.

## Context

kb_search ranks by shared words, so a question worded differently from the KB gets a weak or wrong answer. The maintainer asked whether meaning-based search could be combined with the Prolog approach and preferred it as a plugin, so a project can opt in or out. This capability is the seam: the host sends the current entities and a question, and the provider only names which of them the question may mean. Hints are advisory, so there is nothing for a second provider to add to: augment is rejected and shadow providers are compared only. The result checks keep a provider from naming entities the host did not send or from returning an unbounded list.

## Source

> For Kibi search, is it possible to combine our prolog-based approach with embeddings-like semantic search?

> Also consider building this as a plugin.

> Are there any risks realted to packaging the model in core? Plugin allows to opt-in/opt-out.

Maintainer, project thread on semantic search, 2026-10-29.
