---
title: A KB dependency read answered from, or written into, the project's own KB
status: active
fact_kind: predicate
predicate_name: kb_dependency_policy
predicate_args:
  - kb_dependency_read
  - answer_source
  - dependency_read_only_store_separate_from_project_kb
canonical_key: kb_dependency_policy(kb_dependency_read,answer_source,dependency_read_only_store_separate_from_project_kb)
polarity: deny
origin:
  kind: agent
  recorded_at: '2026-11-04T10:41:14.758Z'
id: FACT-NEG-kb-dependencies-own-store
type: fact
---
A KB dependency read answered from, or written into, the project's own KB. The failure-side scenario of REQ-kb-dependencies-git assumes this state and expects Kibi to refuse it with a coded error instead of answering.