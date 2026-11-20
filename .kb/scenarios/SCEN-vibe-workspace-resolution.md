---
title: Scenario for REQ-vibe-workspace-resolution
status: active
tags:
  - vibe
origin:
  kind: agent
  recorded_at: '2026-11-19T20:15:54.768Z'
id: SCEN-vibe-workspace-resolution
type: scenario
---
Given KIBI_WORKSPACE set to a padded path, when resolveWorkspace runs, then it returns the trimmed resolved path with source env:KIBI_WORKSPACE. Given a cwd inside a repo whose root owns .kb/manifest.json, when resolveWorkspace runs from a subdirectory, then it returns the repo root. Given an inner repo with .git but no .kb inside an outer repo that has both, when resolveWorkspace runs in the inner repo, then it stops at the inner .git and does not return the outer root. Given a kibi-workspace.txt next to the launcher, when the cwd is not a Kibi workspace, then the pointer target is returned.