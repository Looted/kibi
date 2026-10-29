---
title: MCP input validation refuses a fact with claim_key and no claim_text, as the CLI does
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:21:37.328Z'
id: SCEN-NEG-mcp-conditional-input-validation-CLAIM-KEY-WITHOUT-TEXT
type: scenario
---
Given the kb_upsert input schema converted for the MCP server, when an observation or subject fact carries a claim_key without claim_text, then validation fails for both kinds, while the same observation with claim_text is accepted, and the condition evaluator decides not, enum, const and type parts as the CLI validator does.

This is the failure side of conditional input validation: MCP must refuse what the CLI refuses instead of accepting a half-written claim provenance. packages/mcp/tests/server/kb-upsert-claim-conditional.test.ts "still requires claim_text when claim_key is present, whatever the kind" exercises it.
