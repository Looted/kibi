---
title: An async kb_apply_plan call with a mismatched approved hash fails the call and starts no job
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:20:16.653Z'
id: SCEN-NEG-mcp-apply-plan-async-preflight-HASH-MISMATCH
type: scenario
---
Given a bootstrap plan and an asynchronous kb_apply_plan call whose approvedPlanHash is well formed but differs from the plan hash, when the MCP handler receives it, then the call itself fails with approvedPlanHash does not match planHash and no detached job runs the apply.

This is the failure side of the async preflight: an input error must fail the call instead of surfacing only when the job is polled. packages/mcp/tests/server/kb-apply-plan-async-preflight.test.ts "async:true with an approvedPlanHash that differs from planHash fails the call itself and starts no job" exercises it.
