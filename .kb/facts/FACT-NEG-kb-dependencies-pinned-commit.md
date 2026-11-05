---
title: A KB dependency read at a commit other than the one its lock file pins
status: active
fact_kind: predicate
predicate_name: kb_dependency_policy
predicate_args:
  - kb_dependency_read
  - declared_dependency
  - pinned_lock_commit_only
canonical_key: kb_dependency_policy(kb_dependency_read,declared_dependency,pinned_lock_commit_only)
polarity: deny
origin:
  kind: agent
  recorded_at: '2026-11-04T10:41:12.870Z'
id: FACT-NEG-kb-dependencies-pinned-commit
type: fact
---
A KB dependency read at a commit other than the one its lock file pins. The failure-side scenario of REQ-kb-dependencies-git assumes this state and expects Kibi to refuse it with a coded error instead of answering.