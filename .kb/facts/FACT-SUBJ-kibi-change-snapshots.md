---
title: 'Git change snapshot'
status: active
fact_kind: subject
subject_key: kibi.traceability.change_snapshot
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: FACT-SUBJ-kibi-change-snapshots
type: fact
---

How Kibi captures a change for review: staged changes as one Git index tree, and revision diffs between an explicit base and head, reading only Git objects rather than working-tree bytes or a moving index.
