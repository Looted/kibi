---
title: kibi.vibe.mcp_launcher subject
status: active
fact_kind: subject
subject_key: kibi.vibe.mcp_launcher
origin:
  kind: agent
  recorded_at: '2026-11-19T20:09:20.775Z'
id: FACT-SUBJ-VIBE-MCP-LAUNCHER-CONTRACT
type: fact
---
The kibi-vibe MCP launcher contract covers how packages/vibe starts the Kibi MCP server for the host: inside a workspace that owns a .kb manifest it spawns the real server so every kb_* tool answers, and outside one it serves a silent zero-tool MCP server and exits cleanly. It is not about WSL argv construction, workspace detection order, hook behavior, or the skill mirror; those have their own subjects.