---
title: Detached HEAD writes and sync are refused with the branch fix
status: active
tags:
  - lane:ontology
  - branching
  - detached-head
  - read-only
claim_key: CLAIM-1D06495FE053404E
claim_text: Write operations and kibi sync on a detached HEAD with zero or several local branches at HEAD must be refused with a message naming git switch or KIBI_BRANCH
text_ref: .kb/requirements/REQ-branch-store-recovery-v4.md
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.branch.detached_head
  - write_or_sync_with_zero_or_several_branches_at_head
  - refused_with_branch_fix
polarity: assert
canonical_key: logical_requirement_rule(kibi.branch.detached_head,write_or_sync_with_zero_or_several_branches_at_head,refused_with_branch_fix)
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-04T02:18:00.264Z'
id: FACT-PRED-detached-head-writes-refused
type: fact
---
