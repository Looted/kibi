---
title: 'Shell edits slip past: a hook misses an in-place edit through the shell tool'
status: active
tags:
  - negative-path
expects: rejection
origin:
  kind: agent
  recorded_at: '2026-11-17T19:03:53.005Z'
id: SCEN-NEG-agent-hosts-shell-edits-count-VIOLATED
type: scenario
---
A shell command edits a file in place and the hook does not count it as an edit, so the rule note and firm-edit stop never apply.

This is the failure side the host hooks must not produce; packages/agent-core/tests/bash-command.test.ts checks it.