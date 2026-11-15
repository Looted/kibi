---
title: An MCP host loads kb_upsert with its proof fields as stubs and still gets the full contract enforced
status: active
priority: must
tags:
  - mcp
  - mutation
origin:
  kind: agent
  recorded_at: '2026-11-15T18:30:58.937Z'
id: SCEN-mcp-upsert-proof-fields-stubbed
type: scenario
expects: success
---
Given a running Kibi MCP server, when a host lists its tools, then kb_upsert advertises proof_contract, proof_bindings and proof_receipts each as a stub with only a type and a one-line summary, and the whole tool stays under its size budget. When the host then sends a kb_upsert whose proof_contract breaks the full contract, the call is refused on MCP and on the CLI JSON route, and the error names proof_contract's full schema.