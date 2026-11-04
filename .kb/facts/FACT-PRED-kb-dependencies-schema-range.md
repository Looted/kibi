---
title: Kibi refuses a KB dependency outside the supported KB schema range
status: active
tags:
  - lane:ontology
  - predicate:dependencies
fact_kind: predicate
predicate_name: kb_dependency_policy
predicate_args:
  - kb_dependency_read
  - kb_schema
  - refuse_outside_6_to_current
canonical_key: kb_dependency_policy(kb_dependency_read,kb_schema,refuse_outside_6_to_current)
polarity: assert
claim_key: CLAIM-21AC1757CBF6480F
claim_text: Kibi must refuse a KB dependency whose KB schema is older than 6 or newer than the running Kibi supports
text_ref: .kb/requirements/REQ-kb-dependencies-git.md
origin:
  kind: agent
  recorded_at: '2026-11-04T10:41:15.789Z'
id: FACT-PRED-kb-dependencies-schema-range
type: fact
---
Kibi refuses a KB dependency outside the supported KB schema range. This predicate grounds the claim of REQ-kb-dependencies-git quoted in claim_text, so the requirement's semantic inventory counts it as modeled.