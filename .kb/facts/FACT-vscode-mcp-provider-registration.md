---
title: VS Code registers Kibi MCP via mcpServerDefinitionProviders
status: active
fact_kind: property_value
subject_key: vscode.mcp_provider
property_key: registration_api
operator: eq
value_type: string
value_string: mcpServerDefinitionProviders
text_ref: REQ-vs-code-extension-register-kibi-mcp
claim_key: CLAIM-A0E0F8C2FBBF7BF8
claim_text: The VS Code extension must register the Kibi MCP server through vscode.lm.registerMcpServerDefinitionProvider for opted-in workspaces owning .kb/manifest.json, resolving kibi.mcp.serverPath, project-local kibi-mcp, or PATH, and skip registration cleanly when the host API is unavailable
origin:
  kind: human
  ref: VS Code has no static contributes.mcp.servers key; mcpServerDefinitionProviders plus vscode.lm.registerMcpServerDefinitionProvider is the only supported route.
  recorded_at: '2026-11-25T14:58:54.450Z'
id: FACT-vscode-mcp-provider-registration
type: fact
---
VS Code extension registers Kibi MCP server definitions through contributes.mcpServerDefinitionProviders and vscode.lm.registerMcpServerDefinitionProvider.
