---
title: MCP input validation enforces oneOf guard branches like the CLI
status: open
priority: must
tags:
  - mcp
  - validation
semantic_text: MCP input validation must reject input that matches no branch of a guard oneOf. MCP input validation must reject input that matches more than one branch of a guard oneOf.
semantic_clauses:
  - MCP input validation must reject input that matches no branch of a guard oneOf.
  - MCP input validation must reject input that matches more than one branch of a guard oneOf.
logic_claims:
  - CLAIM-BCB237ED3160D598
  - CLAIM-B52DED294D277CBF
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 3ef8f919dfd4873ea130ee5a449f7064e1d5aa5d34bf8af7b374b6b0c3380acf
semantic_inventory:
  - claim_key: CLAIM-BCB237ED3160D598
    claim_text: MCP input validation must reject input that matches no branch of a guard oneOf
    role: normative
    status: modeled
    span:
      start: 0
      end: 78
  - claim_key: CLAIM-B52DED294D277CBF
    claim_text: MCP input validation must reject input that matches more than one branch of a guard oneOf
    role: normative
    status: modeled
    span:
      start: 80
      end: 169
origin:
  kind: agent
  recorded_at: '2026-10-07T19:01:01.981Z'
id: REQ-mcp-oneof-guard-input-validation
type: req
---
MCP input validation must reject input that matches no branch of a guard oneOf. MCP input validation must reject input that matches more than one branch of a guard oneOf.

## Context

`kb_apply_plan` states "plan with approvedPlanHash, or recoveryJournalId alone" as a `oneOf` of `required`/`not` branches, and `kb_delete` states "ids or relationships" the same way. The MCP JSON Schema to Zod converter did not enforce `oneOf`, so a call without `approvedPlanHash` passed MCP input validation; with `async: true` it returned a job receipt and the error surfaced only through `kb_job_status`. The CLI validates the same schema with ajv, which enforces `oneOf`. Guard branches carry no property schemas, so enforcing them only tightens validation.

## Source

Onboarding evaluation round 5 analysis (2026-10-07), finding K7: an external agent onboarded a test project with Kibi 2.9.0 and kibi-mcp 3.4.0.
