---
title: A declared git ref that kibi deps lock cannot resolve to a commit
status: active
fact_kind: predicate
predicate_name: kb_dependency_policy
predicate_args:
  - kibi_deps_lock
  - declared_git_ref
  - record_commit_and_kb_schema
canonical_key: kb_dependency_policy(kibi_deps_lock,declared_git_ref,record_commit_and_kb_schema)
polarity: deny
origin:
  kind: agent
  recorded_at: '2026-11-04T10:41:18.808Z'
id: FACT-NEG-kb-dependencies-lock-command
type: fact
---
A declared git ref that kibi deps lock cannot resolve to a commit. The failure-side scenario of REQ-kb-dependencies-git assumes this state and expects Kibi to refuse it with a coded error instead of answering.