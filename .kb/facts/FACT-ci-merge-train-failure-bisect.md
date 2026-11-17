---
title: No pull request leaves a train for failed checks unless it failed alone
status: active
fact_kind: property_value
subject_key: kibi.ci.merge_train
property_key: pull_requests_ejected_without_failing_alone
operator: eq
value_type: int
value_int: 0
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
origin:
  kind: agent
  recorded_at: '2026-11-17T11:40:35.963Z'
id: FACT-ci-merge-train-failure-bisect
type: fact
claim_key: CLAIM-2BEAF88E587E0FA0
claim_text: When a train's checks fail, the merge train re-runs the failed jobs once and then proves each half of the train separately, so no pull request is removed without evidence
---
Counts pull requests the merge train ejects for failed required checks other than from a train holding only that pull request that failed twice; zero means a failed train is re-run once and then split in halves, and only a lone pull request that fails again is ejected.