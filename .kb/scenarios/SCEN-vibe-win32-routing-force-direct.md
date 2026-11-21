---
title: SCEN-vibe-win32-routing-force-direct
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-21T18:28:17.522Z'
id: SCEN-vibe-win32-routing-force-direct
type: scenario
---
Given KIBI_FORCE_DIRECT=1 and a wsl.localhost UNC workspace, when the launcher plans the runtime, then the plan is a native direct spawn (Windows reads wsl.localhost paths natively) and no WSL probe runs. Covered by packages/vibe/tests/runtime.test.mjs.