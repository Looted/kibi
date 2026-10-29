---
title: kibi-zcode hooks stay silent in a workspace that owns no knowledge base
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:12:08.705Z'
id: SCEN-NEG-zcode-kibi-plugin-v1-UNOWNED-WORKSPACE-OUTPUT
type: scenario
---
Given a workspace without .kb/manifest.json, when the kibi-zcode hook runner receives SessionStart, PreToolUse, PostToolUse and Stop events, including a write under .kb, then every event returns only continue true with no system message.

This is the failure side of workspace opt-in: an installed adapter must not speak in projects that never adopted Kibi. packages/zcode/tests/hook-runner.test.ts "every hook event stays silent in an unconfigured workspace" exercises it.
