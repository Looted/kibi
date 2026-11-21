---
title: SCEN-vibe-win32-routing-drive-letter-native
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-21T18:28:13.969Z'
id: SCEN-vibe-win32-routing-drive-letter-native
type: scenario
---
Given a Windows host and a drive-letter workspace (C:\Projekty\kibi), when the launcher plans the runtime, then Kibi runs natively: the plan is mode direct with the raw Windows path, no WSL probe runs, and SWI-Prolog comes from the bundled kibi-swipl-win32-x64 runtime. Covered by packages/vibe/tests/runtime.test.mjs.