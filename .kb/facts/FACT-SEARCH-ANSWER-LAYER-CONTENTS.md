---
title: kb_search returns a kibi.search-answer.v1 answer layer by default within a byte ceiling
status: active
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.discovery.search
  - default_answer_layer
  - governing_requirements_facts_adrs_scenarios_tests_superseded_observations_within_byte_ceiling
canonical_key: logical_requirement_rule(kibi.discovery.search,default_answer_layer,governing_requirements_facts_adrs_scenarios_tests_superseded_observations_within_byte_ceiling)
polarity: assert
claim_key: CLAIM-6CC80BDBD9B7AAC2
claim_text: By default kb_search must return a kibi.search-answer.v1 answer layer listing the current governing requirements, their linked facts, rationale ADRs, verifying scenarios and tests, superseded non-governing entries, and observation notes within a byte ceiling
text_ref: .kb/requirements/REQ-kibi-search-answer-layer.md
tags:
  - lane:ontology
  - search
id: FACT-SEARCH-ANSWER-LAYER-CONTENTS
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
