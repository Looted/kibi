---
title: The kibi deps lock command pins a declared ref to a commit and KB schema
status: active
tags:
  - lane:ontology
  - predicate:dependencies
fact_kind: predicate
predicate_name: kb_dependency_policy
predicate_args:
  - kibi_deps_lock
  - declared_git_ref
  - record_commit_and_kb_schema
canonical_key: kb_dependency_policy(kibi_deps_lock,declared_git_ref,record_commit_and_kb_schema)
polarity: assert
claim_key: CLAIM-2DE614DF1343B592
claim_text: The kibi deps lock command must resolve a declared git ref to a commit and record that commit with the dependency's KB schema
text_ref: .kb/requirements/REQ-kb-dependencies-git.md
origin:
  kind: agent
  recorded_at: '2026-11-04T10:41:17.847Z'
id: FACT-PRED-kb-dependencies-lock-command
type: fact
---
The kibi deps lock command pins each ref to a commit and KB schema. This predicate grounds the claim of REQ-kb-dependencies-git quoted in claim_text, so the requirement's semantic inventory counts it as modeled.