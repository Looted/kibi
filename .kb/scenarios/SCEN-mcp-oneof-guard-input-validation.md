---
title: A plan apply without its approved hash fails MCP input validation
status: active
priority: must
tags:
  - mcp
  - validation
origin:
  kind: agent
  recorded_at: '2026-10-07T19:01:03.611Z'
id: SCEN-mcp-oneof-guard-input-validation
type: scenario
---
Given the MCP server, when an agent calls `kb_apply_plan` with a plan but no `approvedPlanHash`, the call fails input validation and names the accepted argument sets. A plan with its hash, or a `recoveryJournalId` alone, is accepted; a `recoveryJournalId` mixed with a plan is rejected. `kb_delete` likewise needs exactly one of `ids` or `relationships`. The published input schema gains no top-level `oneOf`, which agent hosts reject.

An onboarding evaluation saw a missing hash accepted by MCP and reported only later by the background job.
