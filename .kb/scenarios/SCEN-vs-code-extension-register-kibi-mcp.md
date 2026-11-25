---
title: VS Code registers Kibi MCP server via mcpServerDefinitionProviders
status: active
tags:
  - vscode
  - mcp
origin:
  kind: agent
  recorded_at: '2026-11-25T14:53:15.309Z'
id: SCEN-vs-code-extension-register-kibi-mcp
type: scenario
expects: success
---
Given a VS Code workspace containing .kb/manifest.json, when the Kibi extension activates on a host providing vscode.lm.registerMcpServerDefinitionProvider, it registers kibi.mcpProvider, resolves kibi.mcp.serverPath, project-local kibi-mcp, or PATH, and passes KIBI_MCP_ATTACH_ROOT and KIBI_MCP_HOST=vscode.
