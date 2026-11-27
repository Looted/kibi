---
title: Assumed non-provider VS Code MCP registration
status: active
fact_kind: property_value
subject_key: vscode.mcp_provider
property_key: registration_api
operator: neq
value_type: string
value_string: mcpServerDefinitionProviders
origin:
  kind: human
  ref: VS Code rejects static contributes.mcp.servers and skips registration when vscode.lm.registerMcpServerDefinitionProvider is unavailable.
  recorded_at: '2026-11-25T15:00:20.972Z'
id: FACT-assume-vscode-mcp-non-provider
type: fact
---
Assumed input where VS Code MCP registration is not performed through mcpServerDefinitionProviders (e.g. static contributes.mcp.servers or missing host API / non-Kibi workspace).
