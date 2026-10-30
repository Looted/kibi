---
title: No snapshot result lacks a detached_head_read_only warning
status: active
fact_kind: property_value
subject_key: kibi.kb.branch
property_key: snapshot_results_without_detached_head_warning
operator: eq
value_type: int
value_int: 0
canonical_key: kibi.kb.branch:snapshot_results_without_detached_head_warning:eq:0
tags:
  - lane:ontology
  - branching
  - detached-head
  - diagnostics
claim_key: CLAIM-C9AE01EB382F2593
claim_text: Every result served from the detached HEAD snapshot store must carry a detached_head_read_only warning naming the commit, the branches at HEAD, and the store path
text_ref: .kb/requirements/REQ-branch-store-recovery-v4.md
origin:
  kind: agent
  recorded_at: '2026-10-04T02:17:57.903Z'
id: FACT-PRED-detached-head-read-only-warning
type: fact
---
