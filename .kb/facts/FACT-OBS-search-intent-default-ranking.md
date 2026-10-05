---
title: 'Ontology gap: kb_search default intent ranking and status demotion'
status: closed
fact_kind: observation
claim_key: CLAIM-8470F42B22C072FA
claim_text: kb_search must default to intent-v1 ranking and demote superseded, deprecated, and rejected entities
claim_span_start: 0
claim_span_end: 100
text_ref: .kb/requirements/REQ-kibi-search-answer-layer.md
tags:
  - lane:observation
  - resolved:schema-extension
id: FACT-OBS-search-intent-default-ranking
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Resolved: the logical_requirement_rule schema now declares the kibi.discovery.search subject, and FACT-SEARCH-DEFAULT-INTENT-RANKING grounds this claim on REQ-kibi-search-answer-layer.
