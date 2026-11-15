---
title: Entity context in the pre-commit staged check
status: active
fact_kind: subject
subject_key: kibi.staged_check.entity_context
tags:
  - strict-lane
origin:
  kind: agent
  recorded_at: '2026-10-16T08:50:39.038Z'
id: FACT-SUBJ-kibi-staged-entity-context
type: fact
---

The pre-commit staged check's rule that an entity document the commit adds or edits must have the body context kibi check requires, while entities that already lacked it at the base commit or that a migration acknowledged are not blocked. It is the staged form, not the full check rule.
