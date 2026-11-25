---
title: VS Code MCP provider gates on .kb/manifest.json
status: active
fact_kind: property_value
subject_key: vscode.mcp_provider
property_key: opt_in_gate
operator: eq
value_type: string
value_string: .kb/manifest.json
text_ref: REQ-vscode-mcp-server-provider
claim_key: CLAIM-398AF2770A5C6C2C
claim_text: The VS Code MCP provider must return server definitions only for workspaces containing .kb/manifest.json
origin:
  kind: agent
  ref: 'Kibi workspace opt-in contract and PR #879 review'
  recorded_at: '2026-11-25T18:05:45.144Z'
id: FACT-vscode-mcp-provider-opt-in
type: fact
---
Outside workspaces owning .kb/manifest.json, provideMcpServerDefinitions returns an empty array.
