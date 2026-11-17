---
title: Commit review guidance that forbids opening any .kb file
status: active
fact_kind: property_value
subject_key: kibi.skills.bundled
property_key: commit_review_forbids_hand_edits_and_expects_staging
operator: eq
value_type: bool
value_bool: false
origin:
  kind: agent
  recorded_at: '2026-11-16T16:00:00.000Z'
tags:
  - skills
id: FACT-kibi-commit-review-guidance-never-open
type: fact
---
Scenario input: commit review guidance that tells the agent never to open any file under .kb while the same skill asks it to stage .kb with git add.