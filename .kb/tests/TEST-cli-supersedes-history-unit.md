---
title: CLI supersedes source-history unit contract
status: active
tags:
  - cli
  - git
  - supersedes
  - unit
verification_scope: unit
verification_perspective: internal
id: TEST-cli-supersedes-history-unit
type: test
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Executes Git addition-history lookup, supersession history classification, and the new-to-old source-history validation guard with deterministic repositories and ancestry fixtures.