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
Given no KIBI_WORKSPACE/KIBI_PROJECT_ROOT/KIBI_ROOT, no .kb/manifest.json in any .git-bounded ancestor and no kibi-workspace.txt pointer, when resolution would fall back to the bare cwd, then that cwd is rejected as a workspace: isKibiWorkspace requires .kb/manifest.json and the launcher follows the zero-tool contract instead. packages/vibe/tests/runtime.test.mjs covers the .git-bounded walk and the pointer fallback.