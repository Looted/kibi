---
title: A train merges without its checks passing on the head it assembled
status: active
fact_kind: property_value
subject_key: kibi.ci.merge_train
property_key: trains_merged_without_passing_checks_on_assembled_head
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T11:39:58.594Z'
id: FACT-NEG-ci-merge-train-lands-assembled-head-VIOLATED
type: fact
---
A train merges after its branch moved, after develop moved, or before its required checks passed, so develop gets a tree no check ran on.