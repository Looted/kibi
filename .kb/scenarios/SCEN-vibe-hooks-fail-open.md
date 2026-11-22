---
title: Scenario for REQ-vibe-hooks-fail-open
status: active
tags:
  - vibe
origin:
  kind: agent
  recorded_at: '2026-11-19T20:15:55.865Z'
id: SCEN-vibe-hooks-fail-open
type: scenario
---
Given a post_tool payload with cwd set to a repo subdirectory and a file path inside the repo, when the file-context hook runs, then the query uses the repo root and the repo-relative path. Given a hook run in a directory without .kb, when the hook runs, then it exits 0 with empty stdout and no stack trace on stderr.