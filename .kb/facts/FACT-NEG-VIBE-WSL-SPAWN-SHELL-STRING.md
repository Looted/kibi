---
title: The launcher may interpolate the workspace path into a wsl.exe shell string on Windows
status: active
fact_kind: property_value
subject_key: kibi.vibe.wsl_spawn
property_key: on-windows-with-a-qualifying-wsl
operator: eq
value_type: bool
value_bool: false
origin:
  kind: agent
  recorded_at: '2026-11-19T22:37:13.759Z'
id: FACT-NEG-VIBE-WSL-SPAWN-SHELL-STRING
type: fact
---
Opposing assumption for the negative scenario of REQ-vibe-wsl-safe-spawn: assumes kibi.vibe.wsl_spawn.on-windows-with-a-qualifying-wsl is false, which REQ-vibe-wsl-safe-spawn forbids.