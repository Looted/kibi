---
title: The reuse check waits on a proof it can never reuse
status: active
fact_kind: property_value
subject_key: kibi.ci.proof_reuse_wait
property_key: runs_full_proof_at_once_when_committed_snapshots_differ
operator: eq
value_type: bool
value_bool: false
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T10:51:01.252Z'
id: FACT-NEG-ci-proof-reuse-no-wait-on-changed-tree-VIOLATED
type: fact
---
The reuse check waits for develop's proof run although the merge already changes snapshot files.