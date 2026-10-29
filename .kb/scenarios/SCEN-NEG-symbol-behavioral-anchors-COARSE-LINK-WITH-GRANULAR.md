---
title: A staged coarse symbol link over a file with granular behavioural symbols is rejected
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:09:31.130Z'
id: SCEN-NEG-symbol-behavioral-anchors-COARSE-LINK-WITH-GRANULAR
type: scenario
---
Given a file owned by a coarse file-level symbol that also declares narrower behavioural symbols, when a behaviour edit and its requirement evidence are staged and kibi check --staged runs, then the check exits 1 with a symbol_granularity_violation naming the coarse symbol and the narrower declaration.

This is the failure side of behavioural anchors: a coarse link must not stand in for symbols that can anchor the behaviour more precisely. packages/cli/tests/commands/check-staged-enforcement.test.ts "fails staged code when a coarse symbol owns a file that has granular symbols" exercises it.
