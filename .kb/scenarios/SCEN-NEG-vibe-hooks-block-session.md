---
title: A hook failure never blocks or crashes the session
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-19T22:37:24.431Z'
id: SCEN-NEG-vibe-hooks-block-session
type: scenario
---
Given a hook event in a directory without a Kibi workspace, or a kibi CLI call that fails, when the hook were to propagate the failure with a stack trace or a non-zero exit, then that is rejected: every hook under packages/vibe/bin/hooks exits 0 with empty stdout and at most a clipped additionalContext payload. packages/vibe/tests/launcher-contract.test.mjs covers post_tool failing open outside a workspace.