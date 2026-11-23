---
title: kibi.vibe.workspace_resolution subject
status: active
fact_kind: subject
subject_key: kibi.vibe.workspace_resolution
origin:
  kind: agent
  recorded_at: '2026-11-19T20:09:30.256Z'
id: FACT-SUBJ-VIBE-WORKSPACE-RESOLUTION
type: fact
---
Workspace resolution is the deterministic order resolveWorkspace applies when Vibe spawns the server from an arbitrary cwd: trimmed KIBI_WORKSPACE, KIBI_PROJECT_ROOT or KIBI_ROOT environment values first, then a .git-bounded upward walk for a directory owning .kb/manifest.json, then the kibi-workspace.txt pointer beside the launcher, then the cwd itself. It is not about converting paths for WSL or the MCP tool contract.