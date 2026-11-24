---
title: The lifecycle hooks do nothing inside a Kibi workspace is rejected
status: active
expects: rejection
tags:
  - negative-path
  - antigravity
origin:
  kind: agent
  recorded_at: '2026-11-24T05:07:07.393Z'
id: SCEN-NEG-antigravity-hook-lifecycle-off
type: scenario
---
Given a Kibi workspace, when Antigravity fires its lifecycle hooks, then they inject Kibi session context, track edits and surface rule notes; a hook that stays silent there is rejected. packages/antigravity/tests/hook-runner.test.ts covers the session context, edit tracking and stop reminders.