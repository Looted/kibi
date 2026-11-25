---
title: kb_search lists decisions related by meaning beside its cards
status: open
priority: should
required_evidence: tested
firmness: firm
tags:
  - search
  - retrieval
semantic_text: When an embedding provider answered, the first page of a kb_search decision answer must list the decisions closest in meaning that are neither a card nor folded into one. The kb_search meaning list must be ordered by the mean of each decision's two best meaning scores among its own text, the scenarios, tests and facts it links, and the facts its scenarios assume. The kb_search meaning list must leave out superseded decisions and decisions in another scope.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-25, on the question "Approve the six search requirement changes as worded?", after the offline replay of the retrieval rethink: "Approve all six". Maintainer decision, 2026-11-25, on the question "Keep a short related-by-meaning list beside the five decision cards?": "Keep up to 7 meaning-based ids" (every search shows 5 cards plus up to 7 ids ranked by embeddings through linked scenarios, tests and facts)'
  approved_by: maintainer
  recorded_at: '2026-11-25T19:29:19.674Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c84f4da340c671622019d56635f114aa5dd52e822741bcc061670de03e519fdf
semantic_inventory:
  - claim_key: CLAIM-DC13D5A9BC1A8FFE
    claim_text: When an embedding provider answered, the first page of a kb_search decision answer must list the decisions closest in meaning that are neither a card nor folded into one
    role: condition
    status: modeled
    span:
      start: 0
      end: 169
  - claim_key: CLAIM-6F3E445F17716A4C
    claim_text: The kb_search meaning list must be ordered by the mean of each decision's two best meaning scores among its own text, the scenarios, tests and facts it links, and the facts its scenarios assume
    role: normative
    status: modeled
    span:
      start: 171
      end: 364
  - claim_key: CLAIM-B389B9DC85B93FD9
    claim_text: The kb_search meaning list must leave out superseded decisions and decisions in another scope
    role: normative
    status: modeled
    span:
      start: 366
      end: 459
logic_claims:
  - CLAIM-DC13D5A9BC1A8FFE
  - CLAIM-6F3E445F17716A4C
  - CLAIM-B389B9DC85B93FD9
id: REQ-search-meaning-list
type: req
---
When an embedding provider answered, the first page of a kb_search decision answer must list the decisions closest in meaning that are neither a card nor folded into one. The kb_search meaning list must be ordered by the mean of each decision's two best meaning scores among its own text, the scenarios, tests and facts it links, and the facts its scenarios assume. The kb_search meaning list must leave out superseded decisions and decisions in another scope.

## Why this changed

The users' own words are more often in a decision's scenarios, tests and facts than in its title, so a decision credited with its linked entities' meaning reaches questions the cards miss. In the replay, five cards with this list beside them showed the governing decision for 70% of Kibi's hints gold questions, against 65% with the old hints and 40% with five cards alone.

## Context

This replaces REQ-kibi-search-hints-shown, REQ-kibi-search-hints-summed-order and REQ-search-answers-search-hints-lift-two: hints are now the meaning list, lifted to decisions through their links, and supersession chains are folded into cards as REQ-search-decision-collapse records. A negative-path fact a scenario assumes credits the decision that scenario specifies, as REQ-kibi-negative-path-facts-marked requires.

## Source

> Maintainer decision, 2026-11-25, on the question "Approve the six search requirement changes as worded?", after the offline replay of the retrieval rethink: "Approve all six". Maintainer decision, 2026-11-25, on the question "Keep a short related-by-meaning list beside the five decision cards?": "Keep up to 7 meaning-based ids" (every search shows 5 cards plus up to 7 ids ranked by embeddings through linked scenarios, tests and facts)
