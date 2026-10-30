---
title: A kb_apply_plan call that matches no guard branch fails MCP input validation
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T20:53:52.776Z'
id: SCEN-NEG-mcp-oneof-guard-input-validation-NO-BRANCH
type: scenario
---
Given the MCP server, when an agent calls kb_apply_plan with a plan but no approvedPlanHash, an argument set that matches no branch of the guard oneOf, then the call fails input validation and the error names the accepted argument sets.

This is the failure side of oneOf guard enforcement: an argument set outside every guard branch must not slip past MCP validation into a background job. packages/mcp/tests/server/oneof-guard-input-validation.test.ts "kb_apply_plan rejects a plan without approvedPlanHash at input validation" exercises it.
