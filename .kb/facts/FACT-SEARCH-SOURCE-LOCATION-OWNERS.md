---
title: A source-located symbol's requirements match without lexical overlap
status: active
tags:
  - lane:ontology
  - search
  - search-lane
text_ref: .kb/requirements/REQ-search-answer-hygiene.md
fact_kind: predicate
polarity: assert
canonical_key: logical_requirement_rule(kibi.discovery.search,requirement_implemented_by_source_located_symbol,matched_without_lexical_overlap)
claim_key: CLAIM-D962F4C31CEDC2AA
claim_text: A kb_search with source locations must match the requirements that a located symbol implements even without lexical overlap
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.discovery.search
  - requirement_implemented_by_source_located_symbol
  - matched_without_lexical_overlap
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-11T19:53:21.163Z'
id: FACT-SEARCH-SOURCE-LOCATION-OWNERS
type: fact
---
When kb_search carries `sourceLocations`, a requirement that a located symbol `implements` inherits that symbol's source evidence (a `sourceMatches` row naming the symbol with `distance: 3` and the reason `implemented at the source location`), so the file's own requirements clear the acceptance threshold even when the question shares no word with them.

## Context

Search-lane round 1 on the test project (probe 1): a coder asking which requirement governs a helper, with the file's source location, never saw the requirement the file's symbols implement because source locations only re-weighted entities that already passed lexical gating. Asked by the project owner through the search-lane fix PRs (fix 5).