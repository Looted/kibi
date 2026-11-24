---
title: A spawn cwd that is not a Kibi workspace is never claimed as one
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-19T22:37:23.103Z'
id: SCEN-NEG-vibe-workspace-cwd-only
type: scenario
---
Given no KIBI_WORKSPACE/KIBI_PROJECT_ROOT/KIBI_ROOT, no .kb/manifest.json in any .git-bounded ancestor and no kibi-workspace.txt pointer, when resolution falls back to the bare cwd, then resolveWorkspace reports it with source cwd and isKibiWorkspace rejects it (a .kb directory without manifest.json is no opt-in), so the launcher serves the silent zero-tool server and bin/kibi.mjs exits 3. Covered by packages/vibe/tests/runtime.test.mjs ('a spawn cwd without .kb/manifest.json resolves as the cwd but is never accepted as a Kibi workspace', 'isKibiWorkspace requires .kb/manifest.json') and packages/vibe/tests/launcher-contract.test.mjs ('outside Kibi workspaces the launcher serves a silent zero-tool server and exits 0').