---
title: A feature branch push re-merges every pull request
status: active
fact_kind: property_value
subject_key: kibi.ci.kb_merge_workflow
property_key: other_branch_pushes_checking_other_pull_requests
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T18:11:41.540Z'
id: FACT-NEG-ci-kb-merge-branch-push-VIOLATED
type: fact
---
Every push to any branch makes the workflow test and merge all open pull requests, so pushes race each other on unrelated branches; or a pushed branch is not checked at all until develop moves.