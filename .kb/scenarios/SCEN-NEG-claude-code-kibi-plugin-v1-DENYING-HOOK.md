---
title: kibi-claude hooks never deny, rewrite input or touch the workspace
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-05T10:55:00.000Z'
id: SCEN-NEG-claude-code-kibi-plugin-v1-DENYING-HOOK
type: scenario
---
Given a Kibi workspace without firm-edit confirmation, when a session starts and runs PreToolUse hooks for a read, a direct .kb edit, a source edit and a grep, then a post-edit hook and a stop, then no hook output carries a permission decision or rewritten input, and the workspace tree is byte-for-byte unchanged.

This is the failure side of hooks that only advise: a hook that denied or rewrote a call would take a decision away from the agent and the person. packages/claude/tests/hook-runner.test.ts "hooks never deny, rewrite input, or touch the workspace" exercises it, inside the TEST-claude-code-kibi-plugin-v1 suite run.
