---
title: VS Code MCP provider skips registration when vscode.lm API is unavailable
status: active
fact_kind: property_value
subject_key: vscode.mcp_provider
property_key: missing_api_behavior
operator: eq
value_type: string
value_string: skip_without_error
text_ref: REQ-vscode-mcp-server-provider
claim_key: CLAIM-2CA8EC843EE150AB
claim_text: The VS Code extension must skip MCP provider registration when vscode.lm.registerMcpServerDefinitionProvider is unavailable
origin:
  kind: agent
  ref: 'VS Code extension host compatibility (hosts below VS Code 1.101 and Cursor) and PR #879 review'
  recorded_at: '2026-11-25T18:05:49.664Z'
id: FACT-vscode-mcp-provider-host-fallback
type: fact
---
On VS Code hosts without vscode.lm.registerMcpServerDefinitionProvider, registerMcpServerProvider logs a notice and returns undefined without throwing.
