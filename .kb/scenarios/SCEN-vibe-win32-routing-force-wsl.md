---
title: SCEN-vibe-win32-routing-force-wsl
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-21T18:28:16.443Z'
id: SCEN-vibe-win32-routing-force-wsl
type: scenario
---
Given KIBI_FORCE_WSL=1 and a drive-letter workspace, when the launcher plans the runtime, then the WSL wrap is forced: the path is converted with wsl.exe wslpath against the default distro and the spawn goes through WSL. Covered by packages/vibe/tests/runtime.test.mjs.