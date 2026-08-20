---
id: FACT-OBS-cursor-stop-plan-with-edits
title: Plan delivery with edits still triggers stop follow-up
status: active
created_at: 2026-08-18T00:00:00.000Z
updated_at: 2026-08-18T00:00:00.000Z
source: documentation/facts/FACT-OBS-cursor-stop-plan-with-edits.md
tags:
  - cursor
  - plugin
  - hooks
  - observation
fact_kind: observation
links:
  - type: relates_to
    target: REQ-cursor-stop-job-vs-plan
---

If the same turn both delivered a plan and actually edited source or mutated the knowledge base, the existing freshness or KB-mutation stop follow-up still applies.
