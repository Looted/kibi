---
fact_kind: property_value
subject_key: kibi.vibe.wsl_spawn
property_key: wsl_exe_calls_without_exec
operator: eq
value_type: int
status: active
title: When the launcher runs Kibi inside WSL, every wsl.exe call (including wslpath) must use --exec with literal argv and never a shell string
value_int: 0
claim_text: When the launcher runs Kibi inside WSL, every wsl.exe call (including wslpath) must use --exec with literal argv and never a shell string
claim_key: CLAIM-4CCC0E0B24616A4D
text_ref: REQ-vibe-wsl-safe-spawn
origin:
  kind: agent
  recorded_at: '2026-11-24T15:38:16.674Z'
id: FACT-PROP-VIBE-WSL-EXEC-CALLS-ZERO
type: fact
---
Grounded claim of REQ-vibe-wsl-safe-spawn: When the launcher runs Kibi inside WSL, every wsl.exe call (including wslpath) must use --exec with literal argv and never a shell string. The claim is a count over the wsl.exe calls: zero of them run without --exec and literal argv.