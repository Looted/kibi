---
title: A Windows WSL spawn plan that routes the path through a shell string is rejected
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-19T22:37:20.295Z'
id: SCEN-NEG-vibe-wsl-spawn-shell-string
type: scenario
---
Given a Windows host with a qualifying WSL distribution and a workspace path containing shell metacharacters, when the launcher were to wrap the command in wsl.exe bash -lc with the path interpolated into the shell string, then the plan is rejected: buildWslArgs only ever emits literal argv with --cd and --exec, and a path wslpath cannot convert is a hard error, never a shell string. packages/vibe/tests/runtime.test.mjs covers the literal-argv plan and the hard failure.