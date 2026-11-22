---
title: SCEN-NEG-vibe-win32-forced-wsl-silent-fallback
status: active
expects: error
origin:
  kind: agent
  recorded_at: '2026-11-21T18:28:18.675Z'
id: SCEN-NEG-vibe-win32-forced-wsl-silent-fallback
type: scenario
---
Given KIBI_FORCE_WSL=1 and a drive-letter path that wsl.exe wslpath cannot convert, when the launcher plans the runtime, then planning fails loudly with a hard error naming the path; it must never silently fall back to another directory. Covered by packages/vibe/tests/runtime.test.mjs.