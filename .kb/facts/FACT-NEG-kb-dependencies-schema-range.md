---
title: A KB dependency on a KB schema older than 6 or newer than the running Kibi reads
status: active
fact_kind: predicate
predicate_name: kb_dependency_policy
predicate_args:
  - kb_dependency_read
  - kb_schema
  - refuse_outside_6_to_current
canonical_key: kb_dependency_policy(kb_dependency_read,kb_schema,refuse_outside_6_to_current)
polarity: deny
origin:
  kind: agent
  recorded_at: '2026-11-04T10:41:16.875Z'
id: FACT-NEG-kb-dependencies-schema-range
type: fact
---
A KB dependency on a KB schema older than 6 or newer than the running Kibi reads. The failure-side scenario of REQ-kb-dependencies-git assumes this state and expects Kibi to refuse it with a coded error instead of answering.