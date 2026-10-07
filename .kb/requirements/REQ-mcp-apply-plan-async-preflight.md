---
title: Async kb_apply_plan calls report hash errors as call errors
status: open
priority: must
tags:
  - mcp
  - bootstrap
  - apply
semantic_text: An asynchronous kb_apply_plan call must fail as a call error when the approved hash is missing or malformed. An asynchronous kb_apply_plan call must fail as a call error when the approved hash differs from the plan hash.
semantic_clauses:
  - An asynchronous kb_apply_plan call must fail as a call error when the approved hash is missing or malformed.
  - An asynchronous kb_apply_plan call must fail as a call error when the approved hash differs from the plan hash.
logic_claims:
  - CLAIM-051CCCDDCC8AB3E4
  - CLAIM-62B606DFCF9EC375
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 949d9a0a83a6982712f2bc19717114843d48fb1ead0ad79a12fdbff8d2766cc0
semantic_inventory:
  - claim_key: CLAIM-051CCCDDCC8AB3E4
    claim_text: An asynchronous kb_apply_plan call must fail as a call error when the approved hash is missing or malformed
    role: normative
    status: modeled
    span:
      start: 0
      end: 107
  - claim_key: CLAIM-62B606DFCF9EC375
    claim_text: An asynchronous kb_apply_plan call must fail as a call error when the approved hash differs from the plan hash
    role: normative
    status: modeled
    span:
      start: 109
      end: 219
origin:
  kind: agent
  recorded_at: '2026-10-07T19:01:23.987Z'
id: REQ-mcp-apply-plan-async-preflight
type: req
---
An asynchronous kb_apply_plan call must fail as a call error when the approved hash is missing or malformed. An asynchronous kb_apply_plan call must fail as a call error when the approved hash differs from the plan hash.

## Context

With `async: true`, `kb_apply_plan` returned a job receipt immediately and ran every check inside the job, so an input error such as a missing `approvedPlanHash` ("approvedPlanHash must be SHA-256") surfaced only when the agent polled `kb_job_status`. Input errors should fail the call itself. The MCP server now runs the hash, shape and snapshot checks synchronously and returns the receipt only when they pass; the job repeats them under the workspace lock.

## Source

Onboarding evaluation round 5 analysis (2026-10-07), finding K7: an external agent onboarded a test project with Kibi 2.9.0 and kibi-mcp 3.4.0.
