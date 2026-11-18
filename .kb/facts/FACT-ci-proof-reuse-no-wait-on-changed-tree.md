---
title: The proof reuse check runs the full proof at once when the committed snapshots differ
status: active
fact_kind: property_value
subject_key: kibi.ci.proof_reuse_wait
property_key: runs_full_proof_at_once_when_committed_snapshots_differ
operator: eq
value_type: bool
value_bool: true
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
origin:
  kind: agent
  recorded_at: '2026-11-17T10:50:59.217Z'
claim_key: CLAIM-4C25FFFAE75B032A
claim_text: The CI proof reuse check runs the full proof without waiting for develop's proof when the committed files of the merge and of the proven commit have different snapshots
id: FACT-ci-proof-reuse-no-wait-on-changed-tree
type: fact
---
True when the reuse check, before waiting on develop's proof run, compares the canonical snapshots of the merge's and the proven commit's committed files and starts the full proof at once when they differ.