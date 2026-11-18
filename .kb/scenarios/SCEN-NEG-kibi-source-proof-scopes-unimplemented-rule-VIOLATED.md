---
title: 'The proof ladder breaks: a source-proved rule still asks for an implementing symbol'
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-18T10:54:35.940Z'
id: SCEN-NEG-kibi-source-proof-scopes-unimplemented-rule-VIOLATED
type: scenario
---
A requirement whose every claim a passing source proof proves, and that no symbol implements, reports missing_production_symbol.

This is the failure side the proof ladder must not produce; documentation/tests/e2e/packed/source-proof-kinds.test.ts and packages/core/tests/requirement_proof.plt check it.