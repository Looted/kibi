---
title: kibi init refuses a --level that names no level
status: active
expects: rejection
text_ref: packages/cli/src/commands/init-level.ts
tags:
  - negative-path
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T09:49:39.105Z'
id: SCEN-NEG-kibi-init-level-choice-rejected
type: scenario
---
Given kibi init --level prove, then init refuses it with exit code 1, naming remember and test, and writes nothing.
