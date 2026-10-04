---
title: A gold-set metric below its committed threshold fails the gate
status: active
tags:
  - lane:ontology
  - evaluation
  - search
  - ci
claim_key: CLAIM-97BBCE082A5947F0
claim_text: The repository search gate must fail when recall at three, the superseded-result rate, abstention precision, abstention recall, or warm p50 or p95 latency misses its committed threshold
text_ref: .kb/requirements/REQ-kibi-search-gold-set-gate.md
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.discovery.search
  - gold_set_metric_misses_threshold
  - repository_search_gate_fails
polarity: assert
canonical_key: logical_requirement_rule(kibi.discovery.search,gold_set_metric_misses_threshold,repository_search_gate_fails)
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-04T02:40:15.967Z'
id: FACT-PRED-search-gold-set-thresholds
type: fact
---
