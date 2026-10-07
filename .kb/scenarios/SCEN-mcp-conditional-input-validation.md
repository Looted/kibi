---
title: A review note quoting its claim is accepted over MCP
status: active
priority: must
tags:
  - mcp
  - validation
  - facts
expects: success
origin:
  kind: agent
  recorded_at: '2026-10-07T12:27:19.212Z'
id: SCEN-mcp-conditional-input-validation
type: scenario
---
Given the MCP server's kb_upsert input schema, when an agent writes an observation or meta fact with claim_text and no claim_key, then validation passes; when it writes a subject, property_value or predicate fact with claim_text and no claim_key, then validation fails naming claim_key, as the CLI does.

This came from an evaluation where 73 ontology-gap notes were rejected over MCP only. Assumes the claim provenance rule in the operation schema is unchanged.