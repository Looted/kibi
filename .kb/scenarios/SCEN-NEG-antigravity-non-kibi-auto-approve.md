---
title: Kibi auto-approves edits or commands outside a Kibi workspace is rejected
status: active
expects: rejection
tags:
  - negative-path
  - antigravity
origin:
  kind: agent
  recorded_at: '2026-11-24T05:07:04.203Z'
id: SCEN-NEG-antigravity-non-kibi-auto-approve
type: scenario
---
Given a workspace without .kb/manifest.json, when Antigravity sends PreToolUse for an edit or a shell command, then the hook never answers allow: it passes through with ask so Antigravity's own permission prompt decides. packages/antigravity/tests/hook-runner-branches.test.ts covers the pass-through decisions inside and outside Kibi workspaces.