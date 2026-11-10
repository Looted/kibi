---
title: Kibi answers a KB dependency read from the dependency's own read-only store
status: active
tags:
  - lane:ontology
  - predicate:dependencies
fact_kind: predicate
predicate_name: kb_dependency_policy
predicate_args:
  - kb_dependency_read
  - answer_source
  - dependency_read_only_store_separate_from_project_kb
canonical_key: kb_dependency_policy(kb_dependency_read,answer_source,dependency_read_only_store_separate_from_project_kb)
polarity: assert
claim_key: CLAIM-7B6800923B7B00A8
claim_text: Kibi must answer a read scoped to a KB dependency from that dependency's own read-only branch store, never from or into the project's KB
text_ref: .kb/requirements/REQ-kb-dependency-read-scope.md
origin:
  kind: agent
  recorded_at: '2026-11-04T10:41:13.774Z'
id: FACT-PRED-kb-dependencies-own-store
type: fact
---
Kibi answers a KB dependency read from the dependency's own read-only store. This predicate grounds the claim of REQ-kb-dependencies-git quoted in claim_text, so the requirement's semantic inventory counts it as modeled.