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
Given a post_tool payload whose cwd is a subdirectory of the workspace and a tool path relative to that cwd, when the file-context hook runs from the plugin directory, then it queries the KB with the workspace root and the workspace-relative path, and an edit that names its files another way still gets the firm-requirement notice. Given a hook run in a folder without .kb, or a kibi call that fails, when the hook runs, then it exits 0 with empty stdout, no stack trace, and nothing on stderr unless KIBI_VIBE_LAUNCHER_DEBUG=1 is set.
