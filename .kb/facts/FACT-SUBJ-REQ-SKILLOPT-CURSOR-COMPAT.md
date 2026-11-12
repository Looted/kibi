---
title: SkillOpt cursor compatibility lane gates evaluation before spend
status: active
tags:
  - strict-lane
fact_kind: subject
subject_key: kibi.skillopt.cursor_lane
canonical_key: req.req_skillopt_cursor_compat
id: FACT-SUBJ-REQ-SKILLOPT-CURSOR-COMPAT
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

The SkillOpt lane that qualifies the Cursor host before any paid evaluation cells are spent, failing closed with a usage error on invalid arguments or gates. It is a pre-spend gate, not the evaluation itself.
