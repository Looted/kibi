---
title: kb_search defaults to intent-v1 ranking and demotes superseded, deprecated and rejected entities
status: active
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.discovery.search
  - default_ranking
  - intent_v1_demotes_superseded_deprecated_rejected
canonical_key: logical_requirement_rule(kibi.discovery.search,default_ranking,intent_v1_demotes_superseded_deprecated_rejected)
polarity: assert
claim_key: CLAIM-8470F42B22C072FA
claim_text: kb_search must default to intent-v1 ranking and demote superseded, deprecated, and rejected entities
text_ref: .kb/requirements/REQ-kibi-search-answer-layer.md
tags:
  - lane:ontology
  - search
id: FACT-SEARCH-DEFAULT-INTENT-RANKING
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
