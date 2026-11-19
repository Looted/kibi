---
title: kibi.vibe.wsl_spawn subject
status: active
fact_kind: subject
subject_key: kibi.vibe.wsl_spawn
origin:
  kind: agent
  recorded_at: '2026-11-19T20:09:25.717Z'
id: FACT-SUBJ-VIBE-WSL-SAFE-SPAWN
type: fact
---
WSL spawn safety is the rule that on Windows the launcher may start Kibi only through wsl.exe with --cd and --exec and a literal argument vector, never through a shell string, that the distribution named by a wsl.localhost UNC path is passed with -d, and that an unconvertible Windows path aborts the launch loudly. It is not about which workspace is chosen or how the hooks behave.