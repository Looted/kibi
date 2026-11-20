---
title: Scenario for REQ-vibe-wsl-safe-spawn
status: active
tags:
  - vibe
origin:
  kind: agent
  recorded_at: '2026-11-19T20:15:53.602Z'
id: SCEN-vibe-wsl-safe-spawn
type: scenario
---
Given a Windows host with a qualifying WSL distribution and a \\wsl.localhost\Ubuntu-22.04\... workspace, when the launcher plans and spawns, then the argv is wsl.exe -d Ubuntu-22.04 --cd /home/... --exec <node> <bin> with no shell string. Given a Windows path that wslpath cannot convert, when the launcher plans, then it throws instead of falling back to another directory.