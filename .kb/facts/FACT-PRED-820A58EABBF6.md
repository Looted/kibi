---
title: 'Predicate: provider_allowed_operation(external_semantic_classifier,kb_compile_intent,allow)'
status: active
text_ref: .kb/requirements/REQ-capability-plugin-observable-behavior-v1.md
tags:
  - lane:ontology
  - predicate-suggestion
  - predicate:ontology
  - predicate:plugins
  - predicate:operation
fact_kind: predicate
predicate_name: provider_allowed_operation
predicate_args:
  - external_semantic_classifier
  - kb_compile_intent
  - allow
canonical_key: provider_allowed_operation(external_semantic_classifier,kb_compile_intent,allow)
polarity: assert
id: FACT-PRED-820A58EABBF6
type: fact
predicate_namespace: kibi.capability
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
The kb_compile_intent half of the classifier allowlist in REQ-capability-plugin-observable-behavior-v1. The requirement states both operations in one claim, which FACT-PRED-C842EDCDDC65 grounds; this fact records the second allowed operation beside it.
