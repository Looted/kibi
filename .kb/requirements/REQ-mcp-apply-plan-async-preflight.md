---
title: Asynchronous plan applies reject input errors before the job receipt
status: open
priority: must
tags:
  - mcp
  - bootstrap
  - apply
semantic_text: An asynchronous plan apply must reject a missing or malformed approved plan hash before it returns a job receipt. An asynchronous plan apply must reject an approved plan hash that differs from the plan before it returns a job receipt.
semantic_clauses:
  - An asynchronous plan apply must reject a missing or malformed approved plan hash before it returns a job receipt.
  - An asynchronous plan apply must reject an approved plan hash that differs from the plan before it returns a job receipt.
logic_claims:
  - CLAIM-608397CB34D0BA5C
  - CLAIM-1C7040E31515284C
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 8f80deaf409a3b384b85515e4f40d6757e636afdf7eac192731ef9cdc4a4b839
semantic_inventory:
  - claim_key: CLAIM-608397CB34D0BA5C
    claim_text: An asynchronous plan apply must reject a missing or malformed approved plan hash before it returns a job receipt
    role: normative
    status: modeled
    span:
      start: 0
      end: 112
  - claim_key: CLAIM-1C7040E31515284C
    claim_text: An asynchronous plan apply must reject an approved plan hash that differs from the plan before it returns a job receipt
    role: normative
    status: modeled
    span:
      start: 114
      end: 233
origin:
  kind: agent
  recorded_at: '2026-10-07T19:01:23.987Z'
id: REQ-mcp-apply-plan-async-preflight
type: req
---
An asynchronous plan apply must reject a missing or malformed approved plan hash before it returns a job receipt. An asynchronous plan apply must reject an approved plan hash that differs from the plan before it returns a job receipt.

## Context

With `async: true`, `kb_apply_plan` returned a job receipt immediately and ran every check inside the job, so an input error such as a missing `approvedPlanHash` ("approvedPlanHash must be SHA-256") surfaced only when the agent polled `kb_job_status`. Input errors should fail the call itself. The pre-apply checks (approved hash, plan shape and canonical hash, and for a bootstrap plan its branch, KB, workspace and source snapshots) now run before the receipt; the job repeats them under the workspace lock.

## Source

Onboarding evaluation round 5 analysis (2026-10-07), finding K7: an external agent onboarded a test project with Kibi 2.9.0 and kibi-mcp 3.4.0.
