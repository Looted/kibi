---
title: An asynchronous apply with a bad approved hash fails the call, not the job
status: active
priority: must
tags:
  - mcp
  - bootstrap
  - apply
origin:
  kind: agent
  recorded_at: '2026-10-07T19:01:25.536Z'
id: SCEN-mcp-apply-plan-async-preflight
type: scenario
---
Given the MCP server with `kb_job_status` enabled, when an agent calls `kb_apply_plan` with `async: true` and a plan whose `approvedPlanHash` is missing, malformed, or different from the plan's `planHash`, the call fails with that error and no background job runs the apply.

An onboarding evaluation saw this error only after polling the job.
