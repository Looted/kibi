---
id: FACT-OBS-cursor-stop-plan-vs-job
title: Cursor stop hook treats plan delivery separately from job completion
status: active
created_at: 2026-08-18T00:00:00.000Z
updated_at: 2026-08-18T00:00:00.000Z
source: documentation/facts/FACT-OBS-cursor-stop-plan-vs-job.md
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

Cursor does not expose a plan-versus-agent field on `stop`. The Kibi plugin infers plan delivery from observed tools in the agent loop, especially `CreatePlan`, and keeps that state separate from whether the turn edited source or mutated the knowledge base.
