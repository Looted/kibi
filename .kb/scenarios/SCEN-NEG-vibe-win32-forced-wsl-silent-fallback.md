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
Given KIBI_FORCE_WSL=1 and a drive-letter path that wsl.exe --exec wslpath cannot convert, or a WSL workspace whose distribution has no usable Node.js 22+, when the launcher plans the runtime, then planning fails loudly with a hard error naming the path or distribution; it must never silently fall back to another directory or to Windows Node.js (KIBI_FORCE_DIRECT=1 is the explicit opt-in). Covered by packages/vibe/tests/runtime.test.mjs ('planRuntime hard-fails when a forced WSL wrap cannot convert the Windows path', 'planRuntime refuses a WSL workspace whose distro has no usable Node.js instead of running Windows Node.js').