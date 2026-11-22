---
title: SCEN-vibe-win32-routing-unc-named-distro
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-21T18:28:15.338Z'
id: SCEN-vibe-win32-routing-unc-named-distro
type: scenario
---
Given a Windows host and a workspace on a wsl.localhost UNC path naming a distro, when the launcher plans the runtime, then the plan wraps through that distro: wsl.exe -d <distro> --cd <wsl-path> --exec <wsl-node> with literal argv. Covered by packages/vibe/tests/runtime.test.mjs.