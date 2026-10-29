---
title: A write is attempted on a detached HEAD with no local branch at HEAD
status: active
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.branch.detached_head
  - write_or_sync_with_zero_or_several_branches_at_head
  - refused_with_branch_fix
polarity: deny
canonical_key: logical_requirement_rule(kibi.branch.detached_head,write_or_sync_with_zero_or_several_branches_at_head,refused_with_branch_fix)
origin:
  kind: agent
  recorded_at: '2026-10-29T21:17:01.127Z'
id: FACT-NEG-branch-store-recovery-v4-DETACHED-WRITE
type: fact
---
