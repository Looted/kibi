---
title: A search answer lists the matched entities no requirement owns with their rank
status: active
tags:
  - lane:ontology
  - search
  - search-lane
text_ref: .kb/requirements/REQ-search-answer-hygiene.md
fact_kind: predicate
polarity: assert
canonical_key: logical_requirement_rule(kibi.discovery.search,top_match_without_owning_requirement,listed_as_ungoverned_with_rank)
claim_key: CLAIM-ED7E0BF06792779D
claim_text: A kb_search answer must list the matched facts, scenarios, symbols and tests that no requirement owns with their rank and say when the top-ranked match is one of them
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.discovery.search
  - top_match_without_owning_requirement
  - listed_as_ungoverned_with_rank
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-11T19:53:07.579Z'
id: FACT-SEARCH-ANSWER-UNGOVERNED
type: fact
---
The kb_search answer layer lists in `ungoverned` every matched fact, scenario, symbol or test that no requirement owns, with its 1-based rank, and when the top-ranked match is one of them the note says so before describing the governing list, which was reached through lower-ranked matches.

## Context

Search-lane round 1 on the test project (A4, probe 3): a search for a role fact ranked two ungoverned facts first and the answer layer listed requirements owning lower-ranked scenarios as governing, without saying the top hits had none. Asked by the project owner through the search-lane fix PRs (fix 5).