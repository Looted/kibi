---
id: FACT-OBS-cursor-stop-createplan-silent
title: CreatePlan-only turns stay silent at stop
status: active
created_at: 2026-08-18T00:00:00.000Z
updated_at: 2026-08-18T00:00:00.000Z
source: documentation/facts/FACT-OBS-cursor-stop-createplan-silent.md
tags:
  - cursor
  - plugin
  - hooks
  - observation
fact_kind: observation
links:
  - type: relates_to
    target: REQ-cursor-stop-job-vs-plan
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

After a turn that observed `CreatePlan` and did not edit source files or mutate the knowledge base, the Cursor Kibi `stop` hook emits no `followup_message`.
