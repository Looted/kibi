---
title: Init leaves an existing foreign post-checkout hook unchanged instead of overwriting it with the default hook
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T20:57:41.203Z'
id: SCEN-NEG-git-hook-sync-v2-foreign-post-checkout
type: scenario
---
Given a repository whose post-checkout hook is an existing script that Kibi did not write, when `kibi init` installs its default hooks, then it refuses to replace that script and the foreign hook stays byte for byte as it was.

This is the failure side of default hook installation: installing by default must never clobber a hook the project already relies on. documentation/tests/e2e/packed/hook-integration.test.ts "should not break existing hooks" exercises it against the packed CLI.
