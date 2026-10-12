---
title: A tie between the top match and an entity linked to it is not ambiguous
status: active
tags:
  - lane:ontology
  - search
  - search-lane
text_ref: .kb/requirements/REQ-search-answer-hygiene.md
fact_kind: predicate
polarity: assert
canonical_key: logical_requirement_rule(kibi.discovery.search,top_match_tied_with_linked_entity,not_flagged_ambiguous)
claim_key: CLAIM-BE4EA2755349D744
claim_text: The kb_search ambiguity flag must ignore a tie between the top match and an entity linked to it in the traceability graph
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.discovery.search
  - top_match_tied_with_linked_entity
  - not_flagged_ambiguous
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-11T19:53:14.120Z'
id: FACT-SEARCH-AMBIGUITY-LINKED-TIE
type: fact
---
Intent search reports `topRivalMargin`, the margin between the top match and the best match it is not linked to in the traceability graph, and `ambiguous` reads that margin: a requirement tying with its own scenario, facts or tests is one answer, two unlinked matches that close are not.

## Context

Search-lane round 1 on the test project (A5): a requirement and its own facts tied at the top and the search flagged the answer ambiguous although nothing competed with it. Asked by the project owner through the search-lane fix PRs (fix 5).