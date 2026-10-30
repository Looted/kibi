---
title: Arguments that match two branches of a guard oneOf are rejected at MCP input validation
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:57:56.775Z'
id: SCEN-CASE-mcp-oneof-guard-input-validation-TWO-BRANCHES-MATCH
type: scenario
---
Given the MCP server, when an agent calls kb_apply_plan with a plan, its approvedPlanHash and a recoveryJournalId, an argument set that matches two branches of the guard oneOf, then the call fails input validation with the must match exactly one of message.

This covers the value past the bound, `gt 1` on `accepted_input_guard_branch_matches`. packages/mcp/tests/server/oneof-guard-input-validation.test.ts "kb_apply_plan rejects recoveryJournalId mixed with a plan" exercises it through the zod schema MCP builds from the published input schema.
