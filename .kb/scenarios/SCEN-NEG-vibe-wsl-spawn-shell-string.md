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
Given a Windows host with a qualifying WSL distribution and a workspace path containing shell metacharacters, when the launcher were to make any wsl.exe call (the spawn, the wslpath conversion or the distribution probe) with the path interpolated into a shell string, then the plan is rejected: every wsl.exe call uses --exec with literal argv, buildWslArgs only ever emits literal argv with --cd and --exec, the drive-letter conversion runs as wsl.exe --exec wslpath -a with the path as one argv entry, and a path wslpath cannot convert is a hard error, never a shell string. packages/vibe/tests/runtime.test.mjs covers the literal-argv plan ('toWslPath hands a hostile drive path to wslpath as one literal argv entry') and the hard failure.