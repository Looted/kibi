---
id: FACT-REQ-PROOF-EVALUATION-SUBJECT
title: Kibi change-to-proof evaluation subject
status: active
created_at: 2026-08-13T00:00:00.000Z
updated_at: 2026-08-13T00:00:00.000Z
tags:
  - lane:strict
  - evaluation
  - dogfood
fact_kind: subject
subject_key: kibi.proof.change_evaluation
canonical_key: kibi
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
distinct_from:
  - kibi.proof.change_plan
---

The deterministic, reviewable fixtures and measurements Kibi ships to judge how well intent search and change-to-proof planning perform, so projects can compare quality over time. It measures the planner; it is not the plan itself (kibi.proof.change_plan).
