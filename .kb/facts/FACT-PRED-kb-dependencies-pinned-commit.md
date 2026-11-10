---
title: Kibi reads a KB dependency only at its pinned commit
status: active
tags:
  - lane:ontology
  - predicate:dependencies
fact_kind: predicate
predicate_name: kb_dependency_policy
predicate_args:
  - kb_dependency_read
  - declared_dependency
  - pinned_lock_commit_only
canonical_key: kb_dependency_policy(kb_dependency_read,declared_dependency,pinned_lock_commit_only)
polarity: assert
claim_key: CLAIM-369DC965CC50460A
claim_text: Kibi must read a KB dependency declared in .kb/dependencies.json only at the commit pinned for it in .kb/dependencies.lock.json
text_ref: .kb/requirements/REQ-kb-dependencies-git.md
origin:
  kind: agent
  recorded_at: '2026-11-04T10:41:11.901Z'
id: FACT-PRED-kb-dependencies-pinned-commit
type: fact
---
Kibi reads a KB dependency only at its pinned commit. This predicate grounds the claim of REQ-kb-dependencies-git quoted in claim_text, so the requirement's semantic inventory counts it as modeled.