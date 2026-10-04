---
title: Detached HEAD reads attach a read-only snapshot of the tracked sources
status: active
tags:
  - lane:ontology
  - branching
  - detached-head
  - read-only
claim_key: CLAIM-B615857DD8297373
claim_text: Read-only operations on a detached HEAD with zero or several local branches at HEAD must attach a read-only snapshot store compiled from the checkout's tracked sources
text_ref: .kb/requirements/REQ-branch-store-recovery-v4.md
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.branch.detached_head
  - read_with_zero_or_several_branches_at_head
  - attach_read_only_tracked_source_snapshot
polarity: assert
canonical_key: logical_requirement_rule(kibi.branch.detached_head,read_with_zero_or_several_branches_at_head,attach_read_only_tracked_source_snapshot)
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-04T02:17:55.491Z'
id: FACT-PRED-detached-head-snapshot-reads
type: fact
---
