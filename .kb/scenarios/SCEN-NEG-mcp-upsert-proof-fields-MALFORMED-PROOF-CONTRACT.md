---
title: kb_upsert refuses a proof_contract the advertised stub does not describe
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-15T18:31:00.044Z'
id: SCEN-NEG-mcp-upsert-proof-fields-MALFORMED-PROOF-CONTRACT
type: scenario
---
Given the kb_upsert tool as an MCP host sees it, with proof_contract advertised as a stub, when the host sends a proof_contract without its required fields, then MCP refuses the call as the CLI JSON route does, and neither writes anything.

This is the failure side of the compact schema: hiding the field's schema from the advertisement must not loosen what kb_upsert accepts. packages/mcp/tests/server/tool-surface-consumer.test.ts exercises it.