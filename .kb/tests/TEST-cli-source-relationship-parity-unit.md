---
title: CLI source relationship parity unit contract
status: active
tags:
  - cli
  - relationships
  - parity
  - unit
verification_scope: unit
verification_perspective: internal
id: TEST-cli-source-relationship-parity-unit
type: test
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Directly exercises compiled relationship row parsing, the structural parity record contract, authored-to-compiled loss detection, and runtime-only reverse-ownership handling.