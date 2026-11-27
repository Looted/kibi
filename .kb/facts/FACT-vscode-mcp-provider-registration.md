---
title: VS Code registers Kibi MCP via mcpServerDefinitionProviders
status: active
fact_kind: property_value
subject_key: vscode.mcp_provider
property_key: registration_api
operator: eq
value_type: string
value_string: mcpServerDefinitionProviders
text_ref: REQ-vscode-mcp-server-provider
claim_key: CLAIM-4440BD6F9437F6AE
claim_text: The VS Code extension must register the Kibi MCP server through vscode.lm.registerMcpServerDefinitionProvider
origin:
  kind: agent
  ref: 'VS Code extension API docs for contributes.mcpServerDefinitionProviders and PR #879 review'
  recorded_at: '2026-11-25T18:05:41.532Z'
id: FACT-vscode-mcp-provider-registration
type: fact
---
VS Code extension contributes mcpServerDefinitionProviders and registers the Kibi provider via vscode.lm.registerMcpServerDefinitionProvider.
