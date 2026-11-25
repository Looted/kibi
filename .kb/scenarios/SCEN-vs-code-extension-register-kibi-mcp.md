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
---
Given a VS Code workspace containing .kb/manifest.json, when the Kibi extension activates on a VS Code host with vscode.lm.registerMcpServerDefinitionProvider, it registers the kibi.mcpProvider definition provider and resolves kibi.mcp.serverPath, project-local kibi-mcp, or PATH without requiring bun; outside Kibi workspaces it returns no server definitions, and on older VS Code hosts it skips registration cleanly.
