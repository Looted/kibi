---
title: Parser unit coverage runner maps executed worker code and rejects incomplete runs
status: active
text_ref: scripts/tests/parser-unit-coverage.test.ts
tags:
  - parser
  - coverage
  - unit
  - worker
verification_scope: unit
verification_perspective: internal
id: TEST-parser-unit-coverage-runner
type: test
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-10, approving the entity context recovered from history in the KB gold-standard review (context batch 3): "Agree with batch 3 as well."'
  recorded_at: '2026-10-04T01:17:15.284Z'
---


## Context
Parsing runs in worker threads, which ordinary coverage doesn't see. This runner maps executed worker code and rejects an incomplete run, so a missing worker can't pass as covered. Source: PR 291: "Worker coverage collection rejects incomplete evidence".
