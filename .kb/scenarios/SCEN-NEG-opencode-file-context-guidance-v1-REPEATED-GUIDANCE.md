---
title: A second edit of the same path does not repeat its file-context guidance
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T22:20:14.400Z'
id: SCEN-NEG-opencode-file-context-guidance-v1-REPEATED-GUIDANCE
type: scenario
---
Given an OpenCode session that already showed the edited-source guidance for src/billing.ts, when the same path is edited again, then the plugin does not inject that guidance again, while an edit of another path still gets it.

This is the failure side of per-path suppression: repeated guidance for one path would bury the rest of the prompt. documentation/tests/e2e/packed/opencode-comment-guidance.test.ts "shows file-context guidance once per path in a session" exercises it.
