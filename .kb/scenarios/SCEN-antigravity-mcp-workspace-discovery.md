---
origin:
  kind: agent
  recorded_at: '2026-11-22T05:03:15.358Z'
status: active
tags:
  - scenario
  - antigravity
  - mcp
title: Antigravity MCP launcher discovers Kibi workspaces via roots/list and stays silent outside Kibi repos
id: SCEN-antigravity-mcp-workspace-discovery
type: scenario
expects: success
---
# Antigravity MCP launcher workspace discovery and non-Kibi silence

- **Given** `packages/antigravity/bin/mcp-launcher.cjs` starts inside a repository owning `.kb/manifest.json`
- **When** project-local `kibi-mcp` is available
- **Then** the launcher proxies stdio directly to `kibi-mcp`

- **Given** the launcher starts from a global plugin directory outside any Kibi repository
- **When** the host advertises MCP `roots` capability and returns a root owning `.kb/manifest.json`
- **Then** the launcher spawns that repository's `kibi-mcp`, replays the initialize handshake, and proxies queued requests

- **Given** the opened roots do not own `.kb/manifest.json`
- **When** the client requests `tools/list`
- **Then** the launcher responds silently with an empty tool list
