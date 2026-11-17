---
title: kb_apply_plan checks contradictions once for the whole plan
status: active
priority: must
expects: success
tags:
  - upsert
  - sibling-requirements
origin:
  kind: agent
  recorded_at: '2026-11-16T19:16:52.810Z'
id: SCEN-apply-plan-checks-contradictions-once
type: scenario
---
A batch that moves both conflicting facts from 5 to 6 commits, while the batch with only the first move is refused with the fact contradiction.