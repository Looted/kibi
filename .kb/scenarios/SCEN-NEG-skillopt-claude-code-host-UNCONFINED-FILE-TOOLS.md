---
title: A Claude Code target cell is launched with file tools denied outside its workspace
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:00:43.416Z'
id: SCEN-NEG-skillopt-claude-code-host-UNCONFINED-FILE-TOOLS
type: scenario
---
Given a SkillOpt cell run on the Claude Code host, when the harness launches the target, then its settings allow Read and Edit only under the workspace, allow no unscoped file rule, and deny the private KB, the shell, the repository root, the artifact root and the operator's real config directory.

This is the failure side of workspace confinement: the launch settings handed to the target refuse file access outside the cell's workspace. documentation/tests/e2e/skillopt-claude-code-host.e2e.ts, in its first part that checks the target's launch flags and permission rules, exercises it.
