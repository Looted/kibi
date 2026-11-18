---
title: The merge train admits no pull request that misses a boarding condition
status: active
fact_kind: property_value
subject_key: kibi.ci.merge_train
property_key: pull_requests_admitted_without_label_ready_same_repo_passing_checks
operator: eq
value_type: int
value_int: 0
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
origin:
  kind: agent
  recorded_at: '2026-11-17T11:40:30.824Z'
id: FACT-ci-merge-train-admission
type: fact
claim_key: CLAIM-9AEC523CE3EDC026
claim_text: The merge train admits a pull request only when it carries the train label, is not a draft, comes from this repository, and its required checks passed on its current head
---
Counts pull requests the merge train merges into a train although they lack the train label, are drafts, come from another repository, or have a required check that has not passed on their current head; zero means it admits none.