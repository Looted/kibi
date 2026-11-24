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
Given a hook event in a directory without a Kibi workspace, or a kibi CLI call that fails, when the hook were to propagate the failure with a stack trace, a non-zero exit or the failing CLI's stderr, then that is rejected: every hook under packages/vibe/bin/hooks exits 0 with empty stdout and prints nothing to stderr unless KIBI_VIBE_LAUNCHER_DEBUG=1 is set. packages/vibe/tests/hooks.test.mjs ('hooks print nothing to stderr when kibi fails, unless debugging is on') and packages/vibe/tests/launcher-contract.test.mjs ('post_tool hook fails open outside Kibi workspaces') cover it.