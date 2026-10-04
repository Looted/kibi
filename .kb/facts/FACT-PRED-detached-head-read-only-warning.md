---
title: Snapshot results carry a detached_head_read_only warning
status: active
tags:
  - lane:ontology
  - branching
  - detached-head
  - diagnostics
claim_key: CLAIM-C9AE01EB382F2593
claim_text: Every result served from the detached HEAD snapshot store must carry a detached_head_read_only warning naming the commit, the branches at HEAD, and the store path
text_ref: .kb/requirements/REQ-branch-store-recovery-v4.md
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.branch.detached_head
  - result_from_snapshot_store
  - detached_head_read_only_warning
polarity: assert
canonical_key: logical_requirement_rule(kibi.branch.detached_head,result_from_snapshot_store,detached_head_read_only_warning)
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-04T02:17:57.903Z'
id: FACT-PRED-detached-head-read-only-warning
type: fact
---
