---
fact_kind: property_value
subject_key: kibi.vibe.wsl_spawn
property_key: wsl_exe_calls_without_exec
operator: eq
value_type: int
status: active
title: One wsl.exe call made by the launcher runs a path through a shell string
value_int: 1
origin:
  kind: agent
  recorded_at: '2026-11-24T15:38:19.778Z'
id: FACT-NEG-VIBE-WSL-EXEC-CALLS-ONE
type: fact
---
Opposing assumption for the negative scenario of REQ-vibe-wsl-safe-spawn: assumes kibi.vibe.wsl_spawn.wsl_exe_calls_without_exec is 1, which REQ-vibe-wsl-safe-spawn forbids.